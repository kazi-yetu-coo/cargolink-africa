import type { RFQ } from "./types";
export function preparationItems(r: Pick<RFQ, "service" | "details">) {
  const items = [
    {
      id: "parties",
      title: "Confirm the shipment parties",
      detail:
        "Check shipper, consignee and contact details, collection and delivery addresses, and who is responsible for each service.",
    },
    {
      id: "invoice",
      title: "Prepare goods and value information",
      detail:
        "For goods sold, prepare commercial invoice details including description, quantity, value and currency. Ask your provider what is appropriate for samples or personal effects.",
    },
    {
      id: "packing",
      title: "Prepare a packing list",
      detail:
        "Record package counts, packaging, gross and net weights and dimensions. Match these details across shipment documents.",
    },
  ];
  const transport =
    r.service === "Ocean Freight"
      ? "Discuss the bill of lading or sea waybill and confirm container and loading details with your forwarder."
      : r.service === "Air Freight"
        ? "Confirm air waybill details, package dimensions and any airline handling restrictions."
        : r.service === "Warehousing"
          ? "Confirm the inventory, storage conditions and receiving and release instructions with your warehouse."
          : "Ask the transport provider which consignment note or other transport document applies to your route.";
  items.push({
    id: "transport",
    title: "Confirm transport documentation",
    detail: transport,
  });
  items.push({
    id: "customs",
    title: "Check route-specific customs requirements",
    detail:
      "For cross-border shipments, ask your CFA to confirm declarations, classification, origin evidence, permits and inspections that apply to your goods. Domestic shipments may not need customs documentation.",
  });
  if (r.details.cargoType === "Hazardous")
    items.push({
      id: "hazardous",
      title: "Discuss dangerous goods requirements",
      detail:
        "Provide an accurate goods description and safety information. Confirm classification, packaging and declarations with a qualified provider before booking.",
    });
  if (r.details.cargoType === "Perishables")
    items.push({
      id: "perishables",
      title: "Confirm temperature and inspection needs",
      detail:
        "Agree temperature controls and ask your CFA whether health, veterinary or plant certificates apply.",
    });
  items.push({
    id: "handover",
    title: "Agree the next steps with your provider",
    detail:
      "Confirm the quote scope, document deadlines, collection arrangements and insurance responsibilities before handing over cargo.",
  });
  return items;
}
