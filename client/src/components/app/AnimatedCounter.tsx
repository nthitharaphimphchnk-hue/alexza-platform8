import { useEffect, useMemo, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  durationMs?: number;
};

export default function AnimatedCounter({ value, durationMs = 800 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = Math.max(1, Math.round(durationMs / 16));
    const start = displayValue;
    const delta = value - start;

    const tick = () => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + delta * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  const formatted = useMemo(() => displayValue.toLocaleString(), [displayValue]);
  return <span>{formatted}</span>;
}
