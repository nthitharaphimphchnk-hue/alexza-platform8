'use client';

import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  connections: number;
}

// Reduced for performance - fewer nodes = fewer edges & calculations
const NODE_COUNT = 50;
const CONNECT_DISTANCE = 220;
const LINE_GLOW = 1;

export default function NeuralNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let nodes: Node[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    const initNodes = () => {
      nodes = [];
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          baseX: Math.random() * w,
          baseY: Math.random() * h,
          connections: 0,
        });
      }
    };

    const drawWavyBands = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      // Soft vertical undulations - dark smoke, fluid, central focus
      const bands = [
        { xBase: w * 0.5, width: 180, intensity: 0.06 },
        { xBase: w * 0.35, width: 140, intensity: 0.05 },
        { xBase: w * 0.65, width: 130, intensity: 0.05 },
        { xBase: w * 0.22, width: 100, intensity: 0.03 },
        { xBase: w * 0.78, width: 100, intensity: 0.03 },
      ];

      for (const band of bands) {
        const grad = ctx.createLinearGradient(band.xBase - band.width, 0, band.xBase + band.width, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.35, `rgba(100,110,125,${band.intensity * 0.5})`);
        grad.addColorStop(0.5, `rgba(160,170,185,${band.intensity})`);
        grad.addColorStop(0.65, `rgba(100,110,125,${band.intensity * 0.5})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.beginPath();
        ctx.moveTo(band.xBase, 0);

        for (let y = 0; y <= h + 100; y += 12) {
          const wave = Math.sin(y * 0.008 + time * 0.0005) * 65;
          const wave2 = Math.sin(y * 0.004 + time * 0.0003) * 40;
          const swirl = Math.sin(y * 0.02 + time * 0.0008) * 12;
          const x = band.xBase + wave + wave2 + swirl;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w + 200, h + 200);
        ctx.lineTo(-200, h + 200);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
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

      // Update node positions
      for (const node of nodes) {
        node.x = node.baseX + Math.sin(time * 0.0008 + node.baseX * 0.008) * 12;
        node.y = node.baseY + Math.cos(time * 0.0006 + node.baseY * 0.008) * 12;
        node.connections = 0;
      }

      // Build connections and count intersections
      const edges: [Node, Node][] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DISTANCE) {
            edges.push([nodes[i], nodes[j]]);
            nodes[i].connections++;
            nodes[j].connections++;
          }
        }
      }

      // 1. Wavy bands first (background depth)
      drawWavyBands(time);

      // 2. Lines with glow (แสงตามเส้น)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const [a, b] of edges) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const alpha = (1 - dist / CONNECT_DISTANCE) * 0.4 + 0.2;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const bend = Math.sin(time * 0.0012 + a.baseX * 0.012) * 15;
        const ctrlX = midX + bend;
        const ctrlY = midY - bend * 0.4;

        // Very thin delicate lines - light silver/blue, faint glow
        ctx.shadowBlur = LINE_GLOW;
        ctx.shadowColor = `rgba(235,242,255,${alpha * 0.6})`;
        ctx.strokeStyle = `rgba(245,250,255,${alpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
        ctx.stroke();

        // Core - almost white, very thin
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
        ctx.stroke();
      }

      // 3. Nodes - star-like bursts at intersections and endpoints
      for (const node of nodes) {
        const brightness = Math.min(0.35 + node.connections * 0.1, 0.95);
        const radius = 3 + node.connections * 0.6;

        ctx.shadowBlur = 2;
        ctx.shadowColor = `rgba(240,248,255,${brightness})`;
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, radius
        );
        gradient.addColorStop(0, `rgba(255,255,255,${brightness})`);
        gradient.addColorStop(0.35, `rgba(230,238,255,${brightness * 0.5})`);
        gradient.addColorStop(0.7, `rgba(200,215,235,${brightness * 0.15})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${0.6 + brightness * 0.4})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 0.8, 0, Math.PI * 2);
        ctx.fill();
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
