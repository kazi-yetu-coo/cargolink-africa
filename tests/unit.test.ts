import { describe, it, expect } from "vitest";
import {
  comparisonWarnings,
  costTotal,
  validateShipment,
} from "../src/lib/domain";
import { searchLocations, locations } from "../src/lib/locations";
import { demoBids } from "../src/lib/demo";
import { POST } from "../api/inquiry";
describe("Structured locations and inquiries", () => {
  it("finds locations by country, name and correct airport code", () => {
    expect(searchLocations("Kilimanjaro")[0].code).toBe("JRO");
    expect(searchLocations("TZDAR")[0].type).toBe("Port");
    expect(
      searchLocations("Inland terminal").some(
        (l) => l.type === "Inland terminal",
      ),
    ).toBe(true);
  });
  it("requires route, cargo, weight and date before submission", () => {
    const e = validateShipment({}, "Ocean Freight");
    expect(Object.keys(e).sort()).toEqual([
      "cargo",
      "date",
      "destination",
      "origin",
      "weight",
    ]);
  });
  it("rejects identical origin and destination, negative volume and impossible scheduling", () => {
    const e = validateShipment(
      {
        origin: locations[0],
        destination: locations[0],
        cargo: "Consumer goods",
        weight: 10,
        volume: -1,
        date: "2099-04-10",
        deliveryDate: "2099-04-01",
      },
      "Ocean Freight",
    );
    expect(e.destination).toBeTruthy();
    expect(e.volume).toBeTruthy();
    expect(e.deliveryDate).toBeTruthy();
  });
  it("supports a storage location without a transport destination", () => {
    expect(
      validateShipment(
        {
          origin: locations[0],
          cargo: "Pallets",
          weight: 100,
          date: "2099-01-01",
        },
        "Warehousing",
      ),
    ).toEqual({});
  });
});
describe("Quotation comparisons", () => {
  it("flags differing scopes without inventing comparable rankings", () => {
    expect(comparisonWarnings(demoBids).join(" ")).toContain(
      "Service scopes differ",
    );
  });
  it("flags mixed currencies and expired validity", () => {
    expect(
      comparisonWarnings([
        demoBids[0],
        { ...demoBids[1], currency: "KES", valid_until: "2000-01-01" },
      ]).join(" "),
    ).toContain("Different currencies");
    expect(
      comparisonWarnings([{ ...demoBids[0], valid_until: undefined }]).join(
        " ",
      ),
    ).toContain("validity");
  });
  it("totals all charges accurately", () => {
    expect(
      costTotal({ freight: 2500, customs: 350, inland: 500, other: 100 }),
    ).toBe(3450);
  });
});
describe("Currency precision", () => {
  it("adds decimal charges without floating point drift", () => {
    expect(costTotal({ freight: 0.1, customs: 0.2, inland: 0, other: 0 })).toBe(
      0.3,
    );
  });
});
describe("Assistant dependency handling", () => {
  it("returns an explicit unavailable response when no AI key is configured", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await POST(
      new Request("https://example.test/api/inquiry", { method: "POST" }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("structured inquiry form");
    if (previous) process.env.OPENAI_API_KEY = previous;
  });
});
