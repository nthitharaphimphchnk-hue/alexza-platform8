'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  opacity: number;
}

const STAR_COUNT = 180;

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < STAR_COUNT; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() > 0.9 ? 1.5 : Math.random() * 0.8 + 0.3;
        stars.push({
          x,
          y,
          baseX: x,
          baseY: y,
          size,
          twinkleSpeed: 0.002 + Math.random() * 0.004,
          twinkleOffset: Math.random() * Math.PI * 2,
          opacity: 0.4 + Math.random() * 0.6,
        });
      }
    };

    const draw = (time: number) => {
      if (document.hidden) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Nebula wisps - soft ethereal clouds (blue/white) - upper right, center-left
      const nebulas = [
        { x: w * 0.78, y: h * 0.18, radius: 320, intensity: 0.06 },
        { x: w * 0.22, y: h * 0.45, radius: 260, intensity: 0.05 },
        { x: w * 0.5, y: h * 0.75, radius: 180, intensity: 0.04 },
        { x: w * 0.88, y: h * 0.55, radius: 140, intensity: 0.03 },
      ];

      for (const nebula of nebulas) {
        const pulse = 0.9 + Math.sin(time * 0.0003) * 0.1;
        const grad = ctx.createRadialGradient(
          nebula.x, nebula.y, 0,
          nebula.x, nebula.y, nebula.radius * pulse
        );
        grad.addColorStop(0, `rgba(120,140,180,${nebula.intensity})`);
        grad.addColorStop(0.4, `rgba(80,100,140,${nebula.intensity * 0.5})`);
        grad.addColorStop(0.7, `rgba(40,60,90,${nebula.intensity * 0.2})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Stars - sparkling dots
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.opacity * twinkle;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Occasional shooting star (every ~8 seconds)
      const shootPhase = (time * 0.00012) % 1;
      if (shootPhase < 0.08) {
        const t = shootPhase / 0.08;
        const sx = w * (0.2 + t * 0.8);
        const sy = h * (0.1 - t * 0.3);
        const grad = ctx.createLinearGradient(sx - 40, sy, sx + 20, sy);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.3)');
        grad.addColorStop(1, 'rgba(255,255,255,0.8)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx - 60, sy + 20);
        ctx.lineTo(sx + 30, sy - 10);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    animationId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ background: 'transparent', contain: 'strict' }}
    />
  );
}
