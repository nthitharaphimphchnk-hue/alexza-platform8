type MarketingSectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function MarketingSectionHeader({
  title,
  subtitle,
  className = "",
}: MarketingSectionHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
      {subtitle && (
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">{subtitle}</p>
      )}
    </div>
  );
}
