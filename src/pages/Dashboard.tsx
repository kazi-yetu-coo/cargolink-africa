import { useCallback, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  FileText,
  Heart,
  MessageSquare,
  Package,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { recordScope } from "../lib/review";
import { useAuth } from "../lib/auth";
import { checked, supabase } from "../lib/supabase";
import { useLoad } from "../lib/hooks";
import type { Bid, Company, RFQ } from "../lib/types";
import { formatDate, money, routeName, shortId } from "../lib/domain";
import { demoBids, demoCompanies, demoRFQs } from "../lib/demo";
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
  SearchInput,
  Status,
  Verified,
} from "../components/ui";
export function RFQTable({
  rfqs,
  base = "/customer",
  demo = false,
}: {
  rfqs: RFQ[];
  base?: string;
  demo?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Inquiry</th>
            <th>Route & cargo</th>
            <th>Service</th>
            <th>Status</th>
            <th>Created</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rfqs.map((r) => (
            <tr key={r.id}>
              <td>
                <Link
                  className="table-id"
                  to={demo ? `/demo/rfqs/${r.id}` : `${base}/rfqs/${r.id}`}
                >
                  {shortId(r.id)}
                </Link>
              </td>
              <td>
                <strong>{routeName(r)}</strong>
                <small>
                  {r.details.cargo ||
                    r.details.cargoType ||
                    "Cargo details in inquiry"}
                </small>
              </td>
              <td>{r.service}</td>
              <td>
                <Status value={r.status} />
              </td>
              <td>{formatDate(r.created_at)}</td>
              <td>
                <Link
                  className="icon-button"
                  aria-label={`View ${shortId(r.id)}`}
                  to={demo ? `/demo/rfqs/${r.id}` : `${base}/rfqs/${r.id}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Dashboard({ demo = false }: { demo?: boolean }) {
  const { user, company, role, isReview } = useAuth();
  const base = demo ? "/demo" : `/${role}`;
  const [tracking, setTracking] = useState(""),
    [trackingError, setTrackingError] = useState("");
  const navigate = useNavigate();
  const loader = useCallback(async () => {
    if (demo) return { rfqs: demoRFQs, bids: demoBids };
    if (!user) return { rfqs: [], bids: [] };
    let q = supabase
      .from("rfqs")
      .select("*")
      .order("created_at", { ascending: false });
    q = recordScope(q, isReview, user.id);
    if (role === "customer") q = q.eq("owner_id", user.id);
    if (isReview && role === "provider" && company?.role === "trucker")
      q = q.in("service", ["Trucking", "Multimodal"]);
    let bidQuery = recordScope(
      supabase
        .from("bids")
        .select("*,companies(name,verification_status)")
        .order("created_at", { ascending: false }),
      isReview,
      user.id,
    );
    if (role === "provider") bidQuery = bidQuery.eq("company_id", company?.id);
    const [rfqs, bids] = await Promise.all([checked(q), checked(bidQuery)]);
    return { rfqs: rfqs as RFQ[], bids: bids as Bid[] };
  }, [demo, user, role, isReview, company?.id, company?.role]);
  const { data, error, loading, reload } = useLoad(loader);
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Alert>{error}</Alert>
        <Button onClick={() => void reload()}>Retry</Button>
      </>
    );
  const rfqs = data?.rfqs || [],
    bids = data?.bids || [];
  const name = demo
    ? "John"
    : String(user?.user_metadata?.full_name || company?.name || "there").split(
        " ",
      )[0];
  const stats =
    role === "provider" && !demo
      ? [
          [
            FileText,
            "Open opportunities",
            rfqs.filter((r) => r.status === "open").length,
            "green",
          ],
          [MessageSquare, "Quotations sent", bids.length, "blue"],
          [
            Truck,
            "Awarded jobs",
            bids.filter((b) => b.status === "awarded").length,
            "purple",
          ],
          [
            ShieldCheck,
            "Verification",
            company?.verification_status || "pending",
            "green",
          ],
        ]
      : [
          [
            FileText,
            "Active RFQs",
            rfqs.filter((r) => r.status === "open").length,
            "green",
          ],
          [MessageSquare, "Quotes received", bids.length, "blue"],
          [
            Truck,
            "In progress",
            rfqs.filter((r) => r.status === "awarded").length,
            "purple",
          ],
          [
            CheckCheck,
            "Completed",
            rfqs.filter((r) => r.status === "completed").length,
            "green",
          ],
        ];
  return (
    <>
      {demo && (
        <Alert tone="info">
          <strong>Demonstration workspace.</strong> All records below are sample
          data. Live accounts and records are kept separate.{" "}
          <Link to="/auth/sign-up">Create a real account</Link>
        </Alert>
      )}
      <PageTitle
        title={`Welcome back, ${name}.`}
        description="Here’s what’s happening with your shipments today."
        actions={
          <ButtonLink
            to={
              role === "provider" && !demo
                ? "/provider/marketplace"
                : demo
                  ? "/inquiry"
                  : "/customer/rfqs/new"
            }
          >
            <Plus size={17} />
            {role === "provider" && !demo ? "Find opportunities" : "Create RFQ"}
          </ButtonLink>
        }
      />
      <div className="stat-grid">
        {stats.map(([I, label, value, tone]) => {
          const Icon = I as typeof FileText;
          return (
            <Panel key={String(label)} className="stat-card">
              <span className={`icon-tile ${String(tone)}`}>
                <Icon size={21} />
              </span>
              <div>
                <strong>{String(value)}</strong>
                <small>{String(label)}</small>
              </div>
            </Panel>
          );
        })}
      </div>
      {role === "provider" &&
        !demo &&
        company?.verification_status !== "verified" && (
          <Alert tone="info">
            Complete business verification to submit quotations.{" "}
            <Link to="/provider/verification">
              Start verification <ArrowRight size={13} />
            </Link>
          </Alert>
        )}
      <div className="dashboard-columns">
        <Panel className="table-panel">
          <div className="panel-heading">
            <div>
              <h2>
                {role === "provider" && !demo
                  ? "Latest opportunities"
                  : "Recent inquiries"}
              </h2>
              <p>Your next move, at a glance.</p>
            </div>
            <Link
              className="text-link"
              to={
                demo
                  ? "/demo/rfqs"
                  : role === "provider"
                    ? "/provider/marketplace"
                    : "/customer/rfqs"
              }
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>
          {rfqs.length ? (
            <RFQTable rfqs={rfqs.slice(0, 5)} base={base} demo={demo} />
          ) : (
            <Empty
              title="Your next shipment starts here"
              description="Create an inquiry and start receiving quotations from logistics providers."
              action={
                <ButtonLink to="/inquiry">
                  Create an RFQ <Plus size={16} />
                </ButtonLink>
              }
            />
          )}
        </Panel>
        <div className="dashboard-rail">
          <Panel>
            <span className="icon-tile">
              <Package size={22} />
            </span>
            <h3>Find your shipment</h3>
            <p>
              Enter an inquiry ID to view its latest provider-reported status.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const r = rfqs.find(
                  (r) =>
                    r.id.toLowerCase() === tracking.toLowerCase() ||
                    shortId(r.id).toLowerCase() === tracking.toLowerCase(),
                );
                if (r) {
                  navigate(
                    demo ? `/demo/rfqs/${r.id}` : `${base}/rfqs/${r.id}`,
                  );
                } else
                  setTrackingError("No accessible inquiry matches that ID.");
              }}
            >
              <Field
                label="Inquiry ID"
                placeholder="RFQ-…"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" className="full">
                View status <ArrowRight size={15} />
              </Button>
            </form>
            {trackingError && (
              <small className="field-error">{trackingError}</small>
            )}
          </Panel>
          <div className="help-card">
            <Badge tone="outline">HERE TO HELP</Badge>
            <h3>
              A little support.
              <br />A lot of possibility.
            </h3>
            <p>Find answers to keep your next shipment moving.</p>
            <Link to="/help">
              Visit the help centre <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
      <div className="workspace-tip">
        <ShieldCheck size={18} />
        <span>
          Make informed decisions. Check service scope, validity and inclusions
          before awarding a quotation.
        </span>
      </div>
    </>
  );
}
export function RFQList({
  market = false,
  demo = false,
}: {
  market?: boolean;
  demo?: boolean;
}) {
  const { user, role, company, isReview } = useAuth();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [service, setService] = useState("all");
  const loader = useCallback(async () => {
    if (demo) return demoRFQs;
    let q = supabase
      .from("rfqs")
      .select("*")
      .order("created_at", { ascending: false });
    q = recordScope(q, isReview, user?.id);
    if (isReview && market && company?.role === "trucker")
      q = q.in("service", ["Trucking", "Multimodal"]);
    if (market) q = q.eq("status", "open");
    else q = q.eq("owner_id", user?.id);
    return (await checked(q)) as RFQ[];
  }, [demo, market, user?.id, isReview, company?.role]);
  const { data, error, loading, reload } = useLoad(loader);
  const rows = (data || []).filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (service === "all" || r.service === service) &&
      `${routeName(r)} ${shortId(r.id)} ${r.details.cargo || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={market ? "Find your next opportunity" : "My freight inquiries"}
        description={
          market
            ? "Discover shipment requests available to your provider account."
            : "Every inquiry, from first draft to awarded shipment."
        }
        actions={
          !market && (
            <ButtonLink to={demo ? "/inquiry" : "/customer/rfqs/new"}>
              <Plus size={17} />
              Create RFQ
            </ButtonLink>
          )
        }
      />
      {demo && <Alert tone="info">Sample records · demonstration only</Alert>}
      <Panel className="table-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search route, cargo or inquiry ID"
          />
          <div className="actions">
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["all", "draft", "open", "awarded", "completed", "closed"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Filter by service"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="all">All services</option>
              {[...new Set(data?.map((r) => r.service))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="panel-pad">
            <Alert>{error}</Alert>
            <Button onClick={() => void reload()}>Retry</Button>
          </div>
        ) : rows.length ? (
          <RFQTable rfqs={rows} base={`/${role}`} demo={demo} />
        ) : (
          <Empty
            title="No matching inquiries"
            description={
              market
                ? "New requests will appear here when cargo owners publish eligible inquiries."
                : "Create an inquiry or change your filters to see results."
            }
          />
        )}
        <div className="table-footer">
          {rows.length} {rows.length === 1 ? "inquiry" : "inquiries"} ·{" "}
          {demo
            ? "Sample records"
            : isReview
              ? "Private review records"
              : "Live records"}
        </div>
      </Panel>
    </>
  );
}
export function QuotesList() {
  const { user, role, company, isReview } = useAuth();
  const loader = useCallback(async () => {
    const q = recordScope(
      supabase
        .from("bids")
        .select("*,companies(name,verification_status)")
        .order("created_at", { ascending: false }),
      isReview,
      user?.id,
    );
    return (await checked(
      role === "provider"
        ? q.eq("provider_id", user?.id).eq("company_id", company?.id)
        : q,
    )) as Bid[];
  }, [user?.id, role, isReview, company?.id]);
  const { data, error, loading } = useLoad(loader);
  return (
    <>
      <PageTitle
        title={role === "provider" ? "My quotations" : "Received quotations"}
        description="Detailed prices, clear service scopes and your next connections."
      />
      <Panel className="table-panel">
        {loading ? (
          <Loading />
        ) : error ? (
          <Alert>{error}</Alert>
        ) : data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Inquiry</th>
                  <th>Total</th>
                  <th>Transit</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.companies?.name || "Provider"}</strong>
                    </td>
                    <td>{shortId(b.rfq_id)}</td>
                    <td>{money(b.amount, b.currency)}</td>
                    <td>{b.transit_days} days</td>
                    <td>{b.scope || "Not specified"}</td>
                    <td>
                      <Status value={b.status} />
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        to={`/${role}/rfqs/${b.rfq_id}`}
                      >
                        View <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No quotations yet"
            description={
              role === "provider"
                ? "Find a relevant inquiry and submit a quotation after business verification."
                : "Quotations will appear here when providers respond to your inquiries."
            }
            action={
              <ButtonLink
                to={
                  role === "provider"
                    ? "/provider/marketplace"
                    : "/customer/rfqs"
                }
                variant="secondary"
              >
                {role === "provider"
                  ? "Find opportunities"
                  : "View my inquiries"}
                <ArrowRight size={15} />
              </ButtonLink>
            }
          />
        )}
      </Panel>
    </>
  );
}
export function Shipments() {
  const { user, role, company, isReview } = useAuth();
  const loader = useCallback(async () => {
    let q = supabase
      .from("rfqs")
      .select("*")
      .in("status", ["awarded", "completed"])
      .order("created_at", { ascending: false });
    q = recordScope(q, isReview, user?.id);
    if (role === "customer") q = q.eq("owner_id", user?.id);
    const rows = (await checked(q)) as RFQ[];
    if (role === "provider") {
      const bids = await checked(
        supabase
          .from("bids")
          .select("rfq_id")
          .eq("company_id", company?.id)
          .eq("provider_id", user?.id)
          .eq("status", "awarded"),
      );
      return rows.filter((r) => bids?.some((b) => b.rfq_id === r.id));
    }
    return rows;
  }, [user?.id, role, isReview, company?.id]);
  const { data, error, loading } = useLoad(loader);
  return (
    <>
      <PageTitle
        title={role === "provider" ? "Awarded jobs" : "My shipments"}
        description="Follow each shipment from award to delivery. Milestones are reported by your provider."
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : data?.length ? (
        <div className="two-columns">
          {data.map((r) => (
            <Panel key={r.id}>
              <div className="between">
                <Badge>{shortId(r.id)}</Badge>
                <Status value={r.status} />
              </div>
              <h2>{routeName(r)}</h2>
              <p>
                {r.service} · {r.details.cargo}
              </p>
              <div className="shipment-progress">
                <span />
                <span />
                <span className={r.progress === "Delivered" ? "" : "pending"} />
              </div>
              <div className="between">
                <strong>{r.progress || "Awaiting pickup"}</strong>
                <Link className="text-link" to={`/${role}/rfqs/${r.id}`}>
                  Manage shipment <ArrowRight size={15} />
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            title="Your next journey is ahead"
            description="Awarded inquiries will appear here so you can follow shipment progress."
          />
        </Panel>
      )}
    </>
  );
}
export function Providers({
  saved = false,
  demo = false,
}: {
  saved?: boolean;
  demo?: boolean;
}) {
  const { user, isReview } = useAuth();
  const [search, setSearch] = useState(""),
    [feedback, setFeedback] = useState("");
  const loader = useCallback(async () => {
    if (demo) return demoCompanies;
    if (saved) {
      const records = await checked(
        supabase
          .from("saved_providers")
          .select("company_id")
          .eq("user_id", user?.id),
      );
      if (!records?.length) return [];
      return (await checked(
        recordScope(
          supabase
            .from("companies")
            .select("*")
            .in(
              "id",
              records.map((r) => r.company_id),
            ),
          isReview,
          user?.id,
        ),
      )) as Company[];
    }
    return (await checked(
      recordScope(
        supabase
          .from("companies")
          .select("*")
          .eq("verification_status", "verified")
          .eq("suspended", false),
        isReview,
        user?.id,
      ),
    )) as Company[];
  }, [demo, saved, user?.id, isReview]);
  const { data, error, loading, reload } = useLoad(loader);
  return (
    <>
      <PageTitle
        title={saved ? "Saved providers" : "Find your logistics partner"}
        description="Connect with businesses that understand your cargo and your route."
      />
      {feedback && <Alert tone="success">{feedback}</Alert>}
      <div className="provider-search">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search providers by name or country"
        />
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : data?.length ? (
        <div className="three-columns">
          {data
            .filter((c) =>
              `${c.name} ${c.country}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((c) => (
              <Panel key={c.id}>
                <div className="provider-avatar">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <h2>{c.name}</h2>
                <Verified />
                <p>
                  {c.city || "Location not specified"}
                  {c.country ? `, ${c.country}` : ""}
                </p>
                <div className="tag-list">
                  {(c.services || []).map((s) => (
                    <Badge key={s} tone="gray">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="actions">
                  <ButtonLink variant="secondary" to={`/providers/${c.id}`}>
                    View profile <ArrowUpRight size={14} />
                  </ButtonLink>
                  {user && !demo && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          if (saved)
                            await checked(
                              supabase
                                .from("saved_providers")
                                .delete()
                                .eq("user_id", user.id)
                                .eq("company_id", c.id),
                            );
                          else
                            await checked(
                              supabase
                                .from("saved_providers")
                                .upsert({ user_id: user.id, company_id: c.id }),
                            );
                          setFeedback(
                            saved
                              ? "Provider removed."
                              : "Provider saved to your workspace.",
                          );
                          if (saved) await reload();
                        } catch (e) {
                          setFeedback(
                            e instanceof Error ? e.message : "Unable to save.",
                          );
                        }
                      }}
                    >
                      <Heart size={17} />
                      {saved ? "Remove" : "Save"}
                    </Button>
                  )}
                </div>
              </Panel>
            ))}
        </div>
      ) : (
        <Panel>
          <Empty
            title={
              saved
                ? "Keep your best connections close"
                : "No providers available yet"
            }
            description={
              saved
                ? "Save verified providers from their profiles to find them here."
                : "Verified businesses will appear here once approved."
            }
            action={
              saved && (
                <ButtonLink to="/providers" variant="secondary">
                  Browse providers <ArrowRight size={15} />
                </ButtonLink>
              )
            }
          />
        </Panel>
      )}
    </>
  );
}
