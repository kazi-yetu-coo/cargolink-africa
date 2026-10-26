import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const ids = {
  owner: "00000000-0000-4000-a000-000000000001",
  provider: "00000000-0000-4000-a000-000000000002",
  outsider: "00000000-0000-4000-a000-000000000003",
  admin: "00000000-0000-4000-a000-000000000004",
  trucker: "00000000-0000-4000-a000-000000000005",
};
let rfq = "",
  bid = "",
  providerCompany = "",
  ownerCompany = "";
async function as(id: string) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
}
async function value(sql: string, params: unknown[] = []) {
  const r = await db.query<Record<string, unknown>>(sql, params);
  return Object.values(r.rows[0] || {})[0];
}
beforeAll(async () => {
  await db.exec(readFileSync("tests/baseline.sql", "utf8"));
  await db.exec(
    readFileSync(
      "supabase/migrations/20261026135933_marketplace_workflows.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261026140803_transport_specific_inquiries.sql",
      "utf8",
    ),
  );
  for (const migration of [
    "20261026160747_admin_review_workspace_schema.sql",
    "20261026160813_admin_review_workspace_access.sql",
    "20261026160837_admin_review_workspace_workflows.sql",
  ]) {
    await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  }
  await db.query("insert into auth.users(id) select unnest($1::uuid[])", [
    Object.values(ids),
  ]);
  await as(ids.owner);
  ownerCompany = (await value(
    "select public.register_company('Owner Ltd','shipper')",
  )) as string;
  await as(ids.provider);
  providerCompany = (await value(
    "select public.register_company('Forwarder Ltd','agent')",
  )) as string;
  await as(ids.trucker);
  await value("select public.register_company('Trucker Ltd','trucker')");
  await db.exec("reset role");
  await db.query(
    "update public.companies set verification_status='verified' where owner_id in ($1,$2)",
    [ids.provider, ids.trucker],
  );
  await db.query("insert into public.platform_admins(user_id) values($1)", [
    ids.admin,
  ]);
}, 30000);
afterAll(async () => await db.close());
describe("Marketplace database workflows and authorization", () => {
  it("keeps onboarding idempotent and prevents self-created memberships", async () => {
    await as(ids.owner);
    expect(
      await value("select public.register_company('Another','agent')"),
    ).toBe(ownerCompany);
    await expect(
      db.query(
        "insert into public.company_members(company_id,user_id) values($1,$2)",
        [providerCompany, ids.owner],
      ),
    ).rejects.toThrow();
  });
  it("saves incomplete drafts, rejects invalid submit, and publishes validated RFQs", async () => {
    await as(ids.owner);
    rfq = (await value(
      "select public.save_rfq(null,'Ocean Freight','{}','',false)",
    )) as string;
    await expect(
      db.query("select public.save_rfq($1,'Ocean Freight','{}','',true)", [
        rfq,
      ]),
    ).rejects.toThrow();
    const details = {
      origin: {
        name: "Shanghai",
        country: "China",
        type: "Port",
        code: "CNSHA",
      },
      destination: {
        name: "Dar es Salaam",
        country: "Tanzania",
        type: "Port",
        code: "TZDAR",
      },
      cargo: "Consumer goods",
      weight: 20000,
      date: "2099-01-01",
      scope: "Port to port",
      containers: "40ft container",
      quantity: 1,
    };
    await db.query(
      "select public.save_rfq($1,'Ocean Freight',$2::jsonb,'',true)",
      [rfq, JSON.stringify(details)],
    );
    expect(
      await value("select status from public.rfqs where id=$1", [rfq]),
    ).toBe("open");
  });
  it("denies RFQ editing and admin actions to unrelated users", async () => {
    await as(ids.outsider);
    await expect(
      db.query(
        "select public.save_rfq($1,'Ocean Freight','{}','hijack',false)",
        [rfq],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.moderate_company($1,true)", [providerCompany]),
    ).rejects.toThrow();
  });
  it("prevents trucking providers from bidding on ocean freight", async () => {
    await as(ids.trucker);
    const company = await value(
      "select id from public.companies where owner_id=auth.uid()",
    );
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days) values($1,auth.uid(),$2,'USD',2000,20)",
        [rfq, company],
      ),
    ).rejects.toThrow();
  });
  it("allows a verified forwarder to bid on a shipper-owned inquiry", async () => {
    await as(ids.provider);
    bid = (await value(
      "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days,freight_charges,customs_fees,inland_charges,other_charges,scope,valid_until,terms) values($1,auth.uid(),$2,'USD',3450,20,2500,350,500,100,'Door to door','2099-01-30','50% deposit') returning id",
      [rfq, providerCompany],
    )) as string;
    expect(bid).toBeTruthy();
  });
  it("enforces quotation totals and prevents forged awarded bids", async () => {
    await as(ids.provider);
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days,freight_charges,customs_fees,inland_charges,other_charges) values($1,auth.uid(),$2,'USD',100,20,50,0,0,0)",
        [rfq, providerCompany],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days,status) values($1,auth.uid(),$2,'USD',100,20,'awarded')",
        [rfq, providerCompany],
      ),
    ).rejects.toThrow();
  });
  it("restricts quotations and conversations to their participants", async () => {
    await as(ids.outsider);
    expect(await value("select count(*) from public.bids")).toBe(0);
    await expect(
      db.query(
        "insert into public.messages(rfq_id,sender_id,recipient_id,body) values($1,auth.uid(),$2,'forged message')",
        [rfq, ids.owner],
      ),
    ).rejects.toThrow();
    await as(ids.provider);
    await db.query(
      "insert into public.messages(rfq_id,sender_id,recipient_id,body) values($1,auth.uid(),$2,'Can you confirm pickup?')",
      [rfq, ids.owner],
    );
    await as(ids.owner);
    expect(await value("select count(*) from public.messages")).toBe(1);
    expect(
      Number(await value("select count(*) from public.notifications")),
    ).toBeGreaterThan(0);
    await as(ids.outsider);
    expect(await value("select count(*) from public.messages")).toBe(0);
  });
  it("allows only the cargo owner to award a verified provider quote", async () => {
    await as(ids.provider);
    await expect(
      db.query("select public.award_bid($1,$2)", [rfq, bid]),
    ).rejects.toThrow();
    await as(ids.owner);
    await db.query("select public.award_bid($1,$2)", [rfq, bid]);
    expect(
      await value("select status from public.rfqs where id=$1", [rfq]),
    ).toBe("awarded");
    await expect(
      db.query("select public.award_bid($1,$2)", [rfq, bid]),
    ).rejects.toThrow();
  });
  it("allows shipment milestones only from the awarded provider", async () => {
    await as(ids.owner);
    await expect(
      db.query("select public.update_shipment($1,'In transit','')", [rfq]),
    ).rejects.toThrow();
    await as(ids.provider);
    await db.query(
      "select public.update_shipment($1,'In transit','Departed origin')",
      [rfq],
    );
    expect(
      await value("select progress from public.rfqs where id=$1", [rfq]),
    ).toBe("In transit");
    await db.query(
      "select public.update_shipment($1,'Delivered','Proof confirmed')",
      [rfq],
    );
    expect(
      await value("select status from public.rfqs where id=$1", [rfq]),
    ).toBe("completed");
  });
  it("enforces admin moderation and blocks suspended providers", async () => {
    await as(ids.admin);
    await db.query("select public.moderate_company($1,true)", [
      providerCompany,
    ]);
    await as(ids.provider);
    expect(
      await value("select public.is_verified_provider($1)", [providerCompany]),
    ).toBe(false);
    await expect(
      db.query(
        "select public.update_company_profile($1,'Renamed','','','{}')",
        [providerCompany],
      ),
    ).rejects.toThrow();
    await as(ids.admin);
    await db.query("select public.moderate_company($1,false)", [
      providerCompany,
    ]);
  });
  it("limits the assistant persistently to ten requests an hour", async () => {
    await as(ids.owner);
    for (let i = 0; i < 10; i++)
      expect(
        await value("select public.claim_inquiry_assistant_request()"),
      ).toBe(true);
    expect(await value("select public.claim_inquiry_assistant_request()")).toBe(
      false,
    );
  });
  it("does not expose private documents to unrelated users", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into storage.objects(bucket_id,name) values('verification-documents',$1)",
      [`${ids.provider}/registration.pdf`],
    );
    await db.exec("grant select on storage.objects to authenticated");
    await as(ids.outsider);
    expect(await value("select count(*) from storage.objects")).toBe(0);
    await as(ids.provider);
    expect(await value("select count(*) from storage.objects")).toBe(1);
    await as(ids.admin);
    expect(await value("select count(*) from storage.objects")).toBe(1);
  });
});
describe("Additional marketplace boundaries", () => {
  it("blocks unverified providers and forged verification review timestamps", async () => {
    await as(ids.outsider);
    const cid = await value(
      "select public.register_company('Pending Provider','agent')",
    );
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days) values($1,auth.uid(),$2,'USD',100,2)",
        [rfq, cid],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.verification_requests(company_id,submitted_by,registration_number,contact_email,contact_phone,reviewed_at) values($1,auth.uid(),'REG-TEST','test@example.test','+000',now())",
        [cid],
      ),
    ).rejects.toThrow();
    await db.query(
      "insert into public.verification_requests(company_id,submitted_by,registration_number,contact_email,contact_phone) values($1,auth.uid(),'REG-TEST','test@example.test','+000')",
      [cid],
    );
    await expect(
      db.query("select public.review_provider($1,'verified')", [cid]),
    ).rejects.toThrow();
    await as(ids.admin);
    await db.query("select public.review_provider($1,'verified')", [cid]);
    await as(ids.outsider);
    expect(
      await value(
        "select verification_status from public.companies where id=$1",
        [cid],
      ),
    ).toBe("verified");
  });
  it("prevents direct invalid RFQ inserts and expired quotation submission", async () => {
    await as(ids.owner);
    await expect(
      db.query(
        "insert into public.rfqs(owner_id,company_id,service,status) values(auth.uid(),$1,'Ocean Freight','open')",
        [ownerCompany],
      ),
    ).rejects.toThrow();
    await as(ids.provider);
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days,valid_until) values($1,auth.uid(),$2,'USD',200,3,'2000-01-01')",
        [rfq, providerCompany],
      ),
    ).rejects.toThrow();
  });
  it("limits notification updates to read state", async () => {
    await as(ids.owner);
    await expect(
      db.query("update public.notifications set user_id=$1", [ids.outsider]),
    ).rejects.toThrow();
    await db.exec("update public.notifications set read_at=now()");
    expect(
      Number(
        await value(
          "select count(*) from public.notifications where read_at is null",
        ),
      ),
    ).toBe(0);
  });
});
describe("Mode-specific database validation", () => {
  const detail = {
    origin: { name: "Shanghai", type: "Port", country: "China", code: "CNSHA" },
    destination: {
      name: "Dar es Salaam",
      type: "Port",
      country: "Tanzania",
      code: "TZDAR",
    },
    cargo: "Consumer goods",
    weight: 25000,
    date: "2099-01-01",
    scope: "Door to door",
    containers: "40ft high cube",
    quantity: 1,
  };
  it("requires and persists both door addresses for sea freight", async () => {
    await as(ids.owner);
    await expect(
      db.query(
        "select public.save_rfq(null,'Ocean Freight',$1::jsonb,'',true)",
        [JSON.stringify(detail)],
      ),
    ).rejects.toThrow(/pickup address/);
    const d = {
      ...detail,
      pickupAddress: "Factory 10, Shanghai, China",
      deliveryAddress: "Warehouse 4, Dar es Salaam, Tanzania",
    };
    const id = await value(
      "select public.save_rfq(null,'Ocean Freight',$1::jsonb,'',true)",
      [JSON.stringify(d)],
    );
    expect(
      await value(
        "select details->>'deliveryAddress' from public.rfqs where id=$1",
        [id],
      ),
    ).toBe(d.deliveryAddress);
  });
  it("rejects missing or fractional sea container quantities", async () => {
    await as(ids.owner);
    for (const quantity of [0, 1.5])
      await expect(
        db.query(
          "select public.save_rfq(null,'Ocean Freight',$1::jsonb,'',true)",
          [JSON.stringify({ ...detail, scope: "Port to port", quantity })],
        ),
      ).rejects.toThrow(/containers/);
  });
  it("validates air packages and rejects sea equipment", async () => {
    await as(ids.owner);
    const air = {
      ...detail,
      origin: { name: "Dar es Salaam", type: "Airport", code: "DAR" },
      destination: { name: "Nairobi", type: "Airport", code: "NBO" },
      scope: "Airport to airport",
      packageCount: 12,
      weight: 240,
    };
    await expect(
      db.query("select public.save_rfq(null,'Air Freight',$1::jsonb,'',true)", [
        JSON.stringify(air),
      ]),
    ).rejects.toThrow(/sea equipment/);
    const { containers, quantity, ...valid } = air;
    void containers;
    void quantity;
    const id = await value(
      "select public.save_rfq(null,'Air Freight',$1::jsonb,'',true)",
      [JSON.stringify(valid)],
    );
    expect(
      await value(
        "select (details->>'packageCount')::int from public.rfqs where id=$1",
        [id],
      ),
    ).toBe(12);
    await expect(
      db.query("select public.save_rfq(null,'Air Freight',$1::jsonb,'',true)", [
        JSON.stringify({ ...valid, packageCount: 0 }),
      ]),
    ).rejects.toThrow(/boxes\/packages/);
  });
  it("accepts trucking addresses while rejecting standalone clearance inquiries", async () => {
    await as(ids.owner);
    const road = {
      ...detail,
      origin: { name: "Factory, Arusha", type: "Address", country: "Tanzania" },
      destination: {
        name: "Warehouse, Nairobi",
        type: "Address",
        country: "Kenya",
      },
      pickupAddress: "Factory, Arusha",
      deliveryAddress: "Warehouse, Nairobi",
    };
    const id = await value(
      "select public.save_rfq(null,'Trucking',$1::jsonb,'',true)",
      [JSON.stringify(road)],
    );
    expect(
      await value("select status from public.rfqs where id=$1", [id]),
    ).toBe("open");
    await expect(
      db.query(
        "select public.save_rfq(null,'Customs Clearance','{}','',false)",
      ),
    ).rejects.toThrow(/Clearing agents/);
  });
});

