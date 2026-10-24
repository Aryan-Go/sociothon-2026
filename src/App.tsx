import { lazy, Suspense, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { Logo, ToastViewport } from "./components/ui";
import { ROLE_META } from "./navigation";
import { AppStoreProvider, useAppStore } from "./store/AppStore";
import type { Role } from "./types";

const UserDashboard = lazy(() =>
  import("./pages/user/UserDashboard").then((module) => ({ default: module.UserDashboard })),
);
const ScanPage = lazy(() =>
  import("./pages/user/ScanPage").then((module) => ({ default: module.ScanPage })),
);
const LeaderboardPage = lazy(() =>
  import("./pages/user/LeaderboardPage").then((module) => ({
    default: module.LeaderboardPage,
  })),
);
const ActivityPage = lazy(() =>
  import("./pages/user/ActivityPage").then((module) => ({ default: module.ActivityPage })),
);
const AdminOverview = lazy(() =>
  import("./pages/admin/AdminOverview").then((module) => ({ default: module.AdminOverview })),
);
const AdminSubmissions = lazy(() =>
  import("./pages/admin/AdminSubmissions").then((module) => ({
    default: module.AdminSubmissions,
  })),
);
const AdminCollectors = lazy(() =>
  import("./pages/admin/AdminCollectors").then((module) => ({
    default: module.AdminCollectors,
  })),
);
const AdminUsers = lazy(() =>
  import("./pages/admin/AdminUsers").then((module) => ({ default: module.AdminUsers })),
);
const AdminAnalytics = lazy(() =>
  import("./pages/admin/AdminAnalytics").then((module) => ({
    default: module.AdminAnalytics,
  })),
);
const CollectorDashboard = lazy(() =>
  import("./pages/collector/CollectorDashboard").then((module) => ({
    default: module.CollectorDashboard,
  })),
);
const CollectorIntake = lazy(() =>
  import("./pages/collector/CollectorIntake").then((module) => ({
    default: module.CollectorIntake,
  })),
);
const CollectorProducts = lazy(() =>
  import("./pages/collector/CollectorProducts").then((module) => ({
    default: module.CollectorProducts,
  })),
);
const CollectorImpact = lazy(() =>
  import("./pages/collector/CollectorImpact").then((module) => ({
    default: module.CollectorImpact,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);
  return null;
}

function SessionSync() {
  const { session } = useAuth();
  const {
    state,
    setRole,
    setCurrentCollector,
    setCurrentUser,
  } = useAppStore();

  useEffect(() => {
    if (!session || !state) return;
    if (state.currentRole !== session.role) setRole(session.role);
    if (
      session.role === "collector" &&
      session.collectorId &&
      state.currentCollectorId !== session.collectorId
    ) {
      setCurrentCollector(session.collectorId);
    }
    if (session.role === "user") {
      const member =
        state.users.find(
          (user) => user.email.toLowerCase() === session.email.toLowerCase(),
        ) ?? state.users[0];
      if (member && state.currentUserId !== member.id) {
        setCurrentUser(member.id);
      }
    }
  }, [session, state, setRole, setCurrentCollector, setCurrentUser]);

  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function RoleRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) {
    return <Navigate to={ROLE_META[session.role].dashboard} replace />;
  }
  return <>{children}</>;
}

function RoleHome() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_META[session.role].dashboard} replace />;
}

function NotFound() {
  return (
    <div className="not-found">
      <Logo />
      <span className="eyebrow">404 · Off the loop</span>
      <h1>This route never made it to the recycling bin.</h1>
      <p>The page you are looking for does not exist in this workspace.</p>
      <Link to="/app/user" className="btn btn--primary btn--md">
        Return to dashboard
      </Link>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Logo />
      <div className="loading-screen__ring">
        <span />
        <span />
        <span />
      </div>
      <p>Opening your circular workspace…</p>
      <div className="loading-screen__bar">
        <span />
      </div>
      <small>Loading local impact ledger</small>
    </div>
  );
}

function AppRoutes() {
  const { hydrated } = useAppStore();
  const { ready } = useAuth();
  if (!hydrated || !ready) return <LoadingScreen />;

  return (
    <>
      <ScrollToTop />
      <SessionSync />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<RoleHome />} />
          <Route
            path="user"
            element={
              <RoleRoute role="user">
                <UserDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="scan"
            element={
              <RoleRoute role="user">
                <ScanPage />
              </RoleRoute>
            }
          />
          <Route
            path="leaderboard"
            element={
              <RoleRoute role="user">
                <LeaderboardPage />
              </RoleRoute>
            }
          />
          <Route
            path="activity"
            element={
              <RoleRoute role="user">
                <ActivityPage />
              </RoleRoute>
            }
          />
          <Route
            path="admin"
            element={
              <RoleRoute role="admin">
                <AdminOverview />
              </RoleRoute>
            }
          />
          <Route
            path="admin/submissions"
            element={
              <RoleRoute role="admin">
                <AdminSubmissions />
              </RoleRoute>
            }
          />
          <Route
            path="admin/collectors"
            element={
              <RoleRoute role="admin">
                <AdminCollectors />
              </RoleRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <RoleRoute role="admin">
                <AdminUsers />
              </RoleRoute>
            }
          />
          <Route
            path="admin/analytics"
            element={
              <RoleRoute role="admin">
                <AdminAnalytics />
              </RoleRoute>
            }
          />
          <Route
            path="collector"
            element={
              <RoleRoute role="collector">
                <CollectorDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="collector/intake"
            element={
              <RoleRoute role="collector">
                <CollectorIntake />
              </RoleRoute>
            }
          />
          <Route
            path="collector/products"
            element={
              <RoleRoute role="collector">
                <CollectorProducts />
              </RoleRoute>
            }
          />
          <Route
            path="collector/impact"
            element={
              <RoleRoute role="collector">
                <CollectorImpact />
              </RoleRoute>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ToastViewport />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <AppStoreProvider>
          <AppRoutes />
        </AppStoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
