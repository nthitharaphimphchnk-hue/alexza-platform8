/**
 * Central Logo component for ALEXZA AI
 * - Clickable: navigates to Home (/)
 * - Supports size variants via height prop
 * - Dark mode compatible
 * - Responsive
 */

import { useLocation } from "wouter";

type LogoSize = "navbar" | "auth" | "sidebar";

const sizeMap: Record<LogoSize, string> = {
  navbar: "h-8 sm:h-9", // 32-36px
  auth: "h-24 sm:h-28 md:h-36", // 96-144px
  sidebar: "h-7 sm:h-8", // 28-32px
};

type LogoProps = {
  size?: LogoSize;
  className?: string;
  /** If false, logo is not clickable */
  clickable?: boolean;
};

export default function Logo({ size = "navbar", className = "", clickable = true }: LogoProps) {
  const [, setLocation] = useLocation();
  const heightClass = sizeMap[size];

  const handleClick = () => {
    if (clickable) {
      setLocation("/");
    }
  };

  const img = (
    <img
      src="/logo.png"
      alt="ALEXZA AI Logo"
      className={`object-contain object-left ${heightClass} w-auto mix-blend-lighten ${className}`}
      loading="eager"
    />
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c0c0c0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050607] rounded"
        aria-label="Go to Home"
      >
        {img}
      </button>
    );
  }

  return img;
}
