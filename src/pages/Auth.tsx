import { useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { checked, supabase } from "../lib/supabase";
import {
  Alert,
  Button,
  Field,
  Loading,
  Logo,
  Panel,
  Select,
} from "../components/ui";
function GoogleMark() {
  return <span className="google-mark">G</span>;
}
export function AuthPage({
  signup = false,
  reset = false,
  update = false,
}: {
  signup?: boolean;
  reset?: boolean;
  update?: boolean;
}) {
  const { user, company, role, isAdmin, loading, refresh } = useAuth(),
    [search] = useSearchParams(),
    navigate = useNavigate();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [reveal, setReveal] = useState(false),
    [accountType, setAccountType] = useState("shipper"),
    [providerKind, setProviderKind] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const next = search.get("next");
  const accountRole = accountType === "shipper" ? "shipper" : providerKind;
  useEffect(() => {
    if (user && (company || isAdmin) && !update && !reset) {
      const safeNext =
        next?.startsWith("/") &&
        !next.startsWith("//") &&
        (!next.startsWith("/customer") || role === "customer");
      navigate(safeNext ? next! : `/${role}`, { replace: true });
    } else if (user && !company && !isAdmin && !update && !reset)
      navigate("/onboarding", { replace: true });
  }, [user, company, role, isAdmin, next, navigate, update, reset]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (reset) {
        await checked(
          supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/auth/update-password`,
          }),
        );
        setSuccess(
          "If an account exists for that email, a password reset link is on its way.",
        );
        return;
      }
      if (update) {
        await checked(supabase.auth.updateUser({ password }));
        setSuccess("Password updated. You can continue to your dashboard.");
        return;
      }
      if (signup) {
        if (accountType === "provider" && !providerKind)
          throw new Error(
            "Choose Truck Owner / Road Haulage or CFA to continue.",
          );
        sessionStorage.setItem("cargolink-onboarding-role", accountRole);
        const data = await checked(
          supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name, requested_company_role: accountRole },
              emailRedirectTo: `${location.origin}/auth/callback`,
            },
          }),
        );
        if (!data.session) {
          setSuccess(
            "Check your email to confirm your account, then sign in to complete your company profile.",
          );
          return;
        }
      } else
        await checked(supabase.auth.signInWithPassword({ email, password }));
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Authentication could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  return (
    <main className="auth-main">
      <div className="auth-form">
        <div className="eyebrow">
          {signup
            ? "YOUR NEXT CHAPTER STARTS HERE"
            : "WELCOME TO CARGOLINK AFRICA"}
        </div>
        <h1>
          {reset
            ? "Forgot your password?"
            : update
              ? "Set a new password"
              : signup
                ? "Create your account"
                : "Welcome back."}
        </h1>
        <p>
          {reset
            ? "We’ll email you a secure link to reset it."
            : update
              ? "Choose a strong password to protect your account."
              : signup
                ? "Join a more connected way to move freight across Africa."
                : "Sign in to your CargoLink workspace."}
        </p>
        {!reset && !update && (
          <>
            <Button
              variant="social full"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  if (signup && accountType === "provider" && !providerKind)
                    throw new Error(
                      "Choose Truck Owner / Road Haulage or CFA before continuing with Google.",
                    );
                  if (signup)
                    sessionStorage.setItem(
                      "cargolink-onboarding-role",
                      accountRole,
                    );
                  await checked(
                    supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo: `${location.origin}/auth/callback`,
                      },
                    }),
                  );
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Google sign-in unavailable.",
                  );
                  setBusy(false);
                }
              }}
            >
              <GoogleMark />
              Continue with Google
            </Button>
            <div className="divider">or continue with email</div>
          </>
        )}
        <form onSubmit={submit}>
          {signup && (
            <Field
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={100}
            />
          )}
          {!update && (
            <Field
              label="Work email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          )}
          {!reset && (
            <div className="password-field">
              <Field
                label="Password"
                type={reveal ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete={
                  signup || update ? "new-password" : "current-password"
                }
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={reveal ? "Hide password" : "Show password"}
                onClick={() => setReveal(!reveal)}
              >
                {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          )}
          {!signup && !reset && !update && (
            <Link className="forgot" to="/auth/forgot-password">
              Forgot password?
            </Link>
          )}
          {signup && (
            <>
              <label className="standalone-label">I am a</label>
              <div className="role-cards">
                {[
                  ["shipper", "Cargo owner", "I need to move cargo", Box],
                  [
                    "provider",
                    "Service provider",
                    "I offer logistics services",
                    Truck,
                  ],
                ].map(([v, t, d, I]) => {
                  const Icon = I as typeof Box;
                  return (
                    <button
                      type="button"
                      key={String(v)}
                      className={accountType === v ? "selected" : ""}
                      onClick={() => {
                        setAccountType(String(v));
                        setError("");
                      }}
                    >
                      <Icon size={19} />
                      <strong>{String(t)}</strong>
                      <small>{String(d)}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {signup && accountType === "provider" && (
            <div className="provider-kind-section">
              <label className="standalone-label">
                What type of service provider are you? *
              </label>
              <div
                className="role-cards provider-kind"
                role="group"
                aria-label="Service provider type"
              >
                {[
                  [
                    "trucker",
                    "Truck Owner / Road Haulage",
                    "I own or operate trucks",
                  ],
                  [
                    "agent",
                    "Clearing & Forwarding Agent (CFA)",
                    "I arrange freight and customs clearance",
                  ],
                ].map(([value, title, description]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={providerKind === value}
                    className={providerKind === value ? "selected" : ""}
                    onClick={() => {
                      setProviderKind(value);
                      setError("");
                    }}
                  >
                    <Truck size={20} />
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <Alert>{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
          <Button className="full" type="submit" busy={busy}>
            {reset
              ? "Send reset link"
              : update
                ? "Update password"
                : signup
                  ? "Create account"
                  : "Sign in"}
            <ArrowRight size={17} />
          </Button>
        </form>
        {signup && (
          <p className="fine-print">
            By creating an account, you agree to our{" "}
            <Link to="/terms">Terms</Link> and{" "}
            <Link to="/privacy">Privacy policy</Link>.
          </p>
        )}
        <p className="auth-switch">
          {signup
            ? "Already have an account?"
            : reset || update
              ? "Ready to continue?"
              : "New to CargoLink?"}{" "}
          <Link
            to={signup || reset || update ? "/auth/sign-in" : "/auth/sign-up"}
          >
            {signup || reset || update ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <Link className="demo-link" to="/demo">
          <ShieldCheck size={15} />
          Explore the demonstration workspace
        </Link>
      </div>
      <div className="auth-visual">
        <div className="auth-visual-top">
          <Logo />
          <span>BUILT FOR AFRICAN TRADE</span>
        </div>
        <div className="auth-visual-copy">
          <h2>
            Great logistics starts
            <br />
            with the right connection.
          </h2>
          <p>
            One marketplace for the people
            <br />
            and businesses moving Africa forward.
          </p>
          <div className="auth-check">
            <CheckCircle2 />
            Verified logistics partners
          </div>
          <div className="auth-check">
            <CheckCircle2 />
            Clear quotations, informed decisions
          </div>
          <div className="auth-check">
            <CheckCircle2 />
            Your shipments, connected
          </div>
        </div>
        <div className="auth-photo" />
      </div>
    </main>
  );
}
export function AuthCallback() {
  const { user, loading, error, company, role, isAdmin } = useAuth();
  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (user)
    return (
      <Navigate to={company || isAdmin ? `/${role}` : "/onboarding"} replace />
    );
  return (
    <div className="narrow">
      <Alert>We could not complete sign-in. The link may have expired.</Alert>
      <Link to="/auth/sign-in">Return to sign in</Link>
    </div>
  );
}
export function Onboarding() {
  const { user, company, role, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0),
    [kind, setKind] = useState(
      sessionStorage.getItem("cargolink-onboarding-role") || "shipper",
    ),
    [cargo, setCargo] = useState("General cargo"),
    [name, setName] = useState(""),
    [country, setCountry] = useState("Tanzania"),
    [city, setCity] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const preferred =
      sessionStorage.getItem("cargolink-onboarding-role") ||
      user?.user_metadata?.requested_company_role;
    if (["shipper", "agent", "trucker"].includes(preferred)) setKind(preferred);
  }, [user?.id, user?.user_metadata?.requested_company_role]);
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth/sign-in" replace />;
  if (company) return <Navigate to={`/${role}`} replace />;
  return (
    <main className="onboarding-main">
      <Panel>
        <div className="eyebrow">LET’S GET YOU STARTED</div>
        <h1>
          {kind === "shipper"
            ? "Make room for your next move."
            : "Build your logistics business."}
        </h1>
        <p>Tell us a little about your business.</p>
        <div className="progress-line">
          <span style={{ width: `${((step + 1) / 2) * 100}%` }} />
        </div>
        <p className="fine-print">Step {step + 1} of 2</p>
        {step === 0 ? (
          <>
            <h3>How will you use CargoLink?</h3>
            <div className="role-cards">
              {[
                ["shipper", "Cargo owner"],
                ["agent", "Clearing & Forwarding Agent (CFA)"],
                ["trucker", "Truck Owner / Road Haulage"],
              ].map(([v, t]) => (
                <button
                  key={v}
                  className={kind === v ? "selected" : ""}
                  onClick={() => setKind(v)}
                >
                  <Truck size={22} />
                  <strong>{t}</strong>
                </button>
              ))}
            </div>
            {kind === "shipper" && (
              <>
                <h3>What do you usually ship?</h3>
                <div className="cargo-options">
                  {[
                    "General cargo",
                    "Containers",
                    "Project cargo",
                    "Perishables",
                    "Hazardous",
                    "Vehicles",
                  ].map((c) => (
                    <button
                      className={cargo === c ? "selected" : ""}
                      key={c}
                      onClick={() => setCargo(c)}
                    >
                      <Box size={22} />
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="form-actions">
              <Button onClick={() => setStep(1)}>
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const id = await checked(
                  supabase.rpc("register_company", {
                    p_name: name.trim(),
                    p_role: kind,
                  }),
                );
                await checked(
                  supabase.rpc("update_company_profile", {
                    p_company_id: id,
                    p_name: name.trim(),
                    p_country: country,
                    p_city: city,
                    p_services: kind === "trucker" ? ["Trucking"] : [],
                  }),
                );
                await refresh();
                sessionStorage.removeItem("cargolink-onboarding-role");
                navigate(kind === "shipper" ? "/customer" : "/provider");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to create your company.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={150}
            />
            <div className="two-columns">
              <Select
                label="Country"
                value={country}
                onChange={setCountry}
                options={[
                  "Tanzania",
                  "Kenya",
                  "Uganda",
                  "Rwanda",
                  "Nigeria",
                  "Ghana",
                  "South Africa",
                  "Ethiopia",
                  "Zambia",
                  "Other",
                ]}
              />
              <Field
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            {error && <Alert>{error}</Alert>}
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="submit" busy={busy}>
                Open my workspace <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        )}
      </Panel>
      <div className="onboarding-note">
        <ShieldCheck size={18} />
        Your business information helps us connect you with the right partners.
        Providers complete verification before submitting quotations.
      </div>
    </main>
  );
}
export function AuthConnection() {
  return (
    <div className="narrow">
      <Mail />
      <h2>Check your email</h2>
      <p>Use the secure link in your inbox to continue.</p>
    </div>
  );
}
