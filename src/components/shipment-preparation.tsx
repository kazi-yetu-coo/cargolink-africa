import { useCallback, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { Alert, Button, Loading, Panel } from "./ui";
import { useLoad } from "../lib/hooks";
import { checked, supabase } from "../lib/supabase";
import { preparationItems } from "../lib/preparation";
import type { RFQ } from "../lib/types";

export function ShipmentPreparation({ rfq }: { rfq: RFQ }) {
  const loader = useCallback(
    async () =>
      await checked(
        supabase
          .from("shipment_preparation")
          .select("completed,email_requested")
          .eq("rfq_id", rfq.id)
          .maybeSingle(),
      ),
    [rfq.id],
  );
  const { data, loading, error, reload } = useLoad(loader);
  if (loading) return <Loading />;
  if (error)
    return (
      <Panel>
        <Alert>{error}</Alert>
        <Button onClick={() => void reload()}>Retry checklist</Button>
      </Panel>
    );
  return (
    <PreparationForm
      key={`${rfq.id}-${JSON.stringify(data)}`}
      rfq={rfq}
      initial={data}
    />
  );
}
function PreparationForm({
  rfq,
  initial,
}: {
  rfq: RFQ;
  initial: { completed: string[]; email_requested: boolean } | null;
}) {
  const [completed, setCompleted] = useState(initial?.completed || []),
    [email, setEmail] = useState(initial?.email_requested || false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const items = preparationItems(rfq);
  async function save() {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await checked(
        supabase.rpc("save_shipment_preparation", {
          p_rfq: rfq.id,
          p_completed: completed,
          p_email_requested: email,
        }),
      );
      setFeedback(
        email
          ? "Progress and email preference saved. Email delivery is awaiting connection; no email has been sent."
          : "Checklist progress saved.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel className="preparation-panel">
      <div className="between">
        <h3>
          <FileCheck2 size={20} /> Shipment preparation
        </h3>
        <small>
          {items.filter((x) => completed.includes(x.id)).length} /{" "}
          {items.length} prepared
        </small>
      </div>
      <p>
        A starting checklist based on your transport mode and cargo. This is
        general guidance, not an AI-generated or complete customs determination.
        Your CFA must confirm current requirements for your route.
      </p>
      <div className="preparation-items">
        {items.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={completed.includes(item.id)}
              onChange={(e) => {
                setFeedback("");
                setCompleted((c) =>
                  e.target.checked
                    ? [...c, item.id]
                    : c.filter((x) => x !== item.id),
                );
              }}
            />
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="preparation-sources">
        Reference:{" "}
        <a
          href="https://www.trade.gov/common-export-documents"
          target="_blank"
          rel="noreferrer"
        >
          Common export documents
        </a>{" "}
        ·{" "}
        <a
          href="https://www.tradecommissioner.gc.ca/en/step-by-step-guide-exporting/resources/documentation-checklist.html"
          target="_blank"
          rel="noreferrer"
        >
          Documentation checklist
        </a>
        . These references provide examples, not the rules for every
        destination.
      </p>
      <label className="preparation-consent">
        <input
          type="checkbox"
          checked={email}
          onChange={(e) => {
            setEmail(e.target.checked);
            setFeedback("");
          }}
        />
        <span>
          I would like this shipment’s preparation guidance by email when
          delivery is available.
          <small>
            Email and tailored AI guidance are awaiting connection. You can
            change this preference here.
          </small>
        </span>
      </label>
      {error && <Alert>{error}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}
      <Button onClick={() => void save()} disabled={busy}>
        {busy ? "Saving…" : "Save checklist & preference"}
      </Button>
    </Panel>
  );
}
