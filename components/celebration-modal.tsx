'use client';

import { useEffect, useRef } from 'react';
import { Trophy, Sparkles, Flame, CheckCircle, X } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  telecallerName: string;
  callsDialed: number;
  dailyTarget: number;
}

export default function CelebrationModal({
  isOpen,
  onClose,
  telecallerName,
  callsDialed,
  dailyTarget,
}: CelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle Confetti & Fireworks simulation
    const colors = ['#ff6a00', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#e11d48'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
      shape: 'rect' | 'circle';
    }> = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.8) * 16 - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.985; // friction
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-hidden">
      {/* Confetti / Firecracker Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {/* Floating Animated Balloons */}
      <div className="pointer-events-none absolute inset-0 z-15 overflow-hidden">
        <div className="absolute -bottom-20 left-[10%] animate-bounce text-6xl opacity-90 transition duration-1000">🎈</div>
        <div className="absolute -bottom-20 left-[25%] animate-pulse text-7xl opacity-90">🎉</div>
        <div className="absolute -bottom-20 left-[45%] text-7xl opacity-90">🎈</div>
        <div className="absolute -bottom-20 left-[68%] animate-bounce text-6xl opacity-90">✨</div>
        <div className="absolute -bottom-20 left-[85%] text-7xl opacity-90">🎈</div>
      </div>

      {/* Main Celebration Card */}
      <div className="relative z-20 w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border-2 border-brand-orange/40 animate-in fade-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Glow & Trophy Icon */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-400 to-amber-300 opacity-30 blur-xl animate-pulse"></div>
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-brand-orange to-red-500 shadow-lg text-white transform hover:rotate-6 transition duration-300">
            <Trophy size={40} className="drop-shadow" />
          </div>
        </div>

        {/* Firecracker Badges */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-brand-orange">
            <Flame size={14} className="animate-bounce" /> 100% Target Crushed!
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            <Sparkles size={14} /> Star Telecaller
          </span>
        </div>

        {/* Heading */}
        <h2 className="mt-3 text-3xl font-black text-brand-navy tracking-tight">
          🎉 WELL DONE, {telecallerName}! 🚀
        </h2>

        <p className="mt-2 text-sm font-medium text-slate-600 leading-relaxed">
          Superb dedication! Aapne aaj ka apna <strong className="text-brand-orange font-bold">Daily Call Target</strong> pura kar liya hai.
        </p>

        {/* Target Score Box */}
        <div className="mt-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Calls Dialed Today:</span>
            <span className="text-emerald-700 font-extrabold flex items-center gap-1">
              <CheckCircle size={14} /> Completed
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-1 text-4xl font-black text-brand-orange">
            {callsDialed}
            <span className="text-lg font-bold text-slate-400">/ {dailyTarget} Calls</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Keep dialing to set new records for Vyapar Wallah!
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:from-brand-orangeHover hover:to-amber-600 transition transform active:scale-98 flex items-center justify-center gap-2"
          >
            <Flame size={16} /> Keep Dialing & Crushing It! 💪
          </button>
        </div>
      </div>
    </div>
  );
}
