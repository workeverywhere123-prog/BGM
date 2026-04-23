'use client';

import { useEffect, useRef } from 'react';

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const c = canvas;
    const x = ctx;
    let W = 0, H = 0, raf = 0;

    type P = { x:number; y:number; r:number; alpha:number; vx:number; vy:number; life:number; age:number };
    const particles: P[] = [];

    function rand(a: number, b: number) { return Math.random() * (b - a) + a; }
    function mkP(): P { return { x:rand(0,W), y:rand(0,H), r:rand(0.5,2.2), alpha:rand(0.1,0.7), vx:rand(-0.15,0.15), vy:rand(-0.3,-0.08), life:rand(120,300), age:0 }; }

    function resize() {
      W = c.width = window.innerWidth;
      H = c.height = window.innerHeight;
    }

    function tick() {
      x.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++; p.x += p.vx; p.y += p.vy;
        const f = Math.sin((p.age / p.life) * Math.PI);
        x.beginPath();
        x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        x.fillStyle = `rgba(201,168,76,${p.alpha * f})`;
        x.fill();
        if (p.age >= p.life) particles[i] = mkP();
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    for (let i = 0; i < 90; i++) particles.push(mkP());
    tick();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
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
