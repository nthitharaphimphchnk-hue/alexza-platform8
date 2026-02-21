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
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/app/dashboard";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const nextUrl = encodeURIComponent(currentPath);
      setLocation(`/login?next=${nextUrl}`);
    }
  }, [isLoading, isAuthenticated, currentPath, setLocation]);

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
