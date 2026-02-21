import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AppNotFound from "@/pages/AppNotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CreditsProvider } from "./contexts/CreditsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "sonner";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ChatBuilder from "./pages/ChatBuilder";
import ApiKeys from "./pages/ApiKeys";
import Playground from "./pages/Playground";
import Usage from "./pages/Usage";
import Credits from "./pages/Credits";
import Wallet from "./pages/Wallet";
import Billing from "./pages/Billing";
import BillingPlans from "./pages/BillingPlans";
import Settings from "./pages/Settings";
import AdminTools from "./pages/AdminTools";
import { useEffect } from "react";
import { logApiBaseUrlOnce } from "./lib/api";
import CosmicBackground from "./components/CosmicBackground";

function ApiKeysRoute() {
  return <ApiKeys />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path={"/"} component={Home} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/docs"} component={Docs} />
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />

      {/* Protected App Routes - explicit full paths */}
      <Route path={"/app/dashboard"}>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path={"/app/projects/:id/ai"}>
        <AppLayout>
          <ChatBuilder />
        </AppLayout>
      </Route>
      <Route path={"/app/projects/:id/keys"}>
        <AppLayout>
          <ApiKeysRoute />
        </AppLayout>
      </Route>
      <Route path={"/app/projects/:id/playground"}>
        <AppLayout>
          <Playground />
        </AppLayout>
      </Route>
      <Route path={"/app/projects/:id"}>
        <AppLayout>
          <ProjectDetail />
        </AppLayout>
      </Route>
      <Route path={"/app/projects"}>
        <AppLayout>
          <Projects />
        </AppLayout>
      </Route>
      <Route path={"/app/playground"}>
        <AppLayout>
          <Playground />
        </AppLayout>
      </Route>
      <Route path={"/app/usage"}>
        <AppLayout>
          <Usage />
        </AppLayout>
      </Route>
      <Route path={"/app/billing/credits"}>
        <AppLayout>
          <Wallet />
        </AppLayout>
      </Route>
      <Route path={"/app/billing/plans"}>
        <AppLayout>
          <BillingPlans />
        </AppLayout>
      </Route>
      <Route path={"/app/settings"}>
        <AppLayout>
          <Settings />
        </AppLayout>
      </Route>
      <Route path={"/app/admin/tools"}>
        <AppLayout>
          <AdminTools />
        </AppLayout>
      </Route>
      <Route path={"/app/chatbuilder"}>
        <AppLayout>
          <Redirect to={"/app/projects"} />
        </AppLayout>
      </Route>
      <Route path={"/app"}>
        <AppLayout>
          <Redirect to={"/app/dashboard"} />
        </AppLayout>
      </Route>
      {/* Catch-all: unknown /app/* -> AppNotFound (not public 404) */}
      <Route path={"/app/*"}>
        <AppLayout>
          <AppNotFound />
        </AppLayout>
      </Route>

      {/* Legacy Routes (protected) */}
      <Route path={"/dashboard"}>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path={"/chat-builder"}>
        <AppLayout>
          <Redirect to={"/app/projects"} />
        </AppLayout>
      </Route>
      <Route path={"/credits"}>
        <AppLayout>
          <Credits />
        </AppLayout>
      </Route>

      <Route path={"/404"} component={NotFound} />
      {/* NotFound MUST be last */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  useEffect(() => {
    logApiBaseUrlOnce();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <AuthProvider>
          <CreditsProvider>
            <TooltipProvider>
            <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            expand
            closeButton
            style={{
              '--sonner-color-success': '#c0c0c0',
              '--sonner-color-error': '#dc2626',
              '--sonner-color-warning': '#f59e0b',
              '--sonner-color-info': '#3b82f6',
              '--sonner-color-background': '#0b0e12',
              '--sonner-color-border': 'rgba(255,255,255,0.06)',
              '--sonner-color-text': 'rgba(255,255,255,0.92)',
            } as any}
            />
            <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607]">
              <CosmicBackground />
              <div className="relative z-10">
                <Router />
              </div>
            </div>
            </TooltipProvider>
          </CreditsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
