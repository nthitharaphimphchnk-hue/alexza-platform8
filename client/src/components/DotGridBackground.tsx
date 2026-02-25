'use client';

/**
 * Resend-style subtle dot grid - premium, almost invisible texture.
 * Tiny faint white dots for depth without distraction.
 */
export default function DotGridBackground() {
  return (
    <div
      className="fixed inset-0 -z-20 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    />
  );
}