describe("Administrator review workspaces", () => {
  let customerCompany = "",
    cfaCompany = "",
    truckCompany = "",
    reviewRfq = "",
    reviewBid = "",
    realRfq = "";
  const detail = {
    origin: { name: "Shanghai", type: "Port", country: "China" },
    destination: { name: "Dar es Salaam", type: "Port", country: "Tanzania" },
    scope: "Port to port",
    containers: "40ft container",
    quantity: 1,
    cargo: "Review cargo",
    weight: 1000,
    date: "2099-01-01",
  };
  it("rejects ordinary users attempting admin role switching", async () => {
    await as(ids.owner);
    await expect(
      db.query("select public.switch_admin_workspace('cfa')"),
    ).rejects.toThrow(/Administrator only/);
    await expect(
      db.query(
        "insert into public.admin_workspace_preferences(user_id,workspace) values(auth.uid(),'cfa')",
      ),
    ).rejects.toThrow();
    const context = (await value("select public.get_workspace_context()")) as {
      is_admin: boolean;
      company: { id: string };
    };
    expect(context.is_admin).toBe(false);
    expect(context.company.id).toBe(ownerCompany);
  });
  it("creates reusable private workspaces for each admin role", async () => {
    await as(ids.admin);
    const a = (await value(
      "select public.switch_admin_workspace('customer')",
    )) as {
      company: { id: string; role: string; review_owner_id: string };
      role: string;
    };
    customerCompany = a.company.id;
    expect(a.role).toBe("customer");
    expect(a.company.role).toBe("shipper");
    expect(a.company.review_owner_id).toBe(ids.admin);
    const again = (await value(
      "select public.switch_admin_workspace('customer')",
    )) as { company: { id: string } };
    expect(again.company.id).toBe(customerCompany);
    reviewRfq = (await value(
      "select public.save_rfq(null,'Ocean Freight',$1::jsonb,'',true)",
      [JSON.stringify(detail)],
    )) as string;
    expect(
      await value("select review_owner_id from public.rfqs where id=$1", [
        reviewRfq,
      ]),
    ).toBe(ids.admin);
  });
  it("hides review companies and inquiries from public and regular users", async () => {
    await as(ids.provider);
    expect(
      await value("select count(*) from public.rfqs where id=$1", [reviewRfq]),
    ).toBe(0);
    expect(
      await value("select count(*) from public.companies where id=$1", [
        customerCompany,
      ]),
    ).toBe(0);
    await db.exec(
      "reset role;select set_config('request.jwt.claim.sub','',false);set role anon",
    );
    expect(
      await value(
        "select count(*) from public.companies where review_owner_id is not null",
      ),
    ).toBe(0);
  });
  it("allows a review CFA to quote on its administrator’s review inquiry", async () => {
    await as(ids.admin);
    const ctx = (await value(
      "select public.switch_admin_workspace('cfa')",
    )) as { company: { id: string; role: string }; role: string };
    cfaCompany = ctx.company.id;
    expect(ctx.role).toBe("provider");
    expect(ctx.company.role).toBe("agent");
    reviewBid = (await value(
      "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days,scope,valid_until) values($1,auth.uid(),$2,'USD',3400,20,'Port to port','2099-01-30') returning id",
      [reviewRfq, cfaCompany],
    )) as string;
    expect(
      await value("select review_owner_id from public.bids where id=$1", [
        reviewBid,
      ]),
    ).toBe(ids.admin);
  });
  it("blocks crossing between review and live marketplace bids", async () => {
    await as(ids.owner);
    realRfq = (await value(
      "select public.save_rfq(null,'Ocean Freight',$1::jsonb,'',true)",
      [JSON.stringify(detail)],
    )) as string;
    await as(ids.admin);
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days) values($1,auth.uid(),$2,'USD',100,2)",
        [realRfq, cfaCompany],
      ),
    ).rejects.toThrow();
    await as(ids.provider);
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days) values($1,auth.uid(),$2,'USD',100,2)",
        [reviewRfq, providerCompany],
      ),
    ).rejects.toThrow();
  });
  it("enforces truck-owner eligibility and active company on the server", async () => {
    await as(ids.admin);
    const ctx = (await value(
      "select public.switch_admin_workspace('trucker')",
    )) as { company: { id: string; role: string } };
    truckCompany = ctx.company.id;
    expect(ctx.company.role).toBe("trucker");
    await expect(
      db.query(
        "insert into public.bids(rfq_id,provider_id,company_id,currency,amount,transit_days) values($1,auth.uid(),$2,'USD',100,2)",
        [reviewRfq, truckCompany],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.award_bid($1,$2)", [reviewRfq, reviewBid]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "select public.save_rfq(null,'Ocean Freight',$1::jsonb,'',true)",
        [JSON.stringify(detail)],
      ),
    ).rejects.toThrow();
  });
  it("completes review award and milestone flows under the correct role", async () => {
    await as(ids.admin);
    await value("select public.switch_admin_workspace('customer')");
    await db.query("select public.award_bid($1,$2)", [reviewRfq, reviewBid]);
    await value("select public.switch_admin_workspace('trucker')");
    await expect(
      db.query("select public.update_shipment($1,'In transit','')", [
        reviewRfq,
      ]),
    ).rejects.toThrow();
    await value("select public.switch_admin_workspace('cfa')");
    await db.query(
      "select public.update_shipment($1,'In transit','Review milestone')",
      [reviewRfq],
    );
    expect(
      await value("select progress from public.rfqs where id=$1", [reviewRfq]),
    ).toBe("In transit");
  });
  it("keeps normal role identity intact and returns to the admin console", async () => {
    await as(ids.owner);
    expect(await value("select public.active_company_id()")).toBe(ownerCompany);
    await as(ids.admin);
    const ctx = (await value(
      "select public.switch_admin_workspace('admin')",
    )) as { role: string; is_admin: boolean; workspace: string };
    expect(ctx.role).toBe("admin");
    expect(ctx.is_admin).toBe(true);
    expect(ctx.workspace).toBe("admin");
  });
});
