import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", labelKey: "marketing.nav.home" },
  { href: "/use-cases", labelKey: "marketing.nav.useCases" },
  { href: "/architecture", labelKey: "marketing.nav.architecture" },
  { href: "/security", labelKey: "marketing.nav.security" },
  { href: "/enterprise", labelKey: "marketing.nav.enterprise" },
  { href: "/status", labelKey: "marketing.nav.status" },
  { href: "/roadmap", labelKey: "marketing.nav.roadmap" },
  { href: "/docs", labelKey: "marketing.nav.docs" },
  { href: "/pricing", labelKey: "marketing.nav.pricing" },
];

type MarketingLayoutProps = {
  children: React.ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050607] text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-[#050607]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size="navbar" />

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm transition ${
                  location === href
                    ? "text-white font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t(labelKey)}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Button
              variant="outline"
              className="border border-[rgba(255,255,255,0.1)] text-white hover:bg-[#0b0e12] rounded-lg"
              onClick={() => (window.location.href = "/login")}
            >
              {t("navigation.signIn")}
            </Button>
            <Button
              className="btn-silver-bright rounded-lg"
              onClick={() => (window.location.href = "/signup")}
            >
              {t("navigation.getStarted")}
            </Button>
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0b0e12] border-t border-[rgba(255,255,255,0.1)] p-4 space-y-2">
            {navLinks.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className="block py-2 text-sm text-gray-300 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t(labelKey)}
              </Link>
            ))}
            <div className="flex gap-2 pt-4">
              <LanguageSwitcher />
              <Button
                variant="outline"
                className="flex-1 border-[rgba(255,255,255,0.1)] text-white"
                onClick={() => (window.location.href = "/login")}
              >
                {t("navigation.signIn")}
              </Button>
              <Button
                className="flex-1 btn-silver-bright"
                onClick={() => (window.location.href = "/signup")}
              >
                {t("navigation.getStarted")}
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-20">{children}</main>

      <footer className="border-t border-[rgba(255,255,255,0.1)] py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">
                {t("marketing.footer.product")}
              </h4>
              <ul className="space-y-2">
                {["API", "Flow Builder", "Webhooks", "Analytics"].map((link) => (
                  <li key={link}>
                    <a
                      href="/docs"
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">
                {t("marketing.footer.resources")}
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/pricing" className="text-gray-400 hover:text-white text-sm">
                    {t("marketing.footer.pricing")}
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-gray-400 hover:text-white text-sm">
                    {t("marketing.footer.security")}
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-gray-400 hover:text-white text-sm">
                    {t("marketing.footer.docs")}
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="text-gray-400 hover:text-white text-sm">
                    {t("marketing.footer.status")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">
                {t("marketing.footer.company")}
              </h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">
                {t("marketing.footer.legal")}
              </h4>
              <ul className="space-y-2">
                {["Privacy", "Terms"].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.1)] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© 2026 ALEXZA AI. All rights reserved.</p>
            <Link href="/status" className="flex items-center gap-2 hover:text-white transition">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t("marketing.footer.allSystemsOperational")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
