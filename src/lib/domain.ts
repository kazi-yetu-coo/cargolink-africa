import type { Bid, RFQ, ShipmentDetails } from "./types";
export const modes = [
  "Ocean Freight",
  "Air Freight",
  "Trucking",
  "Rail Freight",
  "Multimodal",
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
export const equipmentOptions = [
  "20ft container",
  "40ft container",
  "40ft high cube",
  "20ft reefer",
  "40ft reefer",
  "Open top",
  "Flat rack",
  "LCL / loose cargo",
  "Breakbulk / non-containerised",
];
export function scopeOptions(service: string) {
  return service === "Warehousing"
    ? ["Storage only", "Storage & handling"]
    : service === "Ocean Freight"
      ? ["Port to port", "Door to door", "Door to port", "Port to door"]
      : service === "Air Freight"
        ? [
            "Airport to airport",
            "Door to door",
            "Door to airport",
            "Airport to door",
          ]
        : service === "Trucking"
          ? ["Door to door", "Terminal to terminal"]
          : [
              "Terminal to terminal",
              "Door to door",
              "Door to terminal",
              "Terminal to door",
            ];
}
export const defaultScope = (service: string) => scopeOptions(service)[0];
export function normalizeTransportDetails(
  details: ShipmentDetails,
  service: string,
): ShipmentDetails {
  const d = {
    ...details,
    scope: scopeOptions(service).includes(details.scope || "")
      ? details.scope
      : defaultScope(service),
  };
  if (service !== "Ocean Freight") {
    delete d.containers;
    delete d.quantity;
  }
  if (service !== "Trucking") delete d.truckType;
  return d;
}
export function switchTransport(
  details: ShipmentDetails,
  service: string,
): ShipmentDetails {
  const d = normalizeTransportDetails(
    { ...details, scope: defaultScope(service) },
    service,
  );
  if (service === "Ocean Freight" || service === "Air Freight") {
    const type = service === "Ocean Freight" ? "Port" : "Airport";
    if (d.origin?.type !== type) delete d.origin;
    if (d.destination?.type !== type) delete d.destination;
  }
  if (service === "Ocean Freight") d.quantity ||= 1;
  if (service === "Air Freight" && d.cargoType === "Containers")
    d.cargoType = "General cargo";
  return d;
}
export function shipmentSteps(service: string) {
  return [
    service === "Ocean Freight"
      ? "Sea route & equipment"
      : service === "Air Freight"
        ? "Air route & packages"
        : service === "Trucking"
          ? "Road route & pickup"
          : "Route & service",
    service === "Air Freight" ? "Air cargo & schedule" : "Cargo & schedule",
    "Services & handling",
    "Review & submit",
  ];
}
const wholePositive = (n: unknown) =>
  Number.isInteger(Number(n)) && Number(n) > 0;
export function validateFirstStep(d: ShipmentDetails, service: string) {
  const errors: Record<string, string> = {};
  if (!d.origin)
    errors.origin = "Choose an origin location or enter a pickup address.";
  if (service === "Ocean Freight" && d.origin && d.origin.type !== "Port")
    errors.origin = "Choose an origin port.";
  if (service === "Air Freight" && d.origin && d.origin.type !== "Airport")
    errors.origin = "Choose an origin airport.";
  if (service !== "Warehousing" && !d.destination)
    errors.destination =
      "Choose a destination location or enter a delivery address.";
  if (
    service === "Ocean Freight" &&
    d.destination &&
    d.destination.type !== "Port"
  )
    errors.destination = "Choose a destination port.";
  if (
    service === "Air Freight" &&
    d.destination &&
    d.destination.type !== "Airport"
  )
    errors.destination = "Choose a destination airport.";
  if (
    d.origin &&
    d.destination &&
    JSON.stringify(d.origin) === JSON.stringify(d.destination) &&
    service !== "Warehousing"
  )
    errors.destination = "Choose a destination different from the origin.";
  const scope = d.scope || defaultScope(service);
  if (
    service !== "Warehousing" &&
    scope.startsWith("Door") &&
    !d.pickupAddress?.trim()
  )
    errors.pickupAddress = "Enter the full pickup address.";
  if (
    service !== "Warehousing" &&
    scope.endsWith("door") &&
    !d.deliveryAddress?.trim()
  )
    errors.deliveryAddress = "Enter the full delivery address.";
  if (service === "Ocean Freight") {
    if (
      !d.containers ||
      d.containers === "Not required" ||
      d.containers === "Select equipment"
    )
      errors.containers = "Select sea shipment equipment.";
    if (
      d.containers &&
      !["LCL / loose cargo", "LCL", "Breakbulk / non-containerised"].includes(
        d.containers,
      ) &&
      !wholePositive(d.quantity)
    )
      errors.quantity = "Enter a positive whole number of containers.";
  }
  if (service === "Air Freight") {
    if (!wholePositive(d.packageCount))
      errors.packageCount =
        "Enter a positive whole number of boxes or packages.";
    if (!Number.isFinite(Number(d.weight)) || !(Number(d.weight) > 0))
      errors.weight = "Enter the total gross weight in kilograms.";
  }
  return errors;
}
export function validateShipment(d: ShipmentDetails, service: string) {
  const errors = validateFirstStep(d, service);
  if (!d.cargo?.trim()) errors.cargo = "Describe the cargo.";
  if (!Number.isFinite(Number(d.weight)) || !(Number(d.weight) > 0))
    errors.weight = "Enter a weight greater than zero.";
  if (
    d.volume !== undefined &&
    (!Number.isFinite(Number(d.volume)) || Number(d.volume) < 0)
  )
    errors.volume = "Volume cannot be negative.";
  if (d.packageCount !== undefined && !wholePositive(d.packageCount))
    errors.packageCount = "Enter a positive whole number of packages.";
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
