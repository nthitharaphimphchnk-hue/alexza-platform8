import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps app routes. Redirects to /login if not authenticated.
 * Shows loading while /api/me is pending; never renders NotFound.
 * Preserves intended destination in ?next= for post-login redirect.
 *
 * Onboarding redirect: only when authenticated, user exists, and user has not completed
 * onboarding AND is on the "home" entry (/app or /app/dashboard). Other /app/* paths
 * (requests, templates, etc.) are allowed so sidebar navigation works.
 * Completion is persisted via POST /api/onboarding/complete and refetch; Skip uses the same.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPath, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const nextUrl = encodeURIComponent(currentPath || "/app/dashboard");
      setLocation(`/login?next=${nextUrl}`);
      return;
    }
    const isAppHome = currentPath === "/app" || currentPath === "/app/dashboard";
    if (
      !isLoading &&
      isAuthenticated &&
      user != null &&
      isAppHome &&
      !currentPath.startsWith("/app/onboarding") &&
      user.onboardingCompleted === false
    ) {
      if (import.meta.env.DEV) {
        console.log("[ProtectedRoute] Redirecting to onboarding because:", {
          onboardingCompleted: user.onboardingCompleted,
          userId: user.id,
          currentPath,
        });
      }
      setLocation("/app/onboarding");
    }
  }, [isLoading, isAuthenticated, currentPath, setLocation, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <Loader2 size={32} className="animate-spin text-[#c0c0c0]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
