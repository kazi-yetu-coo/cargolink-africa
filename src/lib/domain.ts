import type { Bid, RFQ, ShipmentDetails } from "./types";
export const modes = [
  "Ocean Freight",
  "Air Freight",
  "Trucking",
  "Rail Freight",
  "Multimodal",
  "Customs Clearance",
  "Warehousing",
];
export const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
export const shortId = (id: string) =>
  `RFQ-${id.startsWith("demo-") ? id.slice(5) : id.slice(0, 8).toUpperCase()}`;
export const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not specified";
export function validateShipment(d: ShipmentDetails, service: string) {
  const errors: Record<string, string> = {};
  if (!d.origin) errors.origin = "Choose an origin location.";
  if (service !== "Warehousing" && !d.destination)
    errors.destination = "Choose a destination location.";
  if (
    d.origin &&
    d.destination &&
    JSON.stringify(d.origin) === JSON.stringify(d.destination)
  )
    errors.destination = "Choose a destination different from the origin.";
  if (!d.cargo?.trim()) errors.cargo = "Describe the cargo.";
  if (!(Number(d.weight) > 0))
    errors.weight = "Enter a weight greater than zero.";
  if (d.volume !== undefined && Number(d.volume) < 0)
    errors.volume = "Volume cannot be negative.";
  if (!d.date) errors.date = "Select a shipment ready date.";
  else if (d.date < new Date().toISOString().slice(0, 10))
    errors.date = "Ready date cannot be in the past.";
  if (d.deliveryDate && d.date && d.deliveryDate < d.date)
    errors.deliveryDate = "Delivery date must follow the ready date.";
  return errors;
}
export function comparisonWarnings(bids: Bid[]) {
  const warnings: string[] = [];
  if (new Set(bids.map((b) => b.currency)).size > 1)
    warnings.push(
      "Different currencies. Totals are shown in their original currencies; no ranking or currency conversion is applied.",
    );
  if (
    new Set(bids.map((b) => b.scope || "Not specified")).size > 1 ||
    bids.some((b) => !b.scope)
  )
    warnings.push(
      "Service scopes differ or are unspecified. Confirm the same origin, destination and delivery scope before comparing totals.",
    );
  if (
    bids.some(
      (b) =>
        !b.valid_until || new Date(b.valid_until + "T23:59:59") < new Date(),
    )
  )
    warnings.push(
      "Some quotations have expired or do not specify validity. Ask the provider to confirm availability.",
    );
  return warnings;
}
export function routeName(r: RFQ) {
  return `${r.details.origin?.name || String(r.details["Port of loading"] || r.details["Pickup address"] || "Origin")} → ${r.details.destination?.name || String(r.details["Port of destination"] || r.details["Delivery address"] || "Destination")}`;
}
export const costTotal = (p: {
  freight: number;
  customs: number;
  inland: number;
  other: number;
}) => Object.values(p).reduce((a, b) => a + Math.round(b * 100), 0) / 100;
