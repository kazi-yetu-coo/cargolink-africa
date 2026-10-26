import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  ButtonLink,
  PageTitle,
  Panel,
  TextArea,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { modes } from "../lib/domain";
import { locations } from "../lib/locations";
import type { ShipmentDetails } from "../lib/types";
type AssistantResult = {
  reply: string;
  service: string;
  origin: string;
  destination: string;
  cargo: string;
  weight: number | null;
  volume: number | null;
  containers: string;
  date: string;
  requirements: string;
};
export function InquiryAssistant() {
  const { user } = useAuth(),
    navigate = useNavigate();
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<
      { role: "user" | "assistant"; content: string }[]
    >([
      {
        role: "assistant",
        content:
          "Tell me about your shipment. Where is it starting, where does it need to go, and what are you moving?",
      },
    ]),
    [result, setResult] = useState<AssistantResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send() {
    if (!input.trim()) return;
    if (!user) {
      setError(
        "Sign in to use AI-assisted inquiry extraction, or use the structured form without signing in.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const history = [
      ...messages,
      { role: "user" as const, content: input.trim() },
    ];
    setMessages(history);
    setInput("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: history.slice(-16) }),
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "AI service is not configured on this preview. You can complete the same inquiry in the structured form.",
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "The assistant is temporarily unavailable.",
        );
      setResult(data as AssistantResult);
      setMessages((v) => [...v, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to reach the assistant.",
      );
    } finally {
      setBusy(false);
    }
  }
  function review() {
    if (!result) return;
    const match = (q: string) =>
      locations.find(
        (l) =>
          `${l.name} ${l.code}`.toLowerCase().includes(q.toLowerCase()) &&
          q.length > 1,
      );
    const details: ShipmentDetails = {
      origin: match(result.origin),
      destination: match(result.destination),
      cargo: result.cargo,
      weight: result.weight ?? undefined,
      volume: result.volume ?? undefined,
      containers: result.containers,
      date: result.date,
      requirements: result.requirements,
      services: [],
      scope: "Door to door",
    };
    sessionStorage.setItem(
      "cargolink-inquiry",
      JSON.stringify({
        service: modes.includes(result.service)
          ? result.service
          : "Ocean Freight",
        details,
        notes: `User-provided route: ${result.origin} → ${result.destination}. Confirm exact locations before submitting.`,
      }),
    );
    navigate("/inquiry");
  }
  return (
    <main className="container content-page">
      <PageTitle
        eyebrow="CARGOLINK INQUIRY ASSISTANT"
        title="Your shipment, in your own words."
        description="Describe what you need. Review the structured inquiry before anything is submitted."
        actions={
          <ButtonLink to="/inquiry" variant="secondary">
            Use structured form <ArrowRight size={16} />
          </ButtonLink>
        }
      />
      <div className="assistant-grid">
        <Panel className="assistant-chat">
          <header>
            <span className="icon-tile">
              <Sparkles size={22} />
            </span>
            <div>
              <h3>CargoLink Assistant</h3>
              <small>AI-assisted inquiry preparation</small>
            </div>
          </header>
          <div className="assistant-history" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`message-bubble ${m.role === "user" ? "mine" : ""}`}
              >
                <p>{m.content}</p>
              </div>
            ))}
            {busy && (
              <div className="assistant-thinking">Preparing your inquiry…</div>
            )}
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="assistant-composer">
            <TextArea
              label="Describe your shipment"
              value={input}
              onChange={setInput}
              placeholder="I need to move a 40ft container of consumer goods from Shanghai to Dar es Salaam next month…"
              maxLength={3000}
            />
            <Button
              busy={busy}
              onClick={() => void send()}
              disabled={!input.trim()}
            >
              <Send size={17} />
              Send
            </Button>
          </div>
        </Panel>
        <div>
          <Panel>
            <div className="eyebrow">YOUR INQUIRY SUMMARY</div>
            <h2>A clear view of your next move.</h2>
            {result ? (
              <dl className="detail-grid single">
                {[
                  ["Service", result.service],
                  ["Origin", result.origin],
                  ["Destination", result.destination],
                  ["Cargo", result.cargo],
                  [
                    "Weight",
                    result.weight ? `${result.weight} kg` : "Not yet specified",
                  ],
                  ["Ready date", result.date || "Not yet specified"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "Not yet specified"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                Your route, cargo and service details will appear here as the
                conversation develops.
              </p>
            )}
            <Button className="full" disabled={!result} onClick={review}>
              Review structured inquiry <ArrowRight size={16} />
            </Button>
          </Panel>
          <div className="security-note">
            <ShieldCheck size={24} />
            <div>
              <strong>You stay in control.</strong>
              <p>
                The assistant prepares a draft. You confirm locations, details
                and dates before submitting.
              </p>
            </div>
          </div>
          {!user && (
            <Panel>
              <CheckCircle2 className="text-green" />
              <h3>Ready to start?</h3>
              <p>
                AI-assisted preparation requires an account. The structured form
                is available to everyone.
              </p>
              <Link className="text-link" to="/auth/sign-in">
                Sign in <ArrowRight size={15} />
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}
