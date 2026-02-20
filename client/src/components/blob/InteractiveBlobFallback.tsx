'use client';

import React, { useState, useRef, useEffect } from 'react';

interface InteractiveBlobFallbackProps {
  size?: number;
  intensity?: number;
  colorAccent?: string;
  idleSpeed?: number;
  hoverStrength?: number;
  glowStrength?: number;
  glowColor?: string;
  chaosLevel?: number;
  burstMode?: boolean;
  spinSpeed?: number;
  tightness?: number;
  extraSpheres?: number;
}

const InteractiveBlobFallback: React.FC<InteractiveBlobFallbackProps> = ({
  size = 420,
  intensity = 0.6,
  colorAccent = '#c0c0c0',
  idleSpeed = 0.4,
  hoverStrength = 0.8,
  glowStrength = 1.2,
  glowColor,
  chaosLevel,
  burstMode,
  spinSpeed,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x: x * 20, y: y * 20 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const blobStyle = {
    '--color-accent': glowColor || colorAccent,
    '--glow-strength': glowStrength,
    '--hover-scale': isHovering ? 1.05 : 1,
    '--mouse-x': `${mousePos.x}px`,
    '--mouse-y': `${mousePos.y}px`,
  } as React.CSSProperties & Record<string, any>;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* SVG Blob */}
      <svg
        viewBox="0 0 200 200"
        className="absolute w-full h-full filter drop-shadow-lg"
        style={blobStyle}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="50%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.8)" />
          </linearGradient>
          <radialGradient id="blobRadial">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="70%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.6)" />
          </radialGradient>
        </defs>

        {/* Main blob shape with morphing animation */}
        <g filter="url(#glow)">
          <path
            d="M100,30 C140,30 160,50 160,90 C160,130 140,170 100,170 C60,170 40,130 40,90 C40,50 60,30 100,30 Z"
            fill="url(#blobRadial)"
            className="animate-blob"
            style={{
              filter: `drop-shadow(0 0 ${20 * glowStrength}px var(--color-accent))`,
              transform: `translate(var(--mouse-x), var(--mouse-y)) scale(var(--hover-scale))`,
              transition: 'transform 0.3s ease-out',
            }}
          />

          {/* Secondary blob elements for liquid effect */}
          <circle
            cx="70"
            cy="60"
            r="35"
            fill="url(#blobGradient)"
            opacity="0.7"
            className="animate-blob-secondary"
            style={{
              filter: `drop-shadow(0 0 ${15 * glowStrength}px var(--color-accent))`,
              animation: `float ${3 / idleSpeed}s ease-in-out infinite`,
            }}
          />
          <circle
            cx="130"
            cy="70"
            r="40"
            fill="url(#blobGradient)"
            opacity="0.6"
            className="animate-blob-secondary"
            style={{
              filter: `drop-shadow(0 0 ${15 * glowStrength}px var(--color-accent))`,
              animation: `float ${3.5 / idleSpeed}s ease-in-out infinite reverse`,
            }}
          />
          <circle
            cx="100"
            cy="140"
            r="38"
            fill="url(#blobGradient)"
            opacity="0.65"
            className="animate-blob-secondary"
            style={{
              filter: `drop-shadow(0 0 ${15 * glowStrength}px var(--color-accent))`,
              animation: `float ${3.2 / idleSpeed}s ease-in-out infinite`,
            }}
          />
        </g>
      </svg>

      {/* Glow background effect */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-30"
        style={{
          background: `radial-gradient(circle, var(--color-accent), transparent)`,
          transform: `scale(${isHovering ? 1.2 : 1})`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(5px, -5px) scale(1.02);
          }
          50% {
            transform: translate(-5px, 5px) scale(0.98);
          }
          75% {
            transform: translate(5px, 5px) scale(1.01);
          }
        }

        @keyframes blob-secondary {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-blob {
          animation: blob ${4 / idleSpeed}s ease-in-out infinite;
        }

        .animate-blob-secondary {
          animation: blob-secondary ${3 / idleSpeed}s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InteractiveBlobFallback;
