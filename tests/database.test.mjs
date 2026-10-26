import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
const u = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const db = new PGlite();
const migrations = (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort();
for (const file of ['schema.sql','functions.sql','policies.sql']) await db.exec(await readFile(new URL('./fixtures/'+file,import.meta.url),'utf8'));
for (const file of migrations) await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const as = async n => { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u(n)]); };
const bid = (company=102, rfq=201, provider=2, status='submitted') => `insert into public.bids(id,rfq_id,provider_id,company_id,currency,amount,transit_days,status) values('${u(301)}','${u(rfq)}','${u(provider)}','${u(company)}','USD',100,5,'${status}')`;
async function scenario(fn) {
  await db.exec('begin');
  try {
    await db.exec(`insert into public.companies(id,owner_id,name,role,verification_status) values
      ('${u(101)}','${u(1)}','Cargo owner','shipper','pending'),
      ('${u(102)}','${u(2)}','Forwarder','agent','verified'),
      ('${u(103)}','${u(3)}','Trucker','trucker','verified'),
      ('${u(104)}','${u(4)}','Pending agent','agent','pending');
      insert into public.company_members(company_id,user_id) select id,owner_id from public.companies;
      insert into public.rfqs(id,owner_id,company_id,service) values
      ('${u(201)}','${u(1)}','${u(101)}','Ocean Freight'),
      ('${u(202)}','${u(1)}',null,'Trucking'),
      ('${u(203)}','${u(1)}',null,'Air Freight'),
      ('${u(204)}','${u(1)}',null,'Warehousing');`);
    await fn();
  } finally { await db.exec('rollback'); }
}
test('existing Supabase contracts and corrected RLS / award RPC', async t => {
  await t.test('company registration creates both company and membership as pending', () => scenario(async () => {
    await as(5); const r = await db.query("select public.register_company('New company','agent') as id");
    const id=r.rows[0].id; const c=await db.query('select * from public.companies where id=$1',[id]);
    assert.equal(c.rows[0].verification_status,'pending'); assert.equal(c.rows[0].owner_id,u(5));
    assert.equal((await db.query('select * from public.company_members where company_id=$1',[id])).rows[0].user_id,u(5));
  }));
  await t.test('company registration rejects invalid roles', () => scenario(async () => {
    await as(5); await assert.rejects(db.query("select public.register_company('New company','admin')"), /Invalid company details/);
  }));
  await t.test('customer can publish an individual request', () => scenario(async () => {
    await as(5); await db.exec(`insert into public.rfqs(owner_id,service) values('${u(5)}','Ocean Freight')`);
    assert.equal((await db.query('select count(*) from public.rfqs where owner_id=$1',[u(5)])).rows[0].count,1);
  }));
  await t.test('customer cannot publish as another user', () => scenario(async () => {
    await as(5); await assert.rejects(db.exec(`insert into public.rfqs(owner_id,service) values('${u(1)}','Ocean Freight')`),/row-level security/);
  }));
  for (const [name,company,rfq,provider] of [['ocean',102,201,2],['trucking',103,202,3],['air',102,203,2],['warehousing',102,204,2]]) {
    await t.test(`verified provider can bid for ${name} regardless of shipper company role`, () => scenario(async () => { await as(provider); await db.exec(bid(company,rfq,provider)); assert.equal((await db.query('select count(*) from public.bids')).rows[0].count,1); }));
  }
  for (const [name,company,rfq,provider] of [['wrong service',103,201,3],['pending company',104,201,4],['another company',102,201,3],['spoofed provider',102,201,3],['self bid',101,201,1]]) {
    await t.test(`rejects ${name}`, () => scenario(async () => { await as(provider); await assert.rejects(db.exec(bid(company,rfq,provider)),/row-level security/); }));
  }
  await t.test('cannot self-award through a provider company also owned by the cargo owner', () => scenario(async () => {
    await db.exec(`update public.companies set owner_id='${u(1)}' where id='${u(102)}'`);
    await as(2); await assert.rejects(db.exec(bid()),/row-level security/);
  }));
  await t.test('cannot bid on own company request through another membership', () => scenario(async () => {
    await db.exec(`insert into public.company_members(company_id,user_id) values('${u(101)}','${u(2)}')`);
    await as(2); await assert.rejects(db.exec(bid()),/row-level security/);
  }));
  await t.test('closed RFQs reject bids', () => scenario(async () => {
    await db.exec("update public.rfqs set status='closed'"); await as(2); await assert.rejects(db.exec(bid()),/row-level security/);
  }));
  await t.test('cannot submit pre-awarded bid status', () => scenario(async () => { await as(2); await assert.rejects(db.exec(bid(102,201,2,'awarded')),/row-level security/); }));
  await t.test('duplicate company bids are rejected', () => scenario(async () => { await as(2); await db.exec(bid()); await assert.rejects(db.exec(bid().replace(u(301),u(302))),/unique constraint/); }));
  await t.test('cargo owner awards another verified company and both statuses update', () => scenario(async () => {
    await as(2); await db.exec(bid()); await as(1); await db.query('select public.award_bid($1,$2)',[u(201),u(301)]);
    const r=(await db.query('select status,awarded_bid_id from public.rfqs where id=$1',[u(201)])).rows[0];
    assert.equal(r.status,'awarded');assert.equal(r.awarded_bid_id,u(301)); assert.equal((await db.query('select status from public.bids')).rows[0].status,'awarded');
  }));
  await t.test('provider cannot award own bid', () => scenario(async () => { await as(2); await db.exec(bid()); await assert.rejects(db.query('select public.award_bid($1,$2)',[u(201),u(301)]),/Not permitted/); }));
  await t.test('cannot award unverified provider', () => scenario(async () => { await db.exec(bid()); await db.exec("update public.companies set verification_status='rejected' where role='agent'"); await as(1); await assert.rejects(db.query('select public.award_bid($1,$2)',[u(201),u(301)]),/Invalid or unverified/); }));
  await t.test('cannot award bid from another RFQ', () => scenario(async () => { await db.exec(bid()); await as(1); await assert.rejects(db.query('select public.award_bid($1,$2)',[u(202),u(301)]),/Invalid bid/); }));
  await t.test('cannot award twice', () => scenario(async () => { await db.exec(bid()); await as(1); await db.query('select public.award_bid($1,$2)',[u(201),u(301)]); await assert.rejects(db.query('select public.award_bid($1,$2)',[u(201),u(301)]),/Not permitted/); }));
  await t.test('anonymous callers cannot register or award', () => scenario(async () => { await db.exec('set role anon'); await assert.rejects(db.query("select public.register_company('Test','agent')"),/permission denied/); }));
  await t.test('anonymous callers cannot award', () => scenario(async () => { await db.exec('set role anon'); await assert.rejects(db.query('select public.award_bid($1,$2)',[u(201),u(301)]),/permission denied/); }));
  await t.test('competing providers cannot read each other’s bids', () => scenario(async () => { await db.exec(bid()); await as(3); assert.equal((await db.query('select count(*) from public.bids')).rows[0].count,0); }));
  await db.close();
});
