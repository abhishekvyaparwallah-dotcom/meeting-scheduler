'use client';

import { useEffect, useRef } from 'react';
import { Award, CheckCircle2, X, ArrowRight, Target, PhoneCall } from 'lucide-react';

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

    // Subtle, elegant gold & navy champagne particle shimmer
    const colors = ['#f59e0b', '#fbbf24', '#ff6a00', '#10b981', '#6366f1', '#3b82f6'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      rotation: number;
      rotSpeed: number;
    }> = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 260,
        y: height / 2 - 80 + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14 - 2,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.006 + 0.002,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gentle gravity
        p.vx *= 0.985;
        p.rotation += p.rotSpeed;
        p.alpha = Math.max(0, p.alpha - p.decay);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* Background Canvas Effect */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {/* Main Professional Milestone Dialog */}
      <div className="relative z-20 w-full max-w-md overflow-hidden rounded-2xl bg-white p-7 text-center shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Milestone Icon Medallion */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-brand-orange to-orange-500 text-white shadow-lg shadow-orange-500/25 ring-4 ring-orange-100">
          <Award size={34} strokeWidth={2.2} />
        </div>

        {/* Status Pill */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>Daily Target Completed</span>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-2xl font-black text-brand-navy tracking-tight">
          Great Job, {telecallerName}!
        </h3>

        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
          Aapne aaj ka assigned target successfully pura kar liya hai. Aise hi high performance maintain rakhein!
        </p>

        {/* Metric Overview Grid */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-left">
          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <PhoneCall size={12} className="text-brand-orange" />
              <span>Calls Dialed</span>
            </div>
            <p className="mt-1 text-xl font-black text-brand-navy">{callsDialed} Calls</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <Target size={12} className="text-emerald-600" />
              <span>Target Met</span>
            </div>
            <p className="mt-1 text-xl font-black text-emerald-700">{dailyTarget} / {dailyTarget} (100%)</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand-navy hover:bg-brand-navy/90 py-3 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-2"
          >
            <span>Continue to CRM Workspace</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
