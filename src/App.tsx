import { Automation } from "./components/platform-benefits";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import {
  AuthLayout,
  DashboardLayout,
  Protected,
  PublicLayout,
} from "./components/layouts";
import { Alert, Button, Logo, Loading } from "./components/ui";
const Contact = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.Contact })),
);
const ContentPage = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.ContentPage })),
);
const Home = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.Home })),
);
const NotFound = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.NotFound })),
);
const AuthCallback = lazy(() =>
  import("./pages/Auth").then((m) => ({ default: m.AuthCallback })),
);
const AuthPage = lazy(() =>
  import("./pages/Auth").then((m) => ({ default: m.AuthPage })),
);
const Onboarding = lazy(() =>
  import("./pages/Auth").then((m) => ({ default: m.Onboarding })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Providers = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Providers })),
);
const QuotesList = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.QuotesList })),
);
const RFQList = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.RFQList })),
);
const Shipments = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Shipments })),
);
const Trucks = lazy(() =>
  import("./pages/Trucks").then((m) => ({ default: m.Trucks })),
);
const RFQEditor = lazy(() =>
  import("./pages/RFQEditor").then((m) => ({ default: m.RFQEditor })),
);
const RFQDetail = lazy(() =>
  import("./pages/RFQDetail").then((m) => ({ default: m.RFQDetail })),
);
const SubmitBid = lazy(() =>
  import("./pages/RFQDetail").then((m) => ({ default: m.SubmitBid })),
);
const InquiryAssistant = lazy(() =>
  import("./pages/Assistant").then((m) => ({ default: m.InquiryAssistant })),
);
const Messages = lazy(() =>
  import("./pages/Shared").then((m) => ({ default: m.Messages })),
);
const Notifications = lazy(() =>
  import("./pages/Shared").then((m) => ({ default: m.Notifications })),
);
const Profile = lazy(() =>
  import("./pages/Shared").then((m) => ({ default: m.Profile })),
);
const ProviderProfile = lazy(() =>
  import("./pages/Shared").then((m) => ({ default: m.ProviderProfile })),
);
const VerificationPage = lazy(() =>
  import("./pages/Shared").then((m) => ({ default: m.VerificationPage })),
);
const AdminAccounts = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminAccounts })),
);
const AdminActivity = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminActivity })),
);
const AdminDashboard = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminDashboard })),
);
const AdminRecords = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminRecords })),
);
const AdminVerifications = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminVerifications })),
);
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: Error, info: ErrorInfo) {
    console.error("tuShip render error", e, info.componentStack);
  }
  render() {
    return this.state.error ? (
      <div className="narrow">
        <Logo />
        <h1>Let’s get you moving again.</h1>
        <Alert>
          This page could not be displayed. Reload the workspace to continue.
        </Alert>
        <Button onClick={() => location.reload()}>Reload tuShip</Button>
        <Link to="/">Return home</Link>
      </div>
    ) : (
      this.props.children
    );
  }
}
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function DashboardRedirect() {
  const { user, role } = useAuth();
  return <Navigate to={user ? `/${role}` : "/auth/sign-in"} replace />;
}
function DemoLayout() {
  return (
    <div className="demo-shell">
      <header className="demo-header">
        <Logo />
        <div>
          <Link to="/demo">Overview</Link>
          <Link to="/demo/rfqs">Inquiries</Link>
          <Link to="/demo/providers">Providers</Link>
          <Link to="/auth/sign-up" className="button">
            Create live account
          </Link>
        </div>
      </header>
      <main className="container section">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<Dashboard demo />} />
            <Route path="rfqs" element={<RFQList demo />} />
            <Route path="rfqs/:id" element={<RFQDetail demo />} />
            <Route path="providers" element={<Providers demo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
export default function App() {
  return (
    <Boundary>
      <BrowserRouter>
        <AuthProvider>
          <ScrollReset />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="automation" element={<Automation />} />
                {[
                  "services",
                  "routes",
                  "for-businesses",
                  "for-providers",
                  "resources",
                  "about",
                  "help",
                  "terms",
                  "privacy",
                ].map((page) => (
                  <Route
                    key={page}
                    path={page}
                    element={<ContentPage page={page} />}
                  />
                ))}
                <Route path="contact" element={<Contact />} />
                <Route
                  path="providers"
                  element={
                    <div className="container content-page">
                      <Providers />
                    </div>
                  }
                />
                <Route path="providers/:id" element={<ProviderProfile />} />
                <Route path="inquiry" element={<RFQEditor />} />
                <Route
                  path="inquiry/assistant"
                  element={<InquiryAssistant />}
                />
              </Route>
              <Route element={<AuthLayout />}>
                <Route path="auth/sign-in" element={<AuthPage />} />
                <Route path="auth/sign-up" element={<AuthPage signup />} />
                <Route
                  path="auth/forgot-password"
                  element={<AuthPage reset />}
                />
                <Route
                  path="auth/update-password"
                  element={<AuthPage update />}
                />
                <Route path="auth/callback" element={<AuthCallback />} />
                <Route path="onboarding" element={<Onboarding />} />
              </Route>
              <Route element={<Protected allow={["customer"]} />}>
                <Route
                  path="customer"
                  element={<DashboardLayout role="customer" />}
                >
                  <Route index element={<Dashboard />} />
                  <Route path="rfqs" element={<RFQList />} />
                  <Route path="rfqs/new" element={<RFQEditor />} />
                  <Route path="rfqs/:id" element={<RFQDetail />} />
                  <Route path="rfqs/:id/edit" element={<RFQEditor />} />
                  <Route
                    path="rfqs/:id/compare"
                    element={<RFQDetail compare />}
                  />
                  <Route path="quotes" element={<QuotesList />} />
                  <Route path="shipments" element={<Shipments />} />
                  <Route path="saved-providers" element={<Providers saved />} />
                  <Route path="trucks" element={<Trucks />} />
                  {sharedRoutes()}
                </Route>
              </Route>
              <Route element={<Protected allow={["provider"]} />}>
                <Route
                  path="provider"
                  element={<DashboardLayout role="provider" />}
                >
                  <Route index element={<Dashboard />} />
                  <Route path="marketplace" element={<RFQList market />} />
                  <Route
                    path="rfqs"
                    element={<Navigate to="/provider/marketplace" replace />}
                  />
                  <Route path="rfqs/:id" element={<RFQDetail />} />
                  <Route path="rfqs/:id/bid" element={<SubmitBid />} />
                  <Route path="bids" element={<QuotesList />} />
                  <Route path="jobs" element={<Shipments />} />
                  <Route path="verification" element={<VerificationPage />} />
                  <Route path="trucks" element={<Trucks manage />} />
                  {sharedRoutes()}
                </Route>
              </Route>
              <Route element={<Protected allow={["admin"]} />}>
                <Route path="admin" element={<DashboardLayout role="admin" />}>
                  <Route index element={<AdminDashboard />} />
                  <Route
                    path="verifications"
                    element={<AdminVerifications />}
                  />
                  <Route path="accounts" element={<AdminAccounts />} />
                  <Route path="rfqs" element={<AdminRecords />} />
                  <Route path="rfqs/:id" element={<RFQDetail />} />
                  <Route path="activity" element={<AdminActivity />} />
                  {sharedRoutes()}
                </Route>
              </Route>
              <Route path="demo/*" element={<DemoLayout />} />
              <Route path="dashboard" element={<DashboardRedirect />} />
              <Route path="*" element={<PublicLayout />}>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </Boundary>
  );
}
function sharedRoutes() {
  return (
    <>
      <Route path="messages" element={<Messages />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<Profile settings />} />
    </>
  );
}
