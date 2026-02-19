import { ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  Search,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiError } from "@/lib/api";
import { LOW_CREDITS_THRESHOLD } from "@/lib/creditsConfig";
import LowCreditsBanner from "@/components/LowCreditsBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Mode = "Production" | "Test";

const APP_MODE_STORAGE_KEY = "alexza_app_mode";
const LOW_CREDITS_DISMISS_PREFIX = "alexza_low_credits_dismissed";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: Home },
  { label: "Projects", href: "/app/projects", icon: FileText },
  { label: "Credits", href: "/app/billing/credits", icon: Zap },
  { label: "Billing", href: "/app/billing/plans", icon: CreditCard },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

const mockNotifications = [
  { id: "n1", message: "Project created successfully", time: "2m ago" },
  { id: "n2", message: "API key copied to clipboard", time: "10m ago" },
  { id: "n3", message: "Credits low warning threshold reached", time: "1h ago" },
];

export default function AppShell({
  title,
  subtitle,
  breadcrumbs,
  backHref = "/app/dashboard",
  backLabel = "Back",
  actions,
  children,
}: AppShellProps) {
  const [location, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("Production");
  const [lowCreditsBalance, setLowCreditsBalance] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lowCreditsDismissKey, setLowCreditsDismissKey] = useState<string | null>(null);
  const [isLowCreditsDismissed, setIsLowCreditsDismissed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
    if (saved === "Production" || saved === "Test") {
      setMode(saved);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLowCredits = async () => {
      if (!location.startsWith("/app")) return;

      try {
        const [meResponse, balanceResponse] = await Promise.all([
          apiRequest<{ ok: boolean; user: { id: string } }>("/api/me"),
          apiRequest<{ ok: boolean; balanceCredits: number }>("/api/credits/balance"),
        ]);
        if (cancelled) return;

        const userId = meResponse?.user?.id;
        if (!userId) return;
        setCurrentUserId(userId);

        const dismissKey = `${LOW_CREDITS_DISMISS_PREFIX}:${userId}`;
        const dismissed = window.localStorage.getItem(dismissKey) === "1";
        setLowCreditsDismissKey(dismissKey);
        setIsLowCreditsDismissed(dismissed);
        setLowCreditsBalance(balanceResponse.balanceCredits);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return;
        }
      }
    };

    void loadLowCredits();

    return () => {
      cancelled = true;
    };
  }, [location]);

  const updateMode = (nextMode: Mode) => {
    setMode(nextMode);
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, nextMode);
  };

  const pageKey = useMemo(() => location, [location]);
  const isLowCredits =
    typeof lowCreditsBalance === "number" && lowCreditsBalance < LOW_CREDITS_THRESHOLD;
  const isZeroCredits = lowCreditsBalance === 0;

  const isActive = (href: string) => {
    if (href === "/app/dashboard") {
      return location === "/app" || location === "/app/dashboard";
    }
    return location.startsWith(href);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation(backHref);
  };

  const clearLowCreditsDismissOnLogout = (userId: string | null) => {
    if (userId) {
      window.localStorage.removeItem(`${LOW_CREDITS_DISMISS_PREFIX}:${userId}`);
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${LOW_CREDITS_DISMISS_PREFIX}:`)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  };

  const handleSignOut = async () => {
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
      clearLowCreditsDismissOnLogout(currentUserId);
    } catch {
      // If logout API fails, keep current localStorage state unchanged.
    } finally {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-[#06090d]/85 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c0c0c0] to-[#808080] text-black">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-400">ALEXZA AI</p>
                <p className="text-base font-semibold text-white">Orchestration</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className={`ripple-btn flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-all ${
                    isActive(item.href)
                      ? "bg-[rgba(192,192,192,0.14)] text-white shadow-[0_0_24px_rgba(192,192,192,0.2)]"
                      : "text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.href === "/app/billing/credits" && isLowCredits ? (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isZeroCredits ? "bg-red-500/25 text-red-200" : "bg-amber-500/25 text-amber-200"
                      }`}
                    >
                      {isZeroCredits ? "Top up" : "Low"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.06)] bg-[#050607]/85 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[2fr_1.5fr_2fr]">
              <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm">
                {breadcrumbs.map((item, idx) => (
                  <div key={`${item.label}-${idx}`} className="flex items-center gap-1">
                    {item.href ? (
                      <button
                        onClick={() => setLocation(item.href!)}
                        className="rounded px-1.5 py-0.5 text-gray-400 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className="px-1.5 py-0.5 text-white">{item.label}</span>
                    )}
                    {idx !== breadcrumbs.length - 1 && <ChevronRight size={14} className="text-gray-500" />}
                  </div>
                ))}
              </div>

              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search projects, keys, events..."
                  className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-[rgba(192,192,192,0.45)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-start gap-2 xl:justify-end">
                <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 px-3 py-1.5 text-xs text-gray-300">
                  Environment:
                  <span className={`ml-2 font-semibold ${mode === "Production" ? "text-[#c0c0c0]" : "text-cyan-300"}`}>
                    {mode}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-[rgba(255,255,255,0.08)] text-white">
                      Switch Mode
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#0b0e12] text-gray-200">
                    <DropdownMenuLabel>Application Mode</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateMode("Production")}>Production</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateMode("Test")}>Test</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-[rgba(255,255,255,0.08)] text-white">
                      <Bell size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-[#0b0e12] text-gray-200">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {mockNotifications.map((notification) => (
                      <DropdownMenuItem key={notification.id} className="flex items-start justify-between gap-2 py-2">
                        <span className="text-sm">{notification.message}</span>
                        <span className="text-xs text-gray-500">{notification.time}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ripple-btn flex h-10 items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 px-3 text-sm text-white">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#c0c0c0] to-[#808080] text-xs font-semibold text-black">
                        AU
                      </span>
                      <span className="hidden sm:block">alexza@workspace.ai</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#0b0e12] text-gray-200">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/app/settings")}>Profile Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/app/billing/plans")}>Billing</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void handleSignOut()}>Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <motion.main
            key={pageKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="flex-1 p-4 md:p-8"
          >
            <div className="mx-auto w-full max-w-7xl space-y-8">
              {isLowCredits && !isLowCreditsDismissed ? (
                <LowCreditsBanner
                  balanceCredits={lowCreditsBalance ?? 0}
                  onAddCredits={() => setLocation("/app/billing/credits")}
                  onDismiss={
                    lowCreditsDismissKey
                      ? () => {
                          window.localStorage.setItem(lowCreditsDismissKey, "1");
                          setIsLowCreditsDismissed(true);
                        }
                      : undefined
                  }
                />
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <button
                    onClick={handleBack}
                    className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 px-3 py-1.5 text-sm text-gray-200 transition hover:border-[rgba(192,192,192,0.4)] hover:text-white"
                  >
                    <span aria-hidden>←</span>
                    {backLabel}
                  </button>
                  <h1 className="text-3xl font-semibold text-white">{title}</h1>
                  {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
                  <div className="mt-3 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs">
                    {breadcrumbs.map((item, idx) => (
                      <div key={`inline-${item.label}-${idx}`} className="flex items-center gap-1">
                        {item.href ? (
                          <button
                            onClick={() => setLocation(item.href!)}
                            className="rounded px-1.5 py-0.5 text-gray-400 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                          >
                            {item.label}
                          </button>
                        ) : (
                          <span className="px-1.5 py-0.5 text-gray-200">{item.label}</span>
                        )}
                        {idx !== breadcrumbs.length - 1 ? (
                          <ChevronRight size={12} className="text-gray-600" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                {actions}
              </div>
              {children}
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
