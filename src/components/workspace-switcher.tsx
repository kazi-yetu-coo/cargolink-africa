import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { WorkspaceKind } from "../lib/types";
export function WorkspaceSwitcher() {
  const { isAdmin, workspace, switchWorkspace } = useAuth(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!isAdmin) return null;
  return (
    <div className="workspace-switcher">
      <label htmlFor="admin-workspace">
        {busy ? (
          <Loader2 size={15} className="spin" />
        ) : (
          <ShieldCheck size={15} />
        )}
        <span>Admin workspace</span>
      </label>
      <select
        id="admin-workspace"
        aria-label="Switch admin workspace"
        value={workspace || "admin"}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          setError("");
          try {
            const role = await switchWorkspace(e.target.value as WorkspaceKind);
            navigate(`/${role}`);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to switch workspace.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <option value="admin">Admin console</option>
        <option value="customer">Cargo Owner · review</option>
        <option value="cfa">CFA · review</option>
        <option value="trucker">Truck Owner · review</option>
      </select>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
