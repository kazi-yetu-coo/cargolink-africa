import { useCallback, useState } from "react";
import { ArrowRight, CalendarDays, Plus, Truck, Weight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Empty,
  Field,
  Loading,
  PageTitle,
  Panel,
  Select,
  TextArea,
} from "../components/ui";
import { RoadLocationInput } from "../components/road-location-input";
import { useAuth } from "../lib/auth";
import { checked, supabase } from "../lib/supabase";
import { useLoad } from "../lib/hooks";
import { recordScope } from "../lib/review";
import { formatDate } from "../lib/domain";
import type { FreightLocation, TruckListing } from "../lib/types";
export const truckTypes = [
  "Container trailer",
  "Flatbed",
  "Box truck",
  "Refrigerated truck",
  "Low loader",
  "Tanker",
  "Pickup / light truck",
  "Tipper",
];
type ListingForm = {
  origin?: FreightLocation;
  destination?: FreightLocation;
  via: string;
  truckType: string;
  capacityKg: string;
  capacityCbm: string;
  availableFrom: string;
  availableUntil: string;
  notes: string;
};
const blank: ListingForm = {
  via: "",
  truckType: "Box truck",
  capacityKg: "",
  capacityCbm: "",
  availableFrom: "",
  availableUntil: "",
  notes: "",
};
function formFor(t: TruckListing): ListingForm {
  return {
    origin: t.origin,
    destination: t.destination,
    via: t.via,
    truckType: t.truck_type,
    capacityKg: String(t.capacity_kg),
    capacityCbm: t.capacity_cbm ? String(t.capacity_cbm) : "",
    availableFrom: t.available_from,
    availableUntil: t.available_until,
    notes: t.notes,
  };
}
export function Trucks({ manage = false }: { manage?: boolean }) {
  const { user, company, isReview } = useAuth(),
    navigate = useNavigate();
  const [origin, setOrigin] = useState(""),
    [destination, setDestination] = useState(""),
    [truckType, setTruckType] = useState("All trucks"),
    [date, setDate] = useState(""),
    [weight, setWeight] = useState("");
  const [editing, setEditing] = useState<TruckListing | null>(null),
    [showForm, setShowForm] = useState(false),
    [form, setForm] = useState<ListingForm>(blank),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [success, setSuccess] = useState("");
  const loader = useCallback(async () => {
    let q = recordScope(
      supabase
        .from("truck_listings")
        .select("*, companies(name,verification_status)")
        .order("available_from", { ascending: true }),
      isReview,
      user?.id,
    );
    if (manage) q = q.eq("company_id", company?.id);
    else
      q = q
        .eq("status", "available")
        .gte("available_until", new Date().toLocaleDateString("en-CA"));
    return (await checked(q)) as TruckListing[];
  }, [isReview, user?.id, manage, company?.id]);
  const { data, loading, error, reload } = useLoad(loader);
  const rows = (data || []).filter(
    (t) =>
      (manage || t.status === "available") &&
      `${t.origin.name} ${t.origin.country} ${t.via}`
        .toLowerCase()
        .includes(origin.toLowerCase()) &&
      `${t.destination.name} ${t.destination.country} ${t.via}`
        .toLowerCase()
        .includes(destination.toLowerCase()) &&
      (truckType === "All trucks" || t.truck_type === truckType) &&
      (!date || (t.available_from <= date && t.available_until >= date)) &&
      (!weight || Number(t.capacity_kg) >= Number(weight)),
  );
  function update<K extends keyof ListingForm>(k: K, v: ListingForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setActionError("");
  }
  async function save(status: string, t?: TruckListing) {
    const f = t ? formFor(t) : form;
    setBusy(true);
    setActionError("");
    setSuccess("");
    try {
      await checked(
        supabase.rpc("save_truck_listing", {
          p_id: t?.id || editing?.id || null,
          p_status: status,
          p_details: {
            ...f,
            capacityKg: Number(f.capacityKg),
            capacityCbm: f.capacityCbm ? Number(f.capacityCbm) : null,
          },
        }),
      );
      setSuccess(
        status === "available"
          ? "Truck availability published. Shippers can now request a quote."
          : status === "closed"
            ? "Listing closed. Existing quote requests remain available."
            : "Truck availability saved as a draft.",
      );
      setShowForm(false);
      setEditing(null);
      setForm(blank);
      await reload();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Unable to save truck availability.",
      );
    } finally {
      setBusy(false);
    }
  }
  function request(t: TruckListing) {
    const ready =
      t.available_from < new Date().toLocaleDateString("en-CA")
        ? new Date().toLocaleDateString("en-CA")
        : t.available_from;
    sessionStorage.setItem(
      "cargolink-inquiry",
      JSON.stringify({
        service: "Trucking",
        details: {
          origin: t.origin,
          destination: t.destination,
          pickupAddress: t.origin.name,
          deliveryAddress: t.destination.name,
          scope: "Door to door",
          truckType: t.truck_type,
          truckListingId: t.id,
          truckCompanyName: t.companies?.name,
          date: ready,
          services: [],
        },
        resumeStep: 0,
      }),
    );
    navigate("/customer/rfqs/new");
  }
  if (manage && company?.role !== "trucker")
    return (
      <Panel>
        <h2>Truck availability is for truck owners</h2>
        <p>
          Clearing and forwarding agents can find inquiries in the marketplace.
        </p>
        <ButtonLink to="/provider/marketplace">View inquiries</ButtonLink>
      </Panel>
    );
  return (
    <>
      <PageTitle
        title={manage ? "My truck availability" : "Find a truck for your load"}
        description={
          manage
            ? "Share your routes, truck type and available space with shippers."
            : "Browse published routes and request a transport quote directly from a truck owner."
        }
        actions={
          manage && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setShowForm(true);
                setActionError("");
              }}
            >
              <Plus size={17} />
              List available space
            </Button>
          )
        }
      />
      {actionError && <Alert>{actionError}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      {manage && company?.verification_status !== "verified" && (
        <Alert tone="info">
          Save your route now. Complete{" "}
          <a href="/provider/verification">business verification</a> before
          publishing it to shippers.
        </Alert>
      )}
      {showForm && (
        <Panel className="truck-editor">
          <h2>
            {editing
              ? "Edit truck availability"
              : "Where is your truck heading?"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save("available");
            }}
          >
            <div className="two-columns">
              <RoadLocationInput
                label="From *"
                value={form.origin}
                onChange={(v) => update("origin", v)}
              />
              <RoadLocationInput
                label="To *"
                value={form.destination}
                onChange={(v) => update("destination", v)}
              />
            </div>
            <div className="two-columns">
              <Field
                label="Via / towns served"
                value={form.via}
                onChange={(e) => update("via", e.target.value)}
                maxLength={300}
                placeholder="e.g. Morogoro, Dodoma"
              />
              <Select
                label="Truck type"
                value={form.truckType}
                onChange={(v) => update("truckType", v)}
                options={truckTypes}
              />
            </div>
            <div className="two-columns">
              <Field
                label="Available weight capacity (kg) *"
                type="number"
                min="1"
                max="1000000"
                step="any"
                required
                value={form.capacityKg}
                onChange={(e) => update("capacityKg", e.target.value)}
              />
              <Field
                label="Available space (CBM), optional"
                type="number"
                min="0.1"
                max="10000"
                step="any"
                value={form.capacityCbm}
                onChange={(e) => update("capacityCbm", e.target.value)}
              />
            </div>
            <div className="two-columns">
              <Field
                label="Available from *"
                type="date"
                required
                value={form.availableFrom}
                onChange={(e) => update("availableFrom", e.target.value)}
              />
              <Field
                label="Available until *"
                type="date"
                required
                min={form.availableFrom}
                value={form.availableUntil}
                onChange={(e) => update("availableUntil", e.target.value)}
              />
            </div>
            <TextArea
              label="Route and load notes"
              value={form.notes}
              onChange={(v) => update("notes", v)}
              maxLength={1000}
              placeholder="Departure flexibility, suitable loads, shared space or loading arrangements"
            />
            <div className="truck-form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void save("draft")}
                disabled={busy}
              >
                Save draft
              </Button>
              <Button
                type="submit"
                disabled={busy || company?.verification_status !== "verified"}
              >
                {busy ? "Saving…" : "Publish availability"}
              </Button>
            </div>
          </form>
        </Panel>
      )}
      {!manage && (
        <Panel className="truck-filters">
          <Field
            label="From / via"
            placeholder="Town or route"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <Field
            label="To / via"
            placeholder="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <Select
            label="Truck type"
            value={truckType}
            onChange={setTruckType}
            options={["All trucks", ...truckTypes]}
          />
          <Field
            label="Cargo ready date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Field
            label="Load weight (kg)"
            type="number"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Panel>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <Alert>
          {error}{" "}
          <Button variant="ghost" onClick={() => void reload()}>
            Try again
          </Button>
        </Alert>
      ) : rows.length ? (
        <div className="truck-card-grid">
          {rows.map((t) => (
            <Panel key={t.id} className="truck-card">
              <div className="between">
                <span className="icon-tile">
                  <Truck size={22} />
                </span>
                <Badge>
                  {t.available_until < new Date().toLocaleDateString("en-CA")
                    ? "Expired"
                    : t.status}
                </Badge>
              </div>
              <h2>
                {t.origin.name} <ArrowRight size={17} /> {t.destination.name}
              </h2>
              {t.via && <p>Via {t.via}</p>}
              <strong>{t.companies?.name || "Truck owner"}</strong>
              <p>{t.truck_type}</p>
              <div className="truck-facts">
                <span>
                  <Weight size={16} />
                  {Number(t.capacity_kg).toLocaleString()} kg available
                  {t.capacity_cbm ? ` · ${t.capacity_cbm} CBM` : ""}
                </span>
                <span>
                  <CalendarDays size={16} />
                  {formatDate(t.available_from)} –{" "}
                  {formatDate(t.available_until)}
                </span>
              </div>
              {t.notes && <p className="truck-notes">{t.notes}</p>}
              <small>
                Owner-reported availability · final timing and price confirmed
                in the quote.
              </small>
              <div className="truck-form-actions">
                {manage ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(t);
                        setForm(formFor(t));
                        setShowForm(true);
                        setActionError("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </Button>
                    {t.status !== "closed" && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void save("closed", t)}
                      >
                        Close listing
                      </Button>
                    )}
                  </>
                ) : (
                  <Button onClick={() => request(t)}>
                    Request transport quote <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Empty
          title={
            manage
              ? "Your next load starts with your route"
              : "No available trucks match yet"
          }
          description={
            manage
              ? "Add your route and available capacity to receive transport quote requests."
              : "Try another route, date or truck type, or create a freight inquiry."
          }
          action={
            manage ? (
              <Button onClick={() => setShowForm(true)}>
                List available space
              </Button>
            ) : (
              <ButtonLink to="/customer/rfqs/new">Create an inquiry</ButtonLink>
            )
          }
        />
      )}
    </>
  );
}
