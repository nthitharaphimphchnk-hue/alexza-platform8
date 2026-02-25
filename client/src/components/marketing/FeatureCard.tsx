import { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  linkText?: string;
};

export default function FeatureCard({
  icon: Icon,
  title,
  body,
  href,
  linkText,
}: FeatureCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300 flex flex-col h-full">
      <Icon className="w-6 h-6 text-gray-400 mb-4 flex-shrink-0" />
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed flex-1">{body}</p>
      {href && linkText && (
        <a
          href={href}
          className="inline-flex items-center gap-2 mt-4 text-sm text-[#c0c0c0] hover:text-white transition"
        >
          {linkText}
          <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}
