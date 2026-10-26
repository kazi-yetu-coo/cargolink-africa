import { Field, LocationInput, Select } from "./ui";
import type { ShipmentDetails, FreightLocation } from "../lib/types";
import { defaultScope, equipmentOptions, scopeOptions } from "../lib/domain";
export type ShipmentChange = <K extends keyof ShipmentDetails>(
  key: K,
  value: ShipmentDetails[K],
) => void;
export function RouteFields({
  service,
  details,
  onChange,
  errors = {},
}: {
  service: string;
  details: ShipmentDetails;
  onChange: ShipmentChange;
  errors?: Record<string, string>;
}) {
  const scope = details.scope || defaultScope(service);
  const types: FreightLocation["type"][] | undefined =
    service === "Ocean Freight"
      ? ["Port"]
      : service === "Air Freight"
        ? ["Airport"]
        : undefined;
  const sea = service === "Ocean Freight",
    air = service === "Air Freight",
    road = service === "Trucking",
    storage = service === "Warehousing";
  return (
    <>
      <div className="two-columns route-fields">
        <LocationInput
          key={`${service}-origin`}
          label={
            storage
              ? "Storage location *"
              : sea
                ? "Origin port *"
                : air
                  ? "Origin airport *"
                  : road
                    ? "Pickup city, town or address *"
                    : "Origin *"
          }
          value={details.origin}
          onChange={(v) => {
            onChange("origin", v);
            if (road && v?.type === "Address")
              onChange("pickupAddress", v.name);
          }}
          error={errors.origin}
          types={types}
          allowAddress={
            road ||
            storage ||
            service === "Multimodal" ||
            service === "Rail Freight"
          }
          placeholder={
            road ? "Search a city, town or enter an address" : undefined
          }
        />
        {!storage && (
          <LocationInput
            key={`${service}-destination`}
            label={
              sea
                ? "Destination port *"
                : air
                  ? "Destination airport *"
                  : road
                    ? "Delivery city, town or address *"
                    : "Destination *"
            }
            value={details.destination}
            onChange={(v) => {
              onChange("destination", v);
              if (road && v?.type === "Address")
                onChange("deliveryAddress", v.name);
            }}
            error={errors.destination}
            types={types}
            allowAddress={
              road || service === "Multimodal" || service === "Rail Freight"
            }
            placeholder={
              road ? "Search a city, town or enter an address" : undefined
            }
          />
        )}
      </div>
      <Select
        label="Service scope"
        value={scope}
        onChange={(v) => onChange("scope", v)}
        options={scopeOptions(service)}
      />
      {!storage && (scope.startsWith("Door") || scope.endsWith("door")) && (
        <section className="door-addresses">
          <div>
            <strong>
              {scope === "Door to door"
                ? "Door-to-door locations"
                : "Door service location"}
            </strong>
            <p>
              Give the exact collection or delivery address, including the
              business name, street and city.
            </p>
          </div>
          <div className="two-columns">
            {scope.startsWith("Door") && (
              <Field
                label="Pickup address *"
                placeholder="Business / warehouse, street, city, country"
                value={details.pickupAddress || ""}
                onChange={(e) => onChange("pickupAddress", e.target.value)}
                maxLength={500}
                error={errors.pickupAddress}
              />
            )}
            {scope.endsWith("door") && (
              <Field
                label="Delivery address *"
                placeholder="Business / warehouse, street, city, country"
                value={details.deliveryAddress || ""}
                onChange={(e) => onChange("deliveryAddress", e.target.value)}
                maxLength={500}
                error={errors.deliveryAddress}
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}
export function TransportFields({
  service,
  details,
  onChange,
  errors = {},
  quick = false,
}: {
  service: string;
  details: ShipmentDetails;
  onChange: ShipmentChange;
  errors?: Record<string, string>;
  quick?: boolean;
}) {
  if (service === "Air Freight")
    return (
      <div className="two-columns">
        <Field
          label="Number of boxes / packages *"
          type="number"
          min="1"
          step="1"
          value={details.packageCount ?? ""}
          onChange={(e) =>
            onChange(
              "packageCount",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
          error={errors.packageCount}
          hint="Total individual boxes or packages"
        />
        {quick && (
          <Field
            label="Total gross weight (kg) *"
            type="number"
            min="0.01"
            step="any"
            value={details.weight ?? ""}
            onChange={(e) =>
              onChange(
                "weight",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            error={errors.weight}
          />
        )}
      </div>
    );
  if (service === "Ocean Freight")
    return (
      <div className="two-columns">
        <Select
          label="Sea shipment equipment *"
          value={details.containers || "Select equipment"}
          onChange={(v) =>
            onChange("containers", v === "Select equipment" ? "" : v)
          }
          options={["Select equipment", ...equipmentOptions]}
        />
        {details.containers === "LCL / loose cargo" ||
        details.containers === "Breakbulk / non-containerised" ? (
          <Field
            label="Number of packages"
            type="number"
            min="1"
            step="1"
            value={details.packageCount ?? ""}
            onChange={(e) =>
              onChange(
                "packageCount",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            error={errors.packageCount}
          />
        ) : (
          <Field
            label="Number of containers *"
            type="number"
            min="1"
            step="1"
            value={details.quantity ?? 1}
            onChange={(e) =>
              onChange(
                "quantity",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            error={errors.quantity}
          />
        )}
        {errors.containers && (
          <small className="field-error">{errors.containers}</small>
        )}
      </div>
    );
  if (!quick && service === "Trucking")
    return (
      <div className="two-columns">
        <Select
          label="Preferred truck type"
          value={details.truckType || "Provider to recommend"}
          onChange={(v) => onChange("truckType", v)}
          options={[
            "Provider to recommend",
            "Container trailer",
            "Flatbed",
            "Box truck",
            "Refrigerated truck",
            "Low loader",
            "Tanker",
          ]}
        />
        <Field
          label="Number of packages"
          type="number"
          min="1"
          step="1"
          value={details.packageCount ?? ""}
          onChange={(e) =>
            onChange(
              "packageCount",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
          error={errors.packageCount}
        />
      </div>
    );
  return null;
}
