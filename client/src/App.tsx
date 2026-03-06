import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AppNotFound from "@/pages/AppNotFound";
import { Route, Switch, Redirect } from "wouter";
import * as Sentry from "@sentry/react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { CreditsProvider } from "./contexts/CreditsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import DocsSdk from "./pages/DocsSdk";
import DocsCli from "./pages/DocsCli";
import UseCases from "./pages/UseCases";
import Architecture from "./pages/Architecture";
import Security from "./pages/Security";
import Enterprise from "./pages/Enterprise";
import Status from "./pages/Status";
import Roadmap from "./pages/Roadmap";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ChatBuilder from "./pages/ChatBuilder";
import ApiKeys from "./pages/ApiKeys";
import Playground from "./pages/Playground";
import Usage from "./pages/Usage";
import Analytics from "./pages/Analytics";
import Credits from "./pages/Credits";
import Wallet from "./pages/Wallet";
import Billing from "./pages/Billing";
import BillingPlans from "./pages/BillingPlans";
import Settings from "./pages/Settings";
import Webhooks from "./pages/Webhooks";
import WebhookDeliveries from "./pages/WebhookDeliveries";
import Requests from "./pages/Requests";
import Templates from "./pages/Templates";
import AuditLogs from "./pages/AuditLogs";
import RequestDetail from "./pages/RequestDetail";
import AdminTools from "./pages/AdminTools";
import Workspaces from "./pages/Workspaces";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import WorkspaceInviteAccept from "./pages/WorkspaceInviteAccept";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { logApiBaseUrlOnce } from "./lib/api";
import CosmicBackground from "./components/CosmicBackground";
import DotGridBackground from "./components/DotGridBackground";

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
      <Route path={"/use-cases"} component={UseCases} />
      <Route path={"/architecture"} component={Architecture} />
      <Route path={"/security"} component={Security} />
      <Route path={"/enterprise"} component={Enterprise} />
      <Route path={"/status"} component={Status} />
      <Route path={"/roadmap"} component={Roadmap} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/docs/sdk"} component={DocsSdk} />
      <Route path={"/docs/cli"} component={DocsCli} />
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
      <Route path={"/app/workspaces"}>
        <AppLayout>
          <Workspaces />
        </AppLayout>
      </Route>
      <Route path={"/app/workspaces/invite"}>
        <AppLayout>
          <WorkspaceInviteAccept />
        </AppLayout>
      </Route>
      <Route path={"/app/workspaces/:id/members"}>
        <AppLayout>
          <WorkspaceMembers />
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
      <Route path={"/app/requests/:id"}>
        <AppLayout>
          <RequestDetail />
        </AppLayout>
      </Route>
      <Route path={"/app/requests"}>
        <AppLayout>
          <Requests />
        </AppLayout>
      </Route>
      <Route path={"/app/templates"}>
        <AppLayout>
          <Templates />
        </AppLayout>
      </Route>
      <Route path={"/app/audit-logs"}>
        <AppLayout>
          <AuditLogs />
        </AppLayout>
      </Route>
      <Route path={"/app/analytics"}>
        <AppLayout>
          <Analytics />
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
      <Route path={"/app/settings/webhooks"}>
        <AppLayout>
          <Webhooks />
        </AppLayout>
      </Route>
      <Route path={"/app/webhooks/:id/deliveries"}>
        <AppLayout>
          <WebhookDeliveries />
        </AppLayout>
      </Route>
      <Route path={"/app/webhooks"}>
        <AppLayout>
          <Redirect to={"/app/settings/webhooks"} />
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

function ThemeAwareToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme}
      richColors
      expand
      closeButton
      icons={{
        success: <CheckCircle2 size={18} strokeWidth={2} />,
        error: <XCircle size={18} strokeWidth={2} />,
        info: <Info size={18} strokeWidth={2} />,
        warning: <AlertTriangle size={18} strokeWidth={2} />,
        close: <X size={14} strokeWidth={2} />,
      }}
      toastOptions={{
        classNames: {
          toast: "alexza-toast",
          title: "alexza-toast-title",
          description: "alexza-toast-description",
        },
      }}
    />
  );
}

function App() {
  const [location] = useLocation();
  useEffect(() => {
    logApiBaseUrlOnce();
  }, []);
  useEffect(() => {
    if (typeof Sentry.addBreadcrumb === "function") {
      Sentry.addBreadcrumb({ category: "navigation", message: location, level: "info" });
    }
  }, [location]);

  const ErrorFallback = ({ error, resetError }: { error: unknown; resetError: () => void }) => (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background">
      <div className="flex flex-col items-center w-full max-w-2xl p-8">
        <h2 className="text-xl mb-4">An unexpected error occurred.</h2>
        <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
          <pre className="text-sm text-muted-foreground whitespace-break-spaces">{error instanceof Error ? error.stack : String(error)}</pre>
        </div>
        <button
          onClick={resetError}
          className="flex gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );

  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      <ThemeProvider defaultTheme="dark" switchable>
        <AuthProvider>
          <WorkspaceProvider>
            <CreditsProvider>
            <TooltipProvider>
            <ThemeAwareToaster />
            <div className="min-h-screen relative">
              <div
                className="fixed inset-0 -z-30 pointer-events-none dark:opacity-100 opacity-0"
                style={{
                  background: 'linear-gradient(to bottom, #050607 0%, #0b0e12 50%, #050607 100%)',
                }}
              />
              <div
                className="fixed inset-0 -z-30 pointer-events-none dark:opacity-0 opacity-100"
                style={{
                  background: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 50%, #f3f4f6 100%)',
                }}
              />
              <DotGridBackground />
              <CosmicBackground />
              <div className="relative z-10">
                <Router />
              </div>
            </div>
            </TooltipProvider>
            </CreditsProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
