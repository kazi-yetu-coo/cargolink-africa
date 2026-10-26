import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Heart,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
  TextArea,
  Verified,
} from "../components/ui";
import { recordScope } from "../lib/review";
import { useAuth } from "../lib/auth";
import { useLoad } from "../lib/hooks";
import { checked, supabase } from "../lib/supabase";
import { modes, shortId } from "../lib/domain";
import type {
  Bid,
  Company,
  Message,
  Notification,
  RFQ,
  Verification,
} from "../lib/types";
import { demoCompanies } from "../lib/demo";
export function Messages() {
  const { isReview } = useAuth();
  return isReview ? (
    <>
      <PageTitle
        title="Messages"
        description="Private shipment conversations"
      />
      <Panel>
        <Empty
          title="Review messaging"
          description="Role review uses your single administrator sign-in. Private messages are available between separate live cargo owner and provider accounts."
        />
      </Panel>
    </>
  ) : (
    <LiveMessages />
  );
}
function LiveMessages() {
  const { user } = useAuth(),
    [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const loader = useCallback(async () => {
    const [rfqs, bids, messages] = await Promise.all([
      checked(
        supabase
          .from("rfqs")
          .select("*")
          .order("created_at", { ascending: false }),
      ),
      checked(
        supabase.from("bids").select("*,companies(name,verification_status)"),
      ),
      checked(supabase.from("messages").select("*").order("created_at")),
    ]);
    return {
      rfqs: rfqs as RFQ[],
      bids: bids as Bid[],
      messages: messages as Message[],
    };
  }, []);
  const { data, error: loadError, loading, reload } = useLoad(loader);
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => void reload(),
      )
      .subscribe();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 30000);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, reload]);
  const conversations = (data?.bids || []).flatMap((b) => {
    const r = data?.rfqs.find((r) => r.id === b.rfq_id);
    if (!r) return [];
    const owner = r.owner_id === user?.id;
    return [
      {
        id: `${r.id}:${owner ? b.provider_id : r.owner_id}`,
        rfq: r,
        peer: owner ? b.provider_id : r.owner_id,
        name: owner ? b.companies?.name || "Logistics provider" : "Cargo owner",
        bid: b,
      },
    ];
  });
  const current =
    conversations.find(
      (c) =>
        c.rfq.id === params.get("rfq") &&
        (!params.get("peer") || c.peer === params.get("peer")),
    ) || conversations[0];
  const msgs = (data?.messages || []).filter(
    (m) =>
      m.rfq_id === current?.rfq.id &&
      ((m.sender_id === user?.id && m.recipient_id === current.peer) ||
        (m.recipient_id === user?.id && m.sender_id === current.peer)),
  );
  return (
    <>
      <PageTitle
        title="Messages"
        description="Every shipment conversation, in one connected workspace."
      />
      {loadError && <Alert>{loadError}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Panel className="messaging-panel">
        <aside>
          <div className="conversation-search">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search conversations"
            />
          </div>
          {loading && !data ? (
            <Loading />
          ) : (
            conversations
              .filter((c) =>
                c.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.id}
                  className={`conversation ${c.id === current?.id ? "active" : ""}`}
                  onClick={() => {
                    setParams({ rfq: c.rfq.id, peer: c.peer });
                    setBody("");
                    setError("");
                  }}
                >
                  <span className="avatar">
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      {shortId(c.rfq.id)} · {c.rfq.service}
                    </small>
                  </span>
                  <ArrowRight size={13} />
                </button>
              ))
          )}
          {!conversations.length && !loading && (
            <Empty
              title="No conversations yet"
              description="Conversations become available after a quotation is submitted."
            />
          )}
        </aside>
        <div className="conversation-main">
          {current ? (
            <>
              <header>
                <span className="avatar">
                  {current.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{current.name}</strong>
                  <small>
                    {shortId(current.rfq.id)} · Private conversation
                  </small>
                </div>
                <Badge tone="gray">
                  <ShieldCheck size={13} />
                  Participants only
                </Badge>
              </header>
              <div className="message-history" aria-live="polite">
                {msgs.length ? (
                  msgs.map((m) => (
                    <div
                      className={`message-bubble ${m.sender_id === user?.id ? "mine" : ""}`}
                      key={m.id}
                    >
                      <p>{m.body}</p>
                      <small>
                        {new Date(m.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </div>
                  ))
                ) : (
                  <div className="conversation-start">
                    <MessageSquare size={30} />
                    <h3>Start the conversation.</h3>
                    <p>
                      Clarify cargo requirements, service scope and delivery
                      arrangements.
                    </p>
                  </div>
                )}
              </div>
              <form
                className="message-composer"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!body.trim()) return;
                  setBusy(true);
                  setError("");
                  try {
                    await checked(
                      supabase.from("messages").insert({
                        rfq_id: current.rfq.id,
                        sender_id: user?.id,
                        recipient_id: current.peer,
                        body: body.trim(),
                      }),
                    );
                    setBody("");
                    await reload();
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Message could not be sent.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <textarea
                  aria-label="Your message"
                  placeholder="Write a message…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={4000}
                  required
                />
                <Button
                  type="submit"
                  aria-label="Send message"
                  busy={busy}
                  disabled={!body.trim()}
                >
                  <Send size={18} />
                </Button>
              </form>
            </>
          ) : (
            <Empty
              title="Your connections start here"
              description="Choose a conversation to discuss a shipment with your logistics partner."
            />
          )}
        </div>
      </Panel>
    </>
  );
}
export function Notifications() {
  const { user, role, isReview } = useAuth();
  const [filter, setFilter] = useState("All"),
    [error, setError] = useState("");
  const loader = useCallback(
    async () =>
      (await checked(
        recordScope(
          supabase.from("notifications").select("*"),
          isReview,
          user?.id,
        )
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
      )) as Notification[],
    [user?.id, isReview],
  );
  const { data, error: loadError, loading, reload } = useLoad(loader);
  useEffect(() => {
    const ch = supabase
      .channel(`notifications-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        () => void reload(),
      )
      .subscribe();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 30000);
    return () => {
      void supabase.removeChannel(ch);
      clearInterval(interval);
    };
  }, [user?.id, reload]);
  const rows = (data || []).filter(
    (n) =>
      filter === "All" ||
      (filter === "Unread" && !n.read_at) ||
      (filter === "Quotes" && /quot|bid/i.test(n.title)) ||
      (filter === "Messages" && /message/i.test(n.title)) ||
      (filter === "Shipments" && /shipment|award/i.test(n.title)),
  );
  async function mark(id?: string) {
    try {
      let q = recordScope(
        supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("user_id", user?.id),
        isReview,
        user?.id,
      );
      q = id ? q.eq("id", id) : q.is("read_at", null);
      await checked(q);
      await reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to mark notifications.",
      );
    }
  }
  return (
    <>
      <PageTitle
        title="Notifications"
        description="The latest updates from your CargoLink connections."
        actions={
          <Button variant="secondary" onClick={() => void mark()}>
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        }
      />
      {(error || loadError) && <Alert>{error || loadError}</Alert>}
      <Panel className="notifications-panel">
        <div className="detail-tabs">
          {["All", "Unread", "Quotes", "Messages", "Shipments"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : rows.length ? (
          <div>
            {rows.map((n) => (
              <article
                className={`notification-row ${n.read_at ? "" : "unread"}`}
                key={n.id}
              >
                <span className="icon-tile">
                  {/message/i.test(n.title) ? (
                    <Mail size={19} />
                  ) : (
                    <Bell size={19} />
                  )}
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small>{new Date(n.created_at).toLocaleString()}</small>
                </div>
                <div className="actions">
                  {n.rfq_id && (
                    <Link
                      className="text-link"
                      to={`/${role}/rfqs/${n.rfq_id}`}
                      onClick={() => void mark(n.id)}
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  )}
                  {!n.read_at && (
                    <button
                      className="icon-button"
                      aria-label={`Mark ${n.title} as read`}
                      onClick={() => void mark(n.id)}
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="You’re all caught up"
            description="New quotations, messages and shipment updates will appear here."
          />
        )}
      </Panel>
    </>
  );
}
export function VerificationPage() {
  const { user, company } = useAuth();
  const [registration, setRegistration] = useState(""),
    [email, setEmail] = useState(user?.email || ""),
    [phone, setPhone] = useState(""),
    [links, setLinks] = useState(""),
    [notes, setNotes] = useState(""),
    [files, setFiles] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const loader = useCallback(async () => {
    const data = (await checked(
      supabase
        .from("verification_requests")
        .select("*")
        .eq("company_id", company?.id)
        .maybeSingle(),
    )) as Verification | null;
    if (data) {
      setRegistration(data.registration_number);
      setEmail(data.contact_email);
      setPhone(data.contact_phone);
      setLinks(data.document_links);
      setNotes(data.details);
    }
    const listed = await checked(
      supabase.storage.from("verification-documents").list(user?.id || ""),
    );
    setFiles(
      (listed || [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => `${user?.id}/${f.name}`),
    );
    return data;
  }, [company?.id, user?.id]);
  const { data, error: loadError, loading, reload } = useLoad(loader);
  const reviewed = !!data?.reviewed_at;
  return (
    <>
      <PageTitle
        title="Verify your business"
        description="Build trust. Get verified. Connect with more opportunities."
        actions={<Status value={company?.verification_status || "pending"} />}
      />
      {feedback && <Alert tone="success">{feedback}</Alert>}
      {(error || loadError) && <Alert>{error || loadError}</Alert>}
      <div className="verification-grid">
        <Panel>
          <div className="between">
            <h2>Business information</h2>
            <ShieldCheck className="text-green" size={25} />
          </div>
          <p>
            Submit accurate, verifiable details for the operations team to
            review.
          </p>
          {loading ? (
            <Loading />
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const values = {
                    company_id: company?.id,
                    submitted_by: user?.id,
                    registration_number: registration.trim(),
                    contact_email: email.trim(),
                    contact_phone: phone.trim(),
                    document_links: links.trim(),
                    details: notes.trim(),
                  };
                  if (data)
                    await checked(
                      supabase
                        .from("verification_requests")
                        .update({
                          registration_number: values.registration_number,
                          contact_email: values.contact_email,
                          contact_phone: values.contact_phone,
                          document_links: values.document_links,
                          details: values.details,
                        })
                        .eq("company_id", company?.id),
                    );
                  else
                    await checked(
                      supabase.from("verification_requests").insert(values),
                    );
                  setFeedback(
                    "Your verification request has been submitted for administrator review.",
                  );
                  await reload();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to submit verification.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field
                label="Business registration number *"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                required
                disabled={reviewed}
                maxLength={100}
              />
              <div className="two-columns">
                <Field
                  label="Contact email *"
                  value={email}
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={reviewed}
                />
                <Field
                  label="Contact phone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={reviewed}
                  maxLength={40}
                />
              </div>
              <TextArea
                label="Supporting document links (optional)"
                value={links}
                onChange={setLinks}
                placeholder="Secure links accessible to the reviewing team"
              />
              <TextArea
                label="Business details / notes"
                value={notes}
                onChange={setNotes}
              />
              {reviewed ? (
                <Alert tone="info">
                  This submission has been reviewed. Contact support if you need
                  to amend it or request a new review.
                </Alert>
              ) : (
                <Button type="submit" busy={busy}>
                  Submit for review <ArrowRight size={16} />
                </Button>
              )}
            </form>
          )}
        </Panel>
        <div>
          <Panel>
            <h2>Supporting documents</h2>
            <p>
              Business registration, tax certificate and relevant operating
              licences.
            </p>
            <label className="upload-area">
              <Upload size={25} />
              <strong>
                {uploading ? "Uploading securely…" : "Choose a document"}
              </strong>
              <small>PDF, PNG or JPEG · up to 5 MB each</small>
              <input
                aria-label="Upload verification document"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                disabled={uploading || reviewed}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 5 * 1024 * 1024 ||
                    !["application/pdf", "image/png", "image/jpeg"].includes(
                      file.type,
                    )
                  ) {
                    setError("Upload a PDF, PNG or JPEG under 5 MB.");
                    return;
                  }
                  setUploading(true);
                  setError("");
                  try {
                    const path = `${user?.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                    await checked(
                      supabase.storage
                        .from("verification-documents")
                        .upload(path, file, {
                          contentType: file.type,
                          upsert: false,
                        }),
                    );
                    setFiles((v) => [...v, path]);
                    setFeedback("Document uploaded to private storage.");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Upload failed.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {files.map((path) => (
              <div className="document-row" key={path}>
                <FileCheck2 size={19} />
                <span>{path.split("/").pop()?.slice(37) || "Document"}</span>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const d = await checked(
                        supabase.storage
                          .from("verification-documents")
                          .createSignedUrl(path, 60),
                      );
                      if (!d) throw new Error("Document unavailable");
                      window.open(d.signedUrl, "_blank", "noopener,noreferrer");
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to open document.",
                      );
                    }
                  }}
                >
                  View <ExternalLink size={13} />
                </Button>
              </div>
            ))}
          </Panel>
          <div className="security-note">
            <ShieldCheck size={23} />
            <div>
              <strong>Your documents are private.</strong>
              <p>
                Only your company account and authorised platform administrators
                can access verification documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export function Profile({ settings = false }: { settings?: boolean }) {
  const { user, company, refresh, role } = useAuth();
  const [name, setName] = useState(company?.name || ""),
    [country, setCountry] = useState(company?.country || ""),
    [city, setCity] = useState(company?.city || ""),
    [services, setServices] = useState<string[]>(company?.services || []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  return (
    <>
      <PageTitle
        title={settings ? "Account settings" : "Company profile"}
        description={
          settings
            ? "Manage your account and sign-in preferences."
            : "Help your connections get to know your business."
        }
      />
      {error && <Alert>{error}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}
      <div className="profile-grid">
        <Panel>
          <span className="provider-avatar">
            {company?.name.slice(0, 2).toUpperCase() || "CA"}
          </span>
          <h2>{company?.name || "Platform administrator"}</h2>
          <p>{user?.email}</p>
          <Status value={company?.verification_status || "administrator"} />
          <div className="profile-meta">
            <span>
              <Building2 size={16} />
              {company?.role === "shipper"
                ? "Cargo owner"
                : role === "admin"
                  ? "Administrator"
                  : "Service provider"}
            </span>
            <span>
              <ShieldCheck size={16} />
              Protected CargoLink account
            </span>
          </div>
        </Panel>
        <Panel>
          {settings ? (
            <>
              <h2>Sign-in & security</h2>
              <Field label="Account email" value={user?.email || ""} readOnly />
              <p>Use a password reset link to change your password securely.</p>
              <Button
                busy={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await checked(
                      supabase.auth.resetPasswordForEmail(user?.email || "", {
                        redirectTo: `${location.origin}/auth/update-password`,
                      }),
                    );
                    setFeedback("Password reset email sent.");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to send reset email.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Send password reset <Mail size={16} />
              </Button>
              <hr />
              <h3>Notifications</h3>
              <p>
                Quotation, message and shipment notifications are available in
                your workspace.
              </p>
              <ButtonLink variant="secondary" to={`/${role}/notifications`}>
                View notifications <Bell size={16} />
              </ButtonLink>
              <hr />
              <h3>Data requests</h3>
              <p>
                For account access, corrections or deletion requests, contact
                the operations team.
              </p>
              <ButtonLink variant="ghost" to="/contact">
                Contact support <ArrowRight size={15} />
              </ButtonLink>
            </>
          ) : company ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await checked(
                    supabase.rpc("update_company_profile", {
                      p_company_id: company.id,
                      p_name: name.trim(),
                      p_country: country,
                      p_city: city,
                      p_services: services,
                    }),
                  );
                  await refresh();
                  setFeedback("Company profile updated.");
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to update profile.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Business details</h2>
              <Field
                label="Company name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={150}
                required
              />
              <div className="two-columns">
                <Field
                  label="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={100}
                />
                <Field
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={100}
                />
              </div>
              {company.role !== "shipper" && (
                <>
                  <label className="standalone-label">Services offered</label>
                  <div className="checkbox-grid">
                    {modes.map((s) => (
                      <label key={s}>
                        <input
                          type="checkbox"
                          checked={services.includes(s)}
                          onChange={(e) =>
                            setServices((v) =>
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
                </>
              )}
              <Button type="submit" busy={busy}>
                Save changes <CheckCircle2 size={16} />
              </Button>
            </form>
          ) : (
            <p>
              Your administrator access is managed by the platform operator.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
export function ProviderProfile() {
  const { id } = useParams(),
    { user, company, role } = useAuth();
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const loader = useCallback(async () => {
    if (id?.startsWith("demo-"))
      return demoCompanies.find((c) => c.id === id) || null;
    return (await checked(
      supabase.from("companies").select("*").eq("id", id).single(),
    )) as Company;
  }, [id]);
  const { data: c, error: loadError, loading } = useLoad(loader);
  if (loading) return <Loading />;
  if (loadError || !c)
    return (
      <div className="container content-page">
        <Alert>{loadError || "Provider not found."}</Alert>
        <ButtonLink to="/providers">Browse providers</ButtonLink>
      </div>
    );
  return (
    <main className="container content-page">
      <PageTitle
        title={c.name}
        description={`${c.city || "Location not specified"}${c.country ? `, ${c.country}` : ""}`}
        actions={
          c.verification_status === "verified" ? (
            <Verified />
          ) : (
            <Status value={c.verification_status} />
          )
        }
      />
      {id?.startsWith("demo-") && (
        <Alert tone="info">This provider profile is sample data.</Alert>
      )}
      {c.review_owner_id && (
        <Alert tone="info">
          Private administrator review provider. This company is excluded from
          the live provider directory.
        </Alert>
      )}
      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="two-columns">
        <Panel>
          <span className="provider-avatar">
            {c.name.slice(0, 2).toUpperCase()}
          </span>
          <h2>Business overview</h2>
          <p>
            {c.role === "trucker"
              ? "Road transport provider"
              : "Freight forwarding and logistics provider"}
          </p>
          <h3>Services</h3>
          <div className="tag-list">
            {c.services?.length ? (
              c.services.map((s) => (
                <Badge tone="gray" key={s}>
                  {s}
                </Badge>
              ))
            ) : (
              <p>Service capabilities are confirmed per quotation.</p>
            )}
          </div>
          <div className="profile-meta">
            <span>
              <ShieldCheck size={16} />
              {c.verification_status === "verified"
                ? "Business verification completed"
                : "Verification pending"}
            </span>
            <span>
              <FileText size={16} />
              Review service terms in each quotation
            </span>
          </div>
        </Panel>
        <Panel>
          <h2>Start your next connection.</h2>
          <p>
            Publish your shipment requirements to receive detailed quotations
            from eligible providers.
          </p>
          <ButtonLink
            to={
              role === "customer" && company ? "/customer/rfqs/new" : "/inquiry"
            }
          >
            Create an inquiry <ArrowRight size={16} />
          </ButtonLink>
          {user && !id?.startsWith("demo-") && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await checked(
                    supabase
                      .from("saved_providers")
                      .upsert({ user_id: user.id, company_id: c.id }),
                  );
                  setMessage("Provider saved to your workspace.");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to save provider.",
                  );
                }
              }}
            >
              <Heart size={16} />
              Save provider
            </Button>
          )}
        </Panel>
      </div>
    </main>
  );
}
