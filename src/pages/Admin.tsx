import { useCallback, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ExternalLink,
  FileCheck2,
  FileText,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Empty,
  Loading,
  Modal,
  PageTitle,
  Panel,
  SearchInput,
  Status,
} from "../components/ui";
import { useLoad } from "../lib/hooks";
import { checked, supabase } from "../lib/supabase";
import { formatDate, routeName, shortId } from "../lib/domain";
import type { Bid, Company, RFQ, Verification } from "../lib/types";
type ActivityRow = {
  id: string;
  action: string;
  record_id: string;
  created_at: string;
};
type SupportRow = {
  id: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
};
export function AdminDashboard() {
  const loader = useCallback(async () => {
    const [companies, rfqs, bids, requests] = await Promise.all([
      checked(
        supabase.from("companies").select("*").is("review_owner_id", null),
      ),
      checked(
        supabase
          .from("rfqs")
          .select("*")
          .is("review_owner_id", null)
          .order("created_at", { ascending: false }),
      ),
      checked(supabase.from("bids").select("*").is("review_owner_id", null)),
      checked(
        supabase
          .from("verification_requests")
          .select("*")
          .is("reviewed_at", null),
      ),
    ]);
    return {
      companies: companies as Company[],
      rfqs: rfqs as RFQ[],
      bids: bids as Bid[],
      requests: (requests as Verification[]).filter((r) =>
        companies?.some((c) => c.id === r.company_id),
      ),
    };
  }, []);
  const { data, error, loading } = useLoad(loader);
  if (loading) return <Loading />;
  if (error || !data)
    return <Alert>{error || "Unable to load platform data."}</Alert>;
  const stats = [
    [Users, "Registered companies", data.companies.length],
    [
      ShieldCheck,
      "Verified providers",
      data.companies.filter(
        (c) => c.role !== "shipper" && c.verification_status === "verified",
      ).length,
    ],
    [
      FileText,
      "Open RFQs",
      data.rfqs.filter((r) => r.status === "open").length,
    ],
    [FileCheck2, "Pending reviews", data.requests.length],
  ];
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return {
      label: d.toLocaleDateString("en", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });
  const monthly = months.map((m) => ({
    ...m,
    rfqs: data.rfqs.filter(
      (r) =>
        new Date(r.created_at).getMonth() === m.month &&
        new Date(r.created_at).getFullYear() === m.year,
    ).length,
    bids: data.bids.filter(
      (b) =>
        new Date(b.created_at).getMonth() === m.month &&
        new Date(b.created_at).getFullYear() === m.year,
    ).length,
  }));
  const max = Math.max(1, ...monthly.flatMap((m) => [m.rfqs, m.bids]));
  const routes = Object.entries(
    data.rfqs.reduce<Record<string, number>>((acc, r) => {
      const key = routeName(r);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return (
    <>
      <PageTitle
        title="Platform overview"
        description="A clear picture of the tuShip marketplace."
        actions={
          <Badge tone="green">
            <span className="status-dot" />
            Live platform records
          </Badge>
        }
      />
      <div className="stat-grid">
        {stats.map(([I, label, value]) => {
          const Icon = I as typeof Users;
          return (
            <Panel className="stat-card" key={String(label)}>
              <span className="icon-tile">
                <Icon size={22} />
              </span>
              <div>
                <strong>{String(value)}</strong>
                <small>{String(label)}</small>
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="admin-columns">
        <Panel>
          <div className="panel-heading">
            <h2>Inquiries & quotations</h2>
            <div className="chart-legend">
              <span>Inquiries</span>
              <span>Quotations</span>
            </div>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={monthly
              .map(
                (m) =>
                  `${m.label}: ${m.rfqs} inquiries and ${m.bids} quotations`,
              )
              .join("; ")}
          >
            {monthly.map((m, i) => (
              <div key={`${m.label}-${i}`}>
                <div className="bars">
                  <span
                    style={{ height: `${(m.rfqs / max) * 100}%` }}
                    title={`${m.rfqs} inquiries`}
                  />
                  <span
                    style={{ height: `${(m.bids / max) * 100}%` }}
                    title={`${m.bids} quotations`}
                  />
                </div>
                <small>{m.label}</small>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Actual record counts for the last six calendar months.
          </p>
        </Panel>
        <Panel>
          <h2>Top routes</h2>
          {routes.length ? (
            <div className="simple-list">
              {routes.map(([route, count]) => (
                <div key={route}>
                  <strong>{route}</strong>
                  <Badge tone="gray">{count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No route activity yet" />
          )}
        </Panel>
      </div>
      <Panel>
        <div className="panel-heading">
          <h2>Verification queue</h2>
          <Link className="text-link" to="/admin/verifications">
            Review applications <ArrowRight size={15} />
          </Link>
        </div>
        {data.requests.length ? (
          <p>
            {data.requests.length} provider application
            {data.requests.length === 1 ? " is" : "s are"} waiting for review.
          </p>
        ) : (
          <Empty
            title="All reviews are up to date"
            description="New business verification submissions will appear in the review queue."
          />
        )}
      </Panel>
    </>
  );
}
export function AdminVerifications() {
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Verification | null>(null),
    [files, setFiles] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const loader = useCallback(
    async () =>
      (await checked(
        supabase
          .from("verification_requests")
          .select("*,companies(*)")
          .order("submitted_at", { ascending: false }),
      )) as Verification[],
    [],
  );
  const { data, error: loadError, loading, reload } = useLoad(loader);
  async function open(v: Verification) {
    setSelected(v);
    setFiles([]);
    setError("");
    try {
      const listed = await checked(
        supabase.storage.from("verification-documents").list(v.submitted_by),
      );
      setFiles(
        (listed || [])
          .filter((f) => f.name !== ".emptyFolderPlaceholder")
          .map((f) => `${v.submitted_by}/${f.name}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load documents.");
    }
  }
  async function review(status: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await checked(
        supabase.rpc("review_provider", {
          p_company_id: selected.company_id,
          p_status: status,
        }),
      );
      setFeedback(`Provider review saved: ${status}.`);
      setSelected(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Provider verification"
        description="Review business credentials before enabling provider quotations."
      />
      {feedback && <Alert tone="success">{feedback}</Alert>}
      {loadError && <Alert>{loadError}</Alert>}
      <Panel className="table-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search company or registration number"
          />
        </div>
        {loading ? (
          <Loading />
        ) : data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Registration</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((v) =>
                    `${v.companies?.name} ${v.registration_number}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((v) => (
                    <tr key={v.company_id}>
                      <td>
                        <strong>{v.companies?.name || "Company"}</strong>
                        <small>{v.contact_email}</small>
                      </td>
                      <td>{v.registration_number}</td>
                      <td>{formatDate(v.submitted_at)}</td>
                      <td>
                        <Status
                          value={v.companies?.verification_status || "pending"}
                        />
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          onClick={() => void open(v)}
                        >
                          Review <ArrowRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No applications to review"
            description="Submitted verification requests will appear here."
          />
        )}
      </Panel>
      {selected && (
        <Modal
          title={`Review ${selected.companies?.name || "provider"}`}
          onClose={() => !busy && setSelected(null)}
        >
          {error && <Alert>{error}</Alert>}
          <dl className="detail-grid">
            {[
              ["Business registration", selected.registration_number],
              ["Contact email", selected.contact_email],
              ["Contact phone", selected.contact_phone],
              ["Submitted", formatDate(selected.submitted_at)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h3>Business details</h3>
          <p>{selected.details || "No additional details."}</p>
          <h3>Document links</h3>
          {selected.document_links
            .split(/\s+/)
            .filter(Boolean)
            .map((url, i) =>
              /^https?:\/\//i.test(url) ? (
                <a
                  key={i}
                  className="document-link"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {url}
                  <ExternalLink size={13} />
                </a>
              ) : (
                <p key={i}>{url}</p>
              ),
            )}
          <h3>Private uploaded documents</h3>
          {files.length ? (
            files.map((path) => (
              <div className="document-row" key={path}>
                <FileCheck2 size={18} />
                <span>{path.split("/").pop()?.slice(37)}</span>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const signed = await checked(
                        supabase.storage
                          .from("verification-documents")
                          .createSignedUrl(path, 60),
                      );
                      if (!signed) throw new Error("Document unavailable");
                      window.open(
                        signed.signedUrl,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to open document.",
                      );
                    }
                  }}
                >
                  Open <ExternalLink size={13} />
                </Button>
              </div>
            ))
          ) : (
            <p>No uploaded documents found.</p>
          )}
          <div className="form-actions">
            <Button
              busy={busy}
              variant="danger"
              onClick={() => void review("rejected")}
            >
              <X size={16} />
              Reject
            </Button>
            <Button busy={busy} onClick={() => void review("verified")}>
              <Check size={16} />
              Approve provider
            </Button>
          </div>
          {selected.reviewed_at && (
            <Button variant="ghost" onClick={() => void review("pending")}>
              Reopen review for resubmission
            </Button>
          )}
        </Modal>
      )}
    </>
  );
}
export function AdminAccounts() {
  const [search, setSearch] = useState(""),
    [target, setTarget] = useState<Company | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const loader = useCallback(
    async () =>
      (await checked(
        supabase
          .from("companies")
          .select("*")
          .is("review_owner_id", null)
          .order("created_at", { ascending: false }),
      )) as Company[],
    [],
  );
  const { data, error: loadError, loading, reload } = useLoad(loader);
  return (
    <>
      <PageTitle
        title="Marketplace accounts"
        description="Review company accounts and manage marketplace access."
      />
      {(error || loadError) && <Alert>{error || loadError}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}
      <Panel className="table-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search companies"
          />
        </div>
        {loading ? (
          <Loading />
        ) : data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Verification</th>
                  <th>Access</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <small>{c.country || "Country not specified"}</small>
                      </td>
                      <td>
                        {c.role === "shipper"
                          ? "Cargo owner"
                          : c.role === "agent"
                            ? "Forwarder / clearing agent"
                            : "Trucking company"}
                      </td>
                      <td>
                        <Status value={c.verification_status} />
                      </td>
                      <td>
                        <Badge tone={c.suspended ? "red" : "green"}>
                          {c.suspended ? "Suspended" : "Active"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant={c.suspended ? "secondary" : "ghost"}
                          onClick={() => setTarget(c)}
                        >
                          {c.suspended ? "Restore access" : "Suspend account"}
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No registered companies" />
        )}
      </Panel>
      {target && (
        <Modal
          title={
            target.suspended
              ? "Restore marketplace access?"
              : "Suspend this account?"
          }
          onClose={() => !busy && setTarget(null)}
        >
          <p>
            {target.suspended ? "Restore" : "Suspend"} access for{" "}
            <strong>{target.name}</strong>. This changes their ability to
            participate in marketplace workflows.
          </p>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={target.suspended ? "" : "danger"}
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await checked(
                    supabase.rpc("moderate_company", {
                      p_company_id: target.id,
                      p_suspended: !target.suspended,
                    }),
                  );
                  setFeedback("Account access updated.");
                  setTarget(null);
                  await reload();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to update account.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm {target.suspended ? "restoration" : "suspension"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function AdminRecords() {
  const [search, setSearch] = useState(""),
    [error, setError] = useState("");
  const loader = useCallback(
    async () =>
      (await checked(
        supabase
          .from("rfqs")
          .select("*")
          .is("review_owner_id", null)
          .order("created_at", { ascending: false }),
      )) as RFQ[],
    [],
  );
  const { data, error: loadError, loading, reload } = useLoad(loader);
  return (
    <>
      <PageTitle
        title="Marketplace records"
        description="Monitor inquiries and close records that require moderation."
      />
      {(error || loadError) && <Alert>{error || loadError}</Alert>}
      <Panel className="table-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search route or inquiry"
          />
        </div>
        {loading ? (
          <Loading />
        ) : data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Inquiry</th>
                  <th>Route</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((r) =>
                    `${routeName(r)} ${shortId(r.id)}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/admin/rfqs/${r.id}`}>{shortId(r.id)}</Link>
                      </td>
                      <td>{routeName(r)}</td>
                      <td>{r.service}</td>
                      <td>
                        <Status value={r.status} />
                      </td>
                      <td>
                        {["open", "draft"].includes(r.status) && (
                          <Button
                            variant="secondary"
                            onClick={async () => {
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
                            Close record
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No marketplace records" />
        )}
      </Panel>
    </>
  );
}
export function AdminActivity() {
  const [error, setError] = useState("");
  const loader = useCallback(async () => {
    const [activity, support] = await Promise.all([
      checked(
        supabase
          .from("marketplace_activity")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ),
      checked(
        supabase
          .from("support_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ),
    ]);
    return {
      activity: activity as ActivityRow[],
      support: support as SupportRow[],
    };
  }, []);
  const { data, error: loadError, loading, reload } = useLoad(loader);
  return (
    <>
      <PageTitle
        title="Activity & support"
        description="Recent marketplace operations and incoming support requests."
      />
      {(error || loadError) && <Alert>{error || loadError}</Alert>}
      {loading ? (
        <Loading />
      ) : (
        <>
          <Panel>
            <h2>Support requests</h2>
            {data?.support.length ? (
              data.support.map((s) => (
                <div className="support-item" key={s.id}>
                  <div className="between">
                    <strong>{s.email}</strong>
                    <Status value={s.status} />
                  </div>
                  <p>{s.message}</p>
                  <div className="between">
                    <small>{formatDate(s.created_at)}</small>
                    {s.status === "open" && (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await checked(
                              supabase
                                .from("support_requests")
                                .update({ status: "resolved" })
                                .eq("id", s.id),
                            );
                            await reload();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Unable to resolve.",
                            );
                          }
                        }}
                      >
                        Mark resolved <Check size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <Empty title="No support requests" />
            )}
          </Panel>
          <Panel>
            <h2>Marketplace activity</h2>
            {data?.activity.length ? (
              <div className="timeline">
                {data.activity.map((a) => (
                  <div key={a.id}>
                    <span>
                      <Activity size={16} />
                    </span>
                    <div>
                      <strong>{a.action}</strong>
                      <small>
                        {formatDate(a.created_at)} · {a.record_id?.slice(0, 8)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No recorded activity yet" />
            )}
          </Panel>
        </>
      )}
    </>
  );
}
