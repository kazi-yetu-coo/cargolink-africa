import { useCallback, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Empty,
  Field,
  Loading,
  Modal,
  PageTitle,
  Panel,
  Select,
  Status,
  Stepper,
  TextArea,
  Verified,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { useLoad } from "../lib/hooks";
import { checked, supabase } from "../lib/supabase";
import {
  comparisonWarnings,
  costTotal,
  formatDate,
  money,
  routeName,
  shortId,
  scopeOptions,
  defaultScope,
} from "../lib/domain";
import { demoBids, demoRFQs } from "../lib/demo";
import type { Bid, RFQ } from "../lib/types";
export function RFQDetail({
  demo = false,
  compare = false,
}: {
  demo?: boolean;
  compare?: boolean;
}) {
  const { id } = useParams(),
    { user, role, company, isReview } = useAuth(),
    navigate = useNavigate();
  const [tab, setTab] = useState(compare ? "quotes" : "details"),
    [selected, setSelected] = useState<string[]>([]),
    [award, setAward] = useState<Bid | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState(""),
    [milestone, setMilestone] = useState("Picked up"),
    [note, setNote] = useState("");
  const base = demo ? "/demo" : `/${role}`;
  const loader = useCallback(async () => {
    if (demo) {
      const r = demoRFQs.find((r) => r.id === id);
      if (!r) throw new Error("Sample inquiry not found");
      return {
        rfq: r,
        bids: demoBids.filter((b) => b.rfq_id === id),
        events: [] as {
          id: string;
          milestone: string;
          note: string;
          created_at: string;
        }[],
      };
    }
    let bidQuery = supabase
      .from("bids")
      .select("*,companies(name,verification_status)")
      .eq("rfq_id", id)
      .order("created_at");
    if (role === "provider") bidQuery = bidQuery.eq("company_id", company?.id);
    const [r, b, events] = await Promise.all([
      checked(supabase.from("rfqs").select("*").eq("id", id).single()),
      checked(bidQuery),
      checked(
        supabase
          .from("shipment_events")
          .select("*")
          .eq("rfq_id", id)
          .order("created_at", { ascending: false }),
      ),
    ]);
    return { rfq: r as RFQ, bids: b as Bid[], events: events || [] };
  }, [demo, id, role, company?.id]);
  const { data, error: loadError, loading, reload } = useLoad(loader);
  if (loading) return <Loading />;
  if (loadError || !data)
    return (
      <Panel>
        <Alert>{loadError || "Inquiry not found or access denied."}</Alert>
        <Button onClick={() => void reload()}>Retry</Button>
      </Panel>
    );
  const r = data.rfq,
    bids = data.bids,
    owner =
      demo ||
      (r.owner_id === user?.id && (!isReview || r.company_id === company?.id)),
    myBid = bids.find(
      (b) => b.provider_id === user?.id && b.company_id === company?.id,
    );
  const comparison = bids.filter((b) => selected.includes(b.id));
  async function awardBid() {
    if (!award) return;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        setFeedback(
          "This is a demonstration. Create a live account to award a quotation.",
        );
        setAward(null);
        return;
      }
      await checked(
        supabase.rpc("award_bid", { p_rfq_id: r.id, p_bid_id: award.id }),
      );
      setAward(null);
      setFeedback("Quotation awarded. Your provider has been notified.");
      await reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to award this quotation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to={`${base}/rfqs`}>
        <ArrowLeft size={15} />
        Back to inquiries
      </Link>
      <PageTitle
        title={shortId(r.id)}
        description={routeName(r)}
        actions={
          <>
            <Status value={r.status} />
            {owner && r.status === "draft" && !demo && (
              <ButtonLink to={`/customer/rfqs/${r.id}/edit`}>
                Edit draft <ArrowRight size={15} />
              </ButtonLink>
            )}
            {owner && ["draft", "open"].includes(r.status) && !demo && (
              <Button
                variant="secondary"
                onClick={async () => {
                  setError("");
                  try {
                    await checked(
                      supabase.rpc("manage_rfq_status", {
                        p_rfq_id: r.id,
                        p_status: "closed",
                      }),
                    );
                    await reload();
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to close inquiry.",
                    );
                  }
                }}
              >
                Close inquiry
              </Button>
            )}
          </>
        }
      />
      {demo && (
        <Alert tone="info">
          Demonstration inquiry · sample data · no live shipment or transaction
        </Alert>
      )}
      {feedback && <Alert tone="success">{feedback}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Panel className="detail-panel">
        <div className="detail-tabs">
          {[
            ["details", "Shipment details"],
            ["quotes", `Quotations (${bids.length})`],
            ["activity", "Shipment activity"],
          ].map(([v, label]) => (
            <button
              className={tab === v ? "active" : ""}
              key={v}
              onClick={() => setTab(v)}
            >
              {label}
            </button>
          ))}
          {!demo && (
            <Link to={`${base}/messages?rfq=${r.id}`}>
              <MessageSquare size={15} />
              Messages
            </Link>
          )}
        </div>
        {tab === "details" ? (
          <div className="detail-content">
            <div>
              <div className="eyebrow">SHIPMENT OVERVIEW</div>
              <h2>{r.service}</h2>
              <dl className="detail-grid">
                {[
                  ["Cargo type", r.details.cargoType],
                  ["Cargo description", r.details.cargo],
                  [
                    "Gross weight",
                    r.details.weight ? `${r.details.weight} kg` : undefined,
                  ],
                  [
                    "Volume",
                    r.details.volume ? `${r.details.volume} CBM` : undefined,
                  ],
                  ...(r.service === "Ocean Freight"
                    ? [
                        ["Sea equipment", r.details.containers],
                        ["Containers", r.details.quantity],
                      ]
                    : []),
                  ...(r.service === "Air Freight" || r.details.packageCount
                    ? [["Boxes / packages", r.details.packageCount]]
                    : []),
                  ...(r.details.truckType
                    ? [["Truck type", r.details.truckType]]
                    : []),
                  ...(r.details.pickupAddress
                    ? [["Pickup address", r.details.pickupAddress]]
                    : []),
                  ...(r.details.deliveryAddress
                    ? [["Delivery address", r.details.deliveryAddress]]
                    : []),
                  ["Service scope", r.details.scope],
                  ["Ready date", r.details.date],
                  ["Preferred delivery", r.details.deliveryDate],
                  ["Additional services", r.details.services?.join(", ")],
                  ["Special requirements", r.details.requirements],
                  ["Created", formatDate(r.created_at)],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt>{label}</dt>
                    <dd>{value ? String(value) : "Not specified"}</dd>
                  </div>
                ))}
              </dl>
              {Object.keys(r.details).some((k) => k.includes(" ")) && (
                <>
                  <h3>Original shipment details</h3>
                  <dl className="detail-grid">
                    {Object.entries(r.details)
                      .filter(([k]) => k.includes(" "))
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                </>
              )}
              {r.notes && (
                <>
                  <h3>Additional notes</h3>
                  <p>{r.notes}</p>
                </>
              )}
            </div>
            <div className="route-card">
              <div className="route-card-map">
                <GlobeRoute />
                <Badge>ROUTE OVERVIEW</Badge>
              </div>
              <div className="route-stops">
                <div>
                  <MapPin size={18} />
                  <span>
                    <small>ORIGIN</small>
                    <strong>
                      {r.details.origin?.name ||
                        String(r.details["Port of loading"] || "Not specified")}
                    </strong>
                    <small>{r.details.origin?.country}</small>
                  </span>
                </div>
                <div>
                  <MapPin size={18} />
                  <span>
                    <small>DESTINATION</small>
                    <strong>
                      {r.details.destination?.name ||
                        String(
                          r.details["Port of destination"] || "Not specified",
                        )}
                    </strong>
                    <small>{r.details.destination?.country}</small>
                  </span>
                </div>
              </div>
              <small className="map-disclaimer">
                Illustrative route · not a navigational map
              </small>
            </div>
          </div>
        ) : tab === "quotes" ? (
          <div className="panel-pad">
            <div className="between">
              <div>
                <h2>
                  {owner
                    ? "Find the right fit for your shipment"
                    : "Your quotation"}
                </h2>
                <p className="muted">
                  Compare scope, terms and validity alongside the total price.
                </p>
              </div>
              {owner && bids.length > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => setSelected(bids.map((b) => b.id))}
                >
                  Compare all ({bids.length})
                </Button>
              )}
            </div>
            {bids.length ? (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {owner && <th>Select</th>}
                        <th>Provider</th>
                        <th>Total price</th>
                        <th>Scope</th>
                        <th>Transit</th>
                        <th>Valid until</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {bids.map((b) => (
                        <tr key={b.id}>
                          {owner && (
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Compare ${b.companies?.name || "provider"}`}
                                checked={selected.includes(b.id)}
                                onChange={(e) =>
                                  setSelected((s) =>
                                    e.target.checked
                                      ? [...s, b.id]
                                      : s.filter((id) => id !== b.id),
                                  )
                                }
                              />
                            </td>
                          )}
                          <td>
                            <strong>{b.companies?.name || "Provider"}</strong>
                            {b.companies?.verification_status ===
                              "verified" && <Verified />}
                          </td>
                          <td>
                            <strong>{money(b.amount, b.currency)}</strong>
                          </td>
                          <td>{b.scope || "Not specified"}</td>
                          <td>{b.transit_days} days</td>
                          <td>{formatDate(b.valid_until)}</td>
                          <td>
                            <Status value={b.status || "submitted"} />
                          </td>
                          <td>
                            {owner &&
                              r.status === "open" &&
                              b.status === "submitted" && (
                                <Button
                                  variant="secondary"
                                  onClick={() => setAward(b)}
                                >
                                  Award <Check size={14} />
                                </Button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {comparison.length > 0 && <QuoteComparison bids={comparison} />}
                {!owner && bids[0] && <QuoteComparison bids={bids} />}
              </>
            ) : (
              <Empty
                title="The right quotation is on its way"
                description="Provider quotations will appear here when they respond."
              />
            )}
          </div>
        ) : (
          <div className="panel-pad">
            <h2>Shipment activity</h2>
            <p className="muted">
              Milestones are entered by the awarded provider. CargoLink does not
              provide live GPS tracking.
            </p>
            <div className="timeline">
              <div>
                <span>
                  <FileText size={17} />
                </span>
                <div>
                  <strong>Inquiry created</strong>
                  <small>{formatDate(r.created_at)}</small>
                </div>
              </div>
              {["awarded", "completed"].includes(r.status) && (
                <div>
                  <span>
                    <ShieldCheck size={17} />
                  </span>
                  <div>
                    <strong>Quotation awarded</strong>
                    <small>
                      Current milestone: {r.progress || "Awaiting pickup"}
                    </small>
                  </div>
                </div>
              )}
              {data.events.map((e) => (
                <div key={e.id}>
                  <span>
                    <Truck size={17} />
                  </span>
                  <div>
                    <strong>{e.milestone}</strong>
                    <p>{e.note}</p>
                    <small>{new Date(e.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
            {myBid?.id === r.awarded_bid_id && r.status === "awarded" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await checked(
                      supabase.rpc("update_shipment", {
                        p_rfq_id: r.id,
                        p_milestone: milestone,
                        p_note: note,
                      }),
                    );
                    setNote("");
                    setFeedback("Shipment milestone updated.");
                    await reload();
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to update shipment.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h3>Update shipment milestone</h3>
                <Select
                  label="Current milestone"
                  value={milestone}
                  onChange={setMilestone}
                  options={[
                    "Awaiting pickup",
                    "Picked up",
                    "In transit",
                    "At customs",
                    "Out for delivery",
                    "Delivered",
                  ]}
                />
                <TextArea
                  label="Update note"
                  value={note}
                  onChange={setNote}
                  maxLength={1000}
                />
                <Button busy={busy} type="submit">
                  Publish update <ArrowRight size={15} />
                </Button>
              </form>
            )}
          </div>
        )}
      </Panel>
      {!owner && !myBid && r.status === "open" && (
        <Panel className="opportunity-cta">
          <div>
            <h2>Can you move this shipment?</h2>
            <p>
              Submit a detailed quotation with your scope, charges and terms.
            </p>
          </div>
          <ButtonLink to={`/provider/rfqs/${r.id}/bid`}>
            Submit quotation <Send size={16} />
          </ButtonLink>
        </Panel>
      )}
      {award && (
        <Modal
          title="Award this quotation?"
          onClose={() => !busy && setAward(null)}
        >
          <p>
            You’re selecting <strong>{award.companies?.name}</strong> for{" "}
            <strong>{money(award.amount, award.currency)}</strong>.
          </p>
          <p>
            Scope: <strong>{award.scope || "Not specified"}</strong>.
            Exclusions: {award.exclusions || "Not specified"}. Confirm the
            contract and payment arrangements directly with the provider.
          </p>
          {error && <Alert>{error}</Alert>}
          <div className="form-actions">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setAward(null)}
            >
              Keep reviewing
            </Button>
            <Button busy={busy} onClick={() => void awardBid()}>
              Confirm award <CheckCircle2 size={16} />
            </Button>
          </div>
        </Modal>
      )}
      <div className="actions">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          Back
        </Button>
      </div>
    </>
  );
}
export function QuoteComparison({ bids }: { bids: Bid[] }) {
  const warnings = comparisonWarnings(bids);
  const rows: [string, (b: Bid) => string][] = [
    ["Total price", (b) => money(b.amount, b.currency)],
    [
      "Freight charges",
      (b) =>
        b.freight_charges != null
          ? money(b.freight_charges, b.currency)
          : "Not specified",
    ],
    [
      "Customs & clearance",
      (b) =>
        b.customs_fees != null
          ? money(b.customs_fees, b.currency)
          : "Not specified",
    ],
    [
      "Inland transportation",
      (b) =>
        b.inland_charges != null
          ? money(b.inland_charges, b.currency)
          : "Not specified",
    ],
    [
      "Other charges",
      (b) =>
        b.other_charges != null
          ? money(b.other_charges, b.currency)
          : "Not specified",
    ],
    ["Service scope", (b) => b.scope || "Not specified"],
    ["Included services", (b) => b.inclusions?.join(", ") || "Not specified"],
    ["Excluded charges", (b) => b.exclusions || "Not specified"],
    ["Transit estimate", (b) => `${b.transit_days} days`],
    ["Quote validity", (b) => formatDate(b.valid_until)],
    [
      "Verification",
      (b) => b.companies?.verification_status || "Not specified",
    ],
    ["Service terms", (b) => b.terms || b.notes || "Not specified"],
  ];
  return (
    <section className="quote-comparison">
      <h3>Quotation comparison</h3>
      {warnings.map((w) => (
        <Alert tone="warning" key={w}>
          {w}
        </Alert>
      ))}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Price & service details</th>
              {bids.map((b) => (
                <th key={b.id}>{b.companies?.name || "Provider"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([title, fn]) => (
              <tr key={title}>
                <th>{title}</th>
                {bids.map((b) => (
                  <td key={b.id}>{fn(b)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        No automatic currency conversion or price ranking. Confirm that all
        required services are included before awarding.
      </p>
    </section>
  );
}
function GlobeRoute() {
  return (
    <svg viewBox="0 0 300 250" aria-hidden="true">
      <defs>
        <pattern
          id="route-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path d="M20 0H0V20" fill="none" stroke="#c9e4e5" strokeWidth=".7" />
        </pattern>
      </defs>
      <rect width="300" height="250" fill="url(#route-grid)" />
      <path
        d="M85 32L159 19 206 54 220 100 197 141 177 149 153 211 126 219 111 179 95 137 63 118 49 71Z"
        fill="#c4e5e6"
        stroke="#a8d1d5"
      />
      <path
        d="M71 91Q136 152 211 144"
        stroke="#00896d"
        strokeWidth="3"
        strokeDasharray="5 5"
        fill="none"
      />
      <circle cx="71" cy="91" r="7" fill="#00896d" />
      <circle cx="211" cy="144" r="7" fill="#17364a" />
    </svg>
  );
}
export function SubmitBid() {
  const { id } = useParams(),
    { company, user, isReview } = useAuth(),
    navigate = useNavigate();
  const [step, setStep] = useState(0),
    [currency, setCurrency] = useState("USD"),
    [scopeChoice, setScope] = useState(""),
    [days, setDays] = useState(""),
    [valid, setValid] = useState(""),
    [costs, setCosts] = useState({
      freight: 0,
      customs: 0,
      inland: 0,
      other: 0,
    }),
    [inclusions, setInclusions] = useState<string[]>([]),
    [exclusions, setExclusions] = useState(""),
    [terms, setTerms] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const loader = useCallback(
    async () =>
      (await checked(
        supabase.from("rfqs").select("*").eq("id", id).single(),
      )) as RFQ,
    [id],
  );
  const { data: r, error: loadError, loading } = useLoad(loader);
  const scope = scopeChoice || defaultScope(r?.service || "Ocean Freight");
  if (loading) return <Loading />;
  if (loadError || !r)
    return <Alert>{loadError || "Inquiry unavailable"}</Alert>;
  if (company?.verification_status !== "verified")
    return (
      <Panel>
        <Empty
          title="Get verified to start quoting"
          description="Complete your business verification to submit quotations on the marketplace."
          action={
            <ButtonLink to="/provider/verification">
              Verify my business <ShieldCheck size={16} />
            </ButtonLink>
          }
        />
      </Panel>
    );
  if (
    (r.owner_id === user?.id && (!isReview || r.company_id === company?.id)) ||
    r.status !== "open"
  )
    return <Alert>This inquiry is not available for quoting.</Alert>;
  if (
    company?.role === "trucker" &&
    !["Trucking", "Multimodal"].includes(r.service)
  )
    return (
      <Alert>
        This inquiry requires a CFA. Truck owners can quote on road and
        multimodal shipments.
      </Alert>
    );
  const total = costTotal(costs);
  function next() {
    if (
      step === 0 &&
      (!Number.isInteger(Number(days)) ||
        Number(days) < 1 ||
        !valid ||
        valid < new Date().toISOString().slice(0, 10))
    ) {
      setError(
        "Enter a positive whole-number transit time and a valid expiry date.",
      );
      return;
    }
    if (
      step === 1 &&
      (!(total > 0) ||
        Object.values(costs).some(
          (v) =>
            !Number.isFinite(v) ||
            v < 0 ||
            Math.abs(v * 100 - Math.round(v * 100)) > 0.00001,
        ))
    ) {
      setError(
        "Enter positive total charges using at most two decimal places. Individual charges cannot be negative.",
      );
      return;
    }
    if (step === 2 && !terms.trim()) {
      setError("Add service terms before continuing.");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await checked(
        supabase.from("bids").insert({
          rfq_id: id,
          provider_id: user?.id,
          company_id: company?.id,
          currency,
          amount: total,
          transit_days: Number(days),
          valid_until: valid,
          scope,
          freight_charges: costs.freight,
          customs_fees: costs.customs,
          inland_charges: costs.inland,
          other_charges: costs.other,
          inclusions,
          exclusions,
          terms,
          notes,
          status: "submitted",
        }),
      );
      navigate(`/provider/rfqs/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit quotation.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Submit your quotation"
        description={`${shortId(r.id)} · ${routeName(r)}`}
      />
      <Panel className="wizard-panel">
        <aside>
          <Stepper
            current={step}
            steps={[
              "Quote details",
              "Price & breakdown",
              "Service & terms",
              "Review & submit",
            ]}
          />
        </aside>
        <div className="wizard-content">
          {error && <Alert>{error}</Alert>}
          {step === 0 ? (
            <>
              <h2>A clear offer starts here.</h2>
              <p>
                Set your service scope, estimated transit time and quotation
                validity.
              </p>
              <Select
                label="Delivery scope"
                value={scope}
                onChange={setScope}
                options={scopeOptions(r.service)}
              />
              <div className="two-columns">
                <Field
                  label="Estimated transit time (days)"
                  type="number"
                  min="1"
                  step="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  required
                />
                <Field
                  label="Valid until"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={valid}
                  onChange={(e) => setValid(e.target.value)}
                  required
                />
              </div>
            </>
          ) : step === 1 ? (
            <>
              <h2>Every charge, clearly explained.</h2>
              <Select
                label="Currency"
                value={currency}
                onChange={setCurrency}
                options={["USD", "TZS", "KES", "UGX", "RWF", "NGN"]}
              />
              <div className="two-columns">
                {(
                  [
                    ["freight", "Freight charges"],
                    ["customs", "Customs & clearance fees"],
                    ["inland", "Inland transportation"],
                    ["other", "Other charges"],
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={`${label} (${currency})`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={costs[key] || ""}
                    onChange={(e) =>
                      setCosts((c) => ({ ...c, [key]: Number(e.target.value) }))
                    }
                  />
                ))}
              </div>
              <div className="quote-total">
                <span>Total quotation</span>
                <strong>{money(total, currency)}</strong>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <h2>Set the right expectations.</h2>
              <label className="standalone-label">Included services</label>
              <div className="checkbox-grid">
                {[
                  "Ocean freight",
                  "Air freight",
                  "Road freight",
                  "Customs clearance",
                  "Inland trucking",
                  "Warehousing",
                  "Insurance",
                  "Documentation",
                ].map((s) => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      checked={inclusions.includes(s)}
                      onChange={(e) =>
                        setInclusions((v) =>
                          e.target.checked
                            ? [...v, s]
                            : v.filter((x) => x !== s),
                        )
                      }
                    />
                    {s}
                  </label>
                ))}
              </div>
              <TextArea
                label="Excluded charges"
                value={exclusions}
                onChange={setExclusions}
                placeholder="e.g. Import duties, VAT and demurrage"
              />
              <TextArea
                label="Service and payment terms *"
                value={terms}
                onChange={setTerms}
                required
                placeholder="Payment schedule, cancellation terms, assumptions and responsibilities"
              />
              <TextArea
                label="Additional comments"
                value={notes}
                onChange={setNotes}
              />
            </>
          ) : (
            <>
              <h2>Your quotation is ready for review.</h2>
              <QuoteComparison
                bids={[
                  {
                    id: "preview",
                    rfq_id: r.id,
                    provider_id: user?.id || "",
                    company_id: company?.id || "",
                    currency,
                    amount: total,
                    transit_days: Number(days),
                    notes,
                    status: "submitted",
                    created_at: new Date().toISOString(),
                    valid_until: valid,
                    scope,
                    inclusions,
                    exclusions,
                    terms,
                    freight_charges: costs.freight,
                    customs_fees: costs.customs,
                    inland_charges: costs.inland,
                    other_charges: costs.other,
                    companies: {
                      name: company?.name || "Your company",
                      verification_status: "verified",
                    },
                  },
                ]}
              />
            </>
          )}
          <div className="wizard-actions">
            <Button
              variant="ghost"
              onClick={() => (step ? setStep((s) => s - 1) : navigate(-1))}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={next}>
                Continue <ArrowRight size={16} />
              </Button>
            ) : (
              <Button busy={busy} onClick={() => void submit()}>
                Submit quotation <Send size={16} />
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
