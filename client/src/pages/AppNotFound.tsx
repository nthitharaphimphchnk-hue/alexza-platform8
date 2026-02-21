import { Button } from "@/components/ui/button";
import { AlertCircle, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import AppShell from "@/components/app/AppShell";

/**
 * 404 for unknown /app/* routes.
 * Uses app shell; "Back to Dashboard" instead of public "Go Home".
 */
export default function AppNotFound() {
  const [, setLocation] = useLocation();

  return (
    <AppShell
      title="Page Not Found"
      subtitle="This app page doesn't exist"
      breadcrumbs={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "404" }]}
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
    >
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-pulse" />
            <AlertCircle className="relative h-16 w-16 text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-6 text-center">
          This app page doesn&apos;t exist or has been moved.
        </p>
        <Button
          onClick={() => setLocation("/app/dashboard")}
          className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
        >
          <LayoutDashboard size={16} className="mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </AppShell>
  );
}
