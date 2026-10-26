import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
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
  PageTitle,
  Panel,
  Select,
  Stepper,
  TextArea,
} from "../components/ui";
import { InquiryProgress } from "../components/inquiry-progress";
import { useAuth } from "../lib/auth";
import { checked, supabase } from "../lib/supabase";
import {
  modes,
  validateShipment,
  normalizeTransportDetails,
  defaultScope,
  shipmentSteps,
  switchTransport,
} from "../lib/domain";
import { locationLabel } from "../lib/locations";
import type { RFQ, ShipmentDetails } from "../lib/types";
import { RouteFields, TransportFields } from "../components/shipment-fields";
function stored() {
  try {
    return JSON.parse(sessionStorage.getItem("cargolink-inquiry") || "{}") as {
      service?: string;
      details?: ShipmentDetails;
      notes?: string;
      entryStepCompleted?: boolean;
      resumeStep?: number;
      furthestStep?: number;
    };
  } catch {
    return {};
  }
}
export function RFQEditor() {
  const { id } = useParams(),
    { user, company, role, isReview } = useAuth(),
    navigate = useNavigate();
  const [initial] = useState(stored);
  const [service, setService] = useState(initial.service || "Ocean Freight"),
    [details, setDetails] = useState<ShipmentDetails>(
      normalizeTransportDetails(
        {
          cargoType: "General cargo",
          scope: defaultScope(initial.service || "Ocean Freight"),
          quantity: 1,
          services: [],
          ...initial.details,
        },
        initial.service || "Ocean Freight",
      ),
    ),
    [notes, setNotes] = useState(initial.notes || ""),
    [step, setStep] = useState(
      id
        ? 0
        : Math.max(
            0,
            Math.min(
              3,
              initial.resumeStep ?? (initial.entryStepCompleted ? 1 : 0),
            ),
          ),
    ),
    [furthestStep, setFurthestStep] = useState(
      initial.furthestStep ??
        initial.resumeStep ??
        (initial.entryStepCompleted ? 1 : 0),
    ),
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
      if (r.owner_id !== user?.id || (isReview && r.company_id !== company?.id))
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
  }, [id, user?.id, isReview, company?.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!id)
      sessionStorage.setItem(
        "cargolink-inquiry",
        JSON.stringify({
          service,
          details,
          notes,
          entryStepCompleted: initial.entryStepCompleted,
          resumeStep: step,
          furthestStep,
        }),
      );
  }, [
    service,
    details,
    notes,
    id,
    step,
    furthestStep,
    initial.entryStepCompleted,
  ]);
  function set<K extends keyof ShipmentDetails>(k: K, v: ShipmentDetails[K]) {
    setDetails((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }
  function next() {
    const e = validateShipment(details, service);
    const relevant =
      step === 0
        ? [
            "origin",
            "destination",
            "pickupAddress",
            "deliveryAddress",
            "containers",
            "quantity",
            "packageCount",
            ...(service === "Air Freight" ? ["weight"] : []),
          ]
        : step === 1
          ? [
              "cargo",
              "weight",
              "volume",
              "date",
              "deliveryDate",
              "packageCount",
            ]
          : [];
    const filtered = Object.fromEntries(
      Object.entries(e).filter(([k]) => relevant.includes(k)),
    );
    setErrors(filtered);
    if (!Object.keys(filtered).length) {
      setFurthestStep((previous) => Math.max(previous, step + 1));
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function save(submit: boolean) {
    if (submit) {
      const e = validateShipment(details, service);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(
          [
            "origin",
            "destination",
            "pickupAddress",
            "deliveryAddress",
            "containers",
            "quantity",
            ...(service === "Air Freight" ? ["packageCount"] : []),
          ].some((k) => e[k])
            ? 0
            : 1,
        );
        return;
      }
    }
    if (!user) {
      sessionStorage.setItem(
        "cargolink-inquiry",
        JSON.stringify({
          service,
          details,
          notes,
          entryStepCompleted: initial.entryStepCompleted,
          resumeStep: step,
          furthestStep,
        }),
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
          p_details: normalizeTransportDetails(details, service),
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
      {!id && initial.entryStepCompleted && (
        <Alert tone="success">
          <strong>Great, you’ve completed the first step!</strong>
          <br />
          Your route and transport details are saved. Just three more steps:
          cargo & schedule, services & handling, then review & submit.{" "}
          <button
            type="button"
            className="text-link inline-action"
            onClick={() => setStep(0)}
          >
            Edit your first step
          </button>
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
      <InquiryProgress
        details={details}
        service={service}
        step={step}
        notes={notes}
        furthestStep={furthestStep}
      />
      <Panel className="wizard-panel">
        <aside>
          <Stepper steps={shipmentSteps(service)} current={step} />
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
                    Warehouse,
                  ][i];
                  return (
                    <button
                      key={m}
                      type="button"
                      className={service === m ? "selected" : ""}
                      onClick={() => {
                        setService(m);
                        setDetails((d) => switchTransport(d, m));
                        setErrors({});
                      }}
                    >
                      <Icon size={23} />
                      <span>{m === "Trucking" ? "Road freight" : m}</span>
                    </button>
                  );
                })}
              </div>
              <RouteFields
                service={service}
                details={details}
                onChange={set}
                errors={errors}
              />
              <TransportFields
                service={service}
                details={details}
                onChange={set}
                errors={errors}
                quick
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
                options={
                  service === "Air Freight"
                    ? ["General cargo", "Perishables", "Hazardous", "Vehicles"]
                    : [
                        "General cargo",
                        "Containers",
                        "Project cargo",
                        "Perishables",
                        "Hazardous",
                        "Vehicles",
                      ]
                }
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
              {service === "Trucking" && (
                <TransportFields
                  service={service}
                  details={details}
                  onChange={set}
                  errors={errors}
                />
              )}
              {(service === "Ocean Freight" || service === "Air Freight") && (
                <p className="fine-print">
                  {service === "Air Freight"
                    ? `${details.packageCount || "Not specified"} boxes / packages`
                    : `${details.quantity || "Not specified"} × ${details.containers || "equipment not selected"}`}{" "}
                  ·{" "}
                  <button
                    type="button"
                    className="text-link inline-action"
                    onClick={() => setStep(0)}
                  >
                    Edit transport details
                  </button>
                </p>
              )}
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
                  ...(service === "Ocean Freight"
                    ? [
                        ["Sea equipment", details.containers],
                        ["Containers", details.quantity],
                      ]
                    : []),
                  ...(service === "Air Freight" || details.packageCount
                    ? [["Boxes / packages", details.packageCount]]
                    : []),
                  ...(service === "Trucking"
                    ? [
                        [
                          "Truck type",
                          details.truckType || "Provider to recommend",
                        ],
                      ]
                    : []),
                  ...(details.scope?.startsWith("Door")
                    ? [["Pickup address", details.pickupAddress]]
                    : []),
                  ...(details.scope?.endsWith("door")
                    ? [["Delivery address", details.deliveryAddress]]
                    : []),
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
