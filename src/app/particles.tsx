'use client';

import { useEffect, useRef } from 'react';

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let W = 0, H = 0, raf = 0, paused = false, lastTime = 0;
    const FRAME_MS = 42; // ~24fps

    type P = { x: number; y: number; r: number; alpha: number; vx: number; vy: number; life: number; age: number };
    const particles: P[] = [];

    const rand = (a: number, b: number) => Math.random() * (b - a) + a;
    const mkP = (): P => ({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 2), alpha: rand(0.1, 0.6), vx: rand(-0.12, 0.12), vy: rand(-0.25, -0.07), life: rand(140, 320), age: 0 });

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (paused || now - lastTime < FRAME_MS) return;
      lastTime = now;
      const ctx = canvas!.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++; p.x += p.vx; p.y += p.vy;
        const f = Math.sin((p.age / p.life) * Math.PI);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${p.alpha * f})`;
        ctx.fill();
        if (p.age >= p.life) particles[i] = mkP();
      }
    }

    function onVisibility() { paused = document.hidden; }

    function start() {
      resize();
      const count = window.navigator.hardwareConcurrency > 4 ? 20 : 12;
      for (let i = 0; i < count; i++) particles.push(mkP());
      raf = requestAnimationFrame(tick);
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', onVisibility);
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(start, { timeout: 2000 });
    } else {
      setTimeout(start, 300);
    }

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
