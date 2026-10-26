import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
  PackageCheck,
  Plane,
  Save,
  Ship,
  Sparkles,
  TrainFront,
  Truck,
  Warehouse,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Field,
  Loading,
  LocationInput,
  PageTitle,
  Panel,
  Select,
  Stepper,
  TextArea,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { checked, supabase } from "../lib/supabase";
import { modes, validateShipment } from "../lib/domain";
import { locationLabel } from "../lib/locations";
import type { RFQ, ShipmentDetails } from "../lib/types";
function stored() {
  try {
    return JSON.parse(sessionStorage.getItem("cargolink-inquiry") || "{}") as {
      service?: string;
      details?: ShipmentDetails;
      notes?: string;
    };
  } catch {
    return {};
  }
}
export function RFQEditor() {
  const { id } = useParams(),
    { user, company, role } = useAuth(),
    navigate = useNavigate();
  const [initial] = useState(stored);
  const [service, setService] = useState(initial.service || "Ocean Freight"),
    [details, setDetails] = useState<ShipmentDetails>({
      cargoType: "General cargo",
      scope: "Door to door",
      quantity: 1,
      services: [],
      ...initial.details,
    }),
    [notes, setNotes] = useState(initial.notes || ""),
    [step, setStep] = useState(0),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!!id),
    [status, setStatus] = useState("draft");
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = (await checked(
        supabase.from("rfqs").select("*").eq("id", id).single(),
      )) as RFQ;
      if (r.owner_id !== user?.id)
        throw new Error("Only the cargo owner can edit this inquiry.");
      setService(r.service);
      setDetails(r.details);
      setNotes(r.notes);
      setStatus(r.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load inquiry.");
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!id)
      sessionStorage.setItem(
        "cargolink-inquiry",
        JSON.stringify({ service, details, notes }),
      );
  }, [service, details, notes, id]);
  function set<K extends keyof ShipmentDetails>(k: K, v: ShipmentDetails[K]) {
    setDetails((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }
  function next() {
    const e = validateShipment(details, service);
    const relevant =
      step === 0
        ? ["origin", "destination"]
        : step === 1
          ? ["cargo", "weight", "volume", "date", "deliveryDate"]
          : [];
    const filtered = Object.fromEntries(
      Object.entries(e).filter(([k]) => relevant.includes(k)),
    );
    setErrors(filtered);
    if (!Object.keys(filtered).length) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function save(submit: boolean) {
    if (submit) {
      const e = validateShipment(details, service);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(e.origin || e.destination ? 0 : 1);
        return;
      }
    }
    if (!user) {
      sessionStorage.setItem(
        "cargolink-inquiry",
        JSON.stringify({ service, details, notes }),
      );
      navigate("/auth/sign-in?next=%2Fcustomer%2Frfqs%2Fnew");
      return;
    }
    if (role !== "customer") {
      setError("Create and submit inquiries from a cargo owner account.");
      return;
    }
    if (!company) {
      navigate("/onboarding");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await checked(
        supabase.rpc("save_rfq", {
          p_id: id || null,
          p_service: service,
          p_details: details,
          p_notes: notes,
          p_submit: submit,
        }),
      );
      sessionStorage.removeItem("cargolink-inquiry");
      navigate(`/customer/rfqs/${result}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save inquiry.");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (id && status !== "draft")
    return (
      <Panel>
        <Alert>
          Submitted inquiries cannot be edited. Close the inquiry and create a
          new one if the cargo requirements have changed.
        </Alert>
        <Link to={`/customer/rfqs/${id}`}>Return to inquiry</Link>
      </Panel>
    );
  return (
    <div
      className={
        !location.pathname.startsWith("/customer")
          ? "container content-page"
          : ""
      }
    >
      <PageTitle
        title={id ? "Edit your inquiry" : "Create a new RFQ"}
        description="One clear inquiry. The right logistics connections."
        actions={
          <Link to="/inquiry/assistant" className="text-link">
            <Sparkles size={16} />
            Use inquiry assistant
          </Link>
        }
      />
      {error && <Alert>{error}</Alert>}
      <Panel className="wizard-panel">
        <aside>
          <Stepper
            steps={[
              "Route & service",
              "Cargo & schedule",
              "Additional services",
              "Review & submit",
            ]}
            current={step}
          />
          <div className="wizard-hint">
            <ShieldIcon />
            <h4>A good quote starts with good details.</h4>
            <p>
              Be specific about your cargo, service scope and timing so
              providers can quote accurately.
            </p>
          </div>
        </aside>
        <div className="wizard-content">
          {step === 0 ? (
            <>
              <div className="eyebrow">STEP 1 OF 4</div>
              <h2>Where is your cargo going?</h2>
              <p>Start with your route and the service you need.</p>
              <label className="standalone-label">Service type</label>
              <div className="mode-grid">
                {modes.map((m, i) => {
                  const Icon = [
                    Ship,
                    Plane,
                    Truck,
                    TrainFront,
                    Globe2,
                    PackageCheck,
                    Warehouse,
                  ][i];
                  return (
                    <button
                      key={m}
                      type="button"
                      className={service === m ? "selected" : ""}
                      onClick={() => setService(m)}
                    >
                      <Icon size={23} />
                      <span>{m === "Trucking" ? "Road freight" : m}</span>
                    </button>
                  );
                })}
              </div>
              <div className="two-columns">
                <LocationInput
                  label={
                    service === "Warehousing"
                      ? "Storage location *"
                      : "Origin *"
                  }
                  value={details.origin}
                  onChange={(v) => set("origin", v)}
                  error={errors.origin}
                />
                {service !== "Warehousing" && (
                  <LocationInput
                    label="Destination *"
                    value={details.destination}
                    onChange={(v) => set("destination", v)}
                    error={errors.destination}
                  />
                )}
              </div>
              <Select
                label="Service scope"
                value={details.scope || "Door to door"}
                onChange={(v) => set("scope", v)}
                options={
                  service === "Warehousing"
                    ? ["Storage only", "Storage & handling"]
                    : service === "Customs Clearance"
                      ? [
                          "Import clearance",
                          "Export clearance",
                          "Transit clearance",
                        ]
                      : [
                          "Door to door",
                          "Port to port",
                          "Door to port",
                          "Port to door",
                          "Airport to airport",
                          "Terminal to terminal",
                        ]
                }
              />
            </>
          ) : step === 1 ? (
            <>
              <div className="eyebrow">STEP 2 OF 4</div>
              <h2>Tell us what’s moving.</h2>
              <p>Include enough detail for a practical, accurate quotation.</p>
              <Select
                label="Cargo type"
                value={details.cargoType || "General cargo"}
                onChange={(v) => set("cargoType", v)}
                options={[
                  "General cargo",
                  "Containers",
                  "Project cargo",
                  "Perishables",
                  "Hazardous",
                  "Vehicles",
                ]}
              />
              <TextArea
                label="Cargo description *"
                value={details.cargo || ""}
                onChange={(v) => set("cargo", v)}
                placeholder="e.g. Consumer electronics, palletised, non-hazardous"
              />
              {errors.cargo && (
                <small className="field-error">{errors.cargo}</small>
              )}
              <div className="two-columns">
                <Field
                  label="Gross weight (kg) *"
                  type="number"
                  min="0.01"
                  step="any"
                  value={details.weight ?? ""}
                  onChange={(e) =>
                    set(
                      "weight",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  error={errors.weight}
                />
                <Field
                  label="Volume (CBM)"
                  type="number"
                  min="0"
                  step="any"
                  value={details.volume ?? ""}
                  onChange={(e) =>
                    set(
                      "volume",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  error={errors.volume}
                />
              </div>
              <div className="two-columns">
                <Select
                  label="Equipment / container"
                  value={details.containers || "Not required"}
                  onChange={(v) => set("containers", v)}
                  options={[
                    "Not required",
                    "20ft container",
                    "40ft container",
                    "40ft high cube",
                    "Reefer",
                    "LCL",
                    "Flatbed",
                    "Box truck",
                  ]}
                />
                <Field
                  label="Packages / containers"
                  type="number"
                  min="1"
                  step="1"
                  value={details.quantity ?? 1}
                  onChange={(e) => set("quantity", Number(e.target.value))}
                />
              </div>
              <div className="two-columns">
                <Field
                  label="Cargo ready date *"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={details.date || ""}
                  onChange={(e) => set("date", e.target.value)}
                  error={errors.date}
                />
                <Field
                  label="Preferred delivery date"
                  type="date"
                  min={details.date}
                  value={details.deliveryDate || ""}
                  onChange={(e) => set("deliveryDate", e.target.value)}
                  error={errors.deliveryDate}
                />
              </div>
            </>
          ) : step === 2 ? (
            <>
              <div className="eyebrow">STEP 3 OF 4</div>
              <h2>Everything your shipment needs.</h2>
              <p>Let providers know which additional services to include.</p>
              <div className="checkbox-grid">
                {[
                  "Customs clearance",
                  "Inland trucking",
                  "Cargo insurance",
                  "Warehousing",
                  "Documentation",
                  "Loading / unloading",
                  "Cold chain",
                  "Dangerous goods handling",
                ].map((s) => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      checked={details.services?.includes(s) || false}
                      onChange={(e) =>
                        set(
                          "services",
                          e.target.checked
                            ? [...(details.services || []), s]
                            : (details.services || []).filter((v) => v !== s),
                        )
                      }
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
              <TextArea
                label="Special handling requirements"
                value={details.requirements || ""}
                onChange={(v) => set("requirements", v)}
                placeholder="Temperature, dimensions, handling instructions or permit requirements"
              />
              <TextArea
                label="Additional notes"
                value={notes}
                onChange={setNotes}
                placeholder="Anything else your provider needs to know"
              />
            </>
          ) : (
            <>
              <div className="eyebrow">STEP 4 OF 4</div>
              <h2>Ready for the right connection.</h2>
              <p>
                Review your inquiry before publishing it to the marketplace.
              </p>
              <div className="review-route">
                <Ship size={25} />
                <div>
                  <strong>
                    {locationLabel(details.origin)} <ArrowRight size={15} />{" "}
                    {locationLabel(details.destination)}
                  </strong>
                  <small>
                    {service} · {details.scope}
                  </small>
                </div>
              </div>
              <dl className="detail-grid">
                {[
                  ["Cargo", details.cargo],
                  ["Cargo type", details.cargoType],
                  ["Gross weight", `${details.weight} kg`],
                  ["Volume", `${details.volume || "Not specified"} CBM`],
                  ["Equipment", details.containers || "Not required"],
                  ["Quantity", details.quantity || 1],
                  ["Ready date", details.date],
                  ["Preferred delivery", details.deliveryDate || "Flexible"],
                  [
                    "Additional services",
                    details.services?.join(", ") || "None",
                  ],
                  ["Special requirements", details.requirements || "None"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v || "—")}</dd>
                  </div>
                ))}
              </dl>
              {notes && <p>{notes}</p>}
              <Alert tone="info">
                Submitting makes this inquiry available to eligible providers.
                You can close it before awarding a quotation.
              </Alert>
            </>
          )}
          <div className="wizard-actions">
            <Button
              variant="ghost"
              onClick={() => (step ? setStep((s) => s - 1) : navigate(-1))}
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div className="actions">
              <Button
                variant="secondary"
                onClick={() => void save(false)}
                busy={busy}
              >
                <Save size={15} />
                Save draft
              </Button>
              {step < 3 ? (
                <Button onClick={next}>
                  Continue <ArrowRight size={16} />
                </Button>
              ) : (
                <Button busy={busy} onClick={() => void save(true)}>
                  Submit inquiry <CheckCircle2 size={17} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
function ShieldIcon() {
  return <FileText size={24} />;
}
