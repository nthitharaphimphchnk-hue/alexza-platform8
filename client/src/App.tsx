import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CreditsProvider } from "./contexts/CreditsContext";
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
import UsageAnalytics from "./pages/UsageAnalytics";
import Credits from "./pages/Credits";
import Wallet from "./pages/Wallet";
import Billing from "./pages/Billing";
import BillingPlans from "./pages/BillingPlans";
import Settings from "./pages/Settings";
import { useEffect } from "react";
import { logApiBaseUrlOnce } from "./lib/api";

function ApiKeysRoute() {
  return <ApiKeys />;
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
      
      {/* App Routes */}
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/app/dashboard"} component={Dashboard} />
      <Route path={"/app/projects"} component={Projects} />
      <Route path={"/app/projects/:id"} component={ProjectDetail} />
      <Route path={"/app/projects/:id/ai"} component={ChatBuilder} />
      <Route path={"/app/projects/:id/keys"} component={ApiKeysRoute} />
      <Route path={"/app/projects/:id/playground"} component={Playground} />
      <Route path={"/app/playground"} component={Playground} />
      <Route path={"/app/projects/:id/usage"} component={UsageAnalytics} />
      <Route path={"/app/billing/credits"} component={Wallet} />
      <Route path={"/app/billing/plans"} component={BillingPlans} />
      <Route path={"/app/settings"} component={Settings} />
      
      {/* Legacy Routes */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/chat-builder"} component={ChatBuilder} />
      <Route path={"/credits"} component={Credits} />
      
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
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
            <Router />
          </TooltipProvider>
        </CreditsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
