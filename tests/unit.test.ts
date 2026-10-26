import { describe, it, expect } from "vitest";
import {
  comparisonWarnings,
  costTotal,
  validateShipment,
  validateFirstStep,
  normalizeTransportDetails,
  switchTransport,
  shipmentSteps,
  modes,
  inquiryProgress,
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
      "containers",
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

describe("Transport-specific inquiry stages", () => {
  const sea = {
    origin: locations[0],
    destination: locations[1],
    scope: "Door to door",
    containers: "40ft container",
    quantity: 1,
  };
  it("requires both street addresses for door-to-door service", () => {
    expect(validateFirstStep(sea, "Ocean Freight")).toMatchObject({
      pickupAddress: expect.any(String),
      deliveryAddress: expect.any(String),
    });
    expect(
      validateFirstStep(
        {
          ...sea,
          pickupAddress: "Factory, Shanghai, China",
          deliveryAddress: "Warehouse, Nairobi, Kenya",
        },
        "Ocean Freight",
      ),
    ).toEqual({});
  });
  it("does not require door addresses for port-to-port service", () => {
    expect(
      validateFirstStep({ ...sea, scope: "Port to port" }, "Ocean Freight"),
    ).toEqual({});
  });
  it("requires sea equipment and a valid container count", () => {
    expect(
      validateFirstStep(
        { ...sea, scope: "Port to port", containers: "" },
        "Ocean Freight",
      ).containers,
    ).toBeTruthy();
    expect(
      validateFirstStep(
        { ...sea, scope: "Port to port", quantity: 1.5 },
        "Ocean Freight",
      ).quantity,
    ).toBeTruthy();
  });
  it("uses packages and weight for air with no sea equipment", () => {
    const air = {
      origin: locations.find((l) => l.code === "DAR" && l.type === "Airport"),
      destination: locations.find(
        (l) => l.code === "NBO" && l.type === "Airport",
      ),
      scope: "Airport to airport",
    };
    expect(validateFirstStep(air, "Air Freight")).toMatchObject({
      packageCount: expect.any(String),
      weight: expect.any(String),
    });
    expect(
      validateFirstStep(
        { ...air, packageCount: 12, weight: 240 },
        "Air Freight",
      ),
    ).toEqual({});
    expect(
      normalizeTransportDetails(
        { ...air, containers: "40ft container", quantity: 1 },
        "Air Freight",
      ).containers,
    ).toBeUndefined();
  });
  it("accepts trucking street addresses rather than requiring ports", () => {
    const road = {
      origin: {
        name: "Factory, Arusha",
        country: "Tanzania",
        type: "Address" as const,
        code: "",
      },
      destination: {
        name: "Warehouse, Nairobi",
        country: "Kenya",
        type: "Address" as const,
        code: "",
      },
      scope: "Door to door",
      pickupAddress: "Factory, Arusha",
      deliveryAddress: "Warehouse, Nairobi",
    };
    expect(validateFirstStep(road, "Trucking")).toEqual({});
  });
  it("filters airport suggestions before limiting the results", () => {
    expect(searchLocations("", ["Airport"]).length).toBeGreaterThan(0);
    expect(
      searchLocations("", ["Airport"]).every((l) => l.type === "Airport"),
    ).toBe(true);
  });
  it("clears incompatible ports and equipment when switching to air", () => {
    const d = switchTransport(sea, "Air Freight");
    expect(d.origin).toBeUndefined();
    expect(d.containers).toBeUndefined();
    expect(d.scope).toBe("Airport to airport");
  });
  it("uses mode-specific progress steps and removes standalone clearance", () => {
    expect(shipmentSteps("Air Freight")[0]).toBe("Air route & packages");
    expect(shipmentSteps("Ocean Freight")[0]).toBe("Sea route & equipment");
    expect(modes).not.toContain("Customs Clearance");
  });
});

describe("Interactive inquiry progress", () => {
  const valid = {
    origin: locations[0],
    destination: locations[1],
    scope: "Port to port",
    containers: "40ft container",
    quantity: 1,
    cargo: "Consumer goods",
    weight: 1000,
    date: "2099-01-01",
  };
  it("starts low and grows as required route and cargo fields become valid", () => {
    const empty = inquiryProgress({}, "Ocean Freight", 0).percent;
    const route = inquiryProgress(
      {
        origin: locations[0],
        destination: locations[1],
        scope: "Port to port",
        containers: "40ft container",
        quantity: 1,
      },
      "Ocean Freight",
      1,
    ).percent;
    const cargo = inquiryProgress(valid, "Ocean Freight", 1).percent;
    expect(empty).toBe(0);
    expect(route).toBeGreaterThan(empty);
    expect(cargo).toBeGreaterThan(route);
  });
  it("reflects optional services being filled and reaches 100 only when ready to submit", () => {
    const before = inquiryProgress(valid, "Ocean Freight", 2).percent;
    const services = inquiryProgress(
      { ...valid, services: ["Insurance"] },
      "Ocean Freight",
      2,
    ).percent;
    expect(services).toBeGreaterThan(before);
    expect(inquiryProgress(valid, "Ocean Freight", 3)).toEqual({
      percent: 100,
      completed: 4,
    });
  });
  it("drops when a required field is removed", () => {
    expect(
      inquiryProgress({ ...valid, cargo: "" }, "Ocean Freight", 3).percent,
    ).toBeLessThan(100);
  });
});
