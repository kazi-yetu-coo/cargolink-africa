import { useState } from "react";
import {
  Bell,
  Building2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileText,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import { Alert, Button, ButtonLink, Loading, Logo } from "./ui";
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user, role } = useAuth();
  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="public-nav">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/routes">Routes</NavLink>
            <NavLink to="/for-businesses">For businesses</NavLink>
            <NavLink to="/for-providers">For providers</NavLink>
            <NavLink to="/resources">Resources</NavLink>
          </nav>
          <div className="nav-actions">
            {user ? (
              <ButtonLink to={`/${role}`}>
                My dashboard <ChevronRight size={15} />
              </ButtonLink>
            ) : (
              <>
                <Link to="/auth/sign-in">Sign in</Link>
                <ButtonLink to="/auth/sign-up">
                  Get started <ChevronRight size={15} />
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div>
          <Logo />
          <p>Connecting cargo. Connecting Africa.</p>
        </div>
        <div>
          <Link to="/about">About us</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/help">Help centre</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <small>© {new Date().getFullYear()} CargoLink Africa</small>
      </footer>
    </div>
  );
}
export function AuthLayout() {
  return (
    <div className="auth-shell">
      <header>
        <Logo />
        <Link to="/">
          Back to website <ChevronRight size={15} />
        </Link>
      </header>
      <Outlet />
      <footer>
        Connecting cargo. Connecting Africa.{" "}
        <Link to="/privacy">Privacy policy</Link>
      </footer>
    </div>
  );
}
export function Protected({ allow }: { allow: Role[] }) {
  const { user, company, role, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="narrow">
        <Alert>{error}</Alert>
        <Button onClick={() => void refresh()}>Retry account connection</Button>
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={`/auth/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (company?.suspended)
    return (
      <div className="narrow">
        <Alert>
          Your company account is suspended. Contact support for a review.
        </Alert>
        <ButtonLink to="/contact">Contact support</ButtonLink>
      </div>
    );
  if (!company && role !== "admin")
    return <Navigate to="/onboarding" replace />;
  if (!allow.includes(role)) return <Navigate to={`/${role}`} replace />;
  return <Outlet />;
}
export function DashboardLayout({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const { company, user, signOut } = useAuth();
  const navigate = useNavigate();
  const base = `/${role}`;
  const links =
    role === "customer"
      ? [
          [base, "Dashboard", LayoutDashboard],
          [`${base}/rfqs/new`, "Create RFQ", Plus],
          [`${base}/rfqs`, "My RFQs", FileText],
          [`${base}/shipments`, "My shipments", Package],
          [`${base}/quotes`, "Quotations", ClipboardList],
          [`${base}/messages`, "Messages", MessageSquare],
          [`${base}/saved-providers`, "Saved providers", Heart],
        ]
      : role === "provider"
        ? [
            [base, "Dashboard", LayoutDashboard],
            [`${base}/marketplace`, "Find opportunities", Search],
            [`${base}/bids`, "My quotations", FileText],
            [`${base}/jobs`, "Awarded jobs", Truck],
            [`${base}/messages`, "Messages", MessageSquare],
            [`${base}/verification`, "Verification", ShieldCheck],
          ]
        : [
            [base, "Overview", LayoutDashboard],
            [`${base}/verifications`, "Verification queue", FileCheck2],
            [`${base}/accounts`, "Accounts", Users],
            [`${base}/rfqs`, "Marketplace records", ClipboardList],
            [`${base}/activity`, "Activity", Building2],
          ];
  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">
          {role === "admin"
            ? "ADMINISTRATION"
            : role === "provider"
              ? "PROVIDER WORKSPACE"
              : "CARGO OWNER WORKSPACE"}
        </div>
        <nav onClick={() => setOpen(false)}>
          {links.map(([path, label, Icon]) => {
            const I = Icon as typeof Menu;
            return (
              <NavLink
                key={String(path)}
                end={String(path) === base}
                to={String(path)}
              >
                <I size={18} />
                <span>{String(label)}</span>
              </NavLink>
            );
          })}
          <div className="nav-divider" />
          <NavLink to={`${base}/notifications`}>
            <Bell size={18} />
            Notifications
          </NavLink>
          <NavLink to={`${base}/profile`}>
            <Users size={18} />
            Company profile
          </NavLink>
          <NavLink to={`${base}/settings`}>
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <Link to="/help">
            <HelpCircle size={17} />
            Help & support
          </Link>
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
          <div className="sidebar-user">
            <span className="avatar">
              {company?.name?.slice(0, 2).toUpperCase() || "CA"}
            </span>
            <div>
              <strong>{company?.name || "Platform administrator"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </div>
      </aside>
      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}
      <div className="dashboard-body">
        <header className="dashboard-header">
          <div className="header-crumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span>
              {role === "customer"
                ? "Cargo owner"
                : role === "provider"
                  ? "Service provider"
                  : "Administrator"}
            </span>
            <ChevronRight size={14} />
            <strong>CargoLink workspace</strong>
          </div>
          <div className="actions">
            <span className="live-label">
              <span />
              Live workspace
            </span>
            <Link
              className="icon-button"
              aria-label="Notifications"
              to={`${base}/notifications`}
            >
              <Bell size={19} />
            </Link>
            <Link
              className="avatar small"
              aria-label="Company profile"
              to={`${base}/profile`}
            >
              {company?.name.slice(0, 1) || "A"}
            </Link>
          </div>
        </header>
        <main className="dashboard-main">
          <Outlet />
        </main>
        <footer className="dashboard-footer">
          CargoLink Africa <span>Built for the way Africa moves.</span>
        </footer>
      </div>
    </div>
  );
}
