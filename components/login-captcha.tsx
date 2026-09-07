'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';

export interface LoginCaptchaRef {
  validate: () => boolean;
  refresh: () => void;
}

interface LoginCaptchaProps {
  onVerifyChange?: (verified: boolean) => void;
}

const LoginCaptcha = forwardRef<LoginCaptchaRef, LoginCaptchaProps>(({ onVerifyChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const generateCaptcha = () => {
    // Generate a random math or visual challenge e.g. 12 + 7 = 19 or 34 - 8
    const num1 = Math.floor(Math.random() * 18) + 2;
    const num2 = Math.floor(Math.random() * 12) + 1;
    const isAddition = Math.random() > 0.3;
    const questionText = isAddition ? `${num1} + ${num2} = ?` : `${num1 + num2} - ${num2} = ?`;
    const answer = isAddition ? (num1 + num2).toString() : num1.toString();

    setCaptchaAnswer(answer);
    setUserInput('');
    setStatus('idle');
    if (onVerifyChange) onVerifyChange(false);

    // Draw on Canvas with distortion, wave lines & noise
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#f8fafc');
    bgGradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = ['#cbd5e1', '#94a3b8', '#ffedd5', '#fed7aa'][Math.floor(Math.random() * 4)];
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Distortion security lines
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['#ea580c', '#3b82f6', '#10b981'][i % 3];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 10, Math.random() * canvas.height);
      ctx.bezierCurveTo(
        canvas.width / 3,
        Math.random() * canvas.height,
        (2 * canvas.width) / 3,
        Math.random() * canvas.height,
        canvas.width - Math.random() * 10,
        Math.random() * canvas.height
      );
      ctx.stroke();
    }

    // Render Question Text with slight rotation and security font
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((Math.random() - 0.5) * 0.08); // subtle tilt
    ctx.fillText(questionText, 0, 0);
    ctx.restore();
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleInputChange = (val: string) => {
    setUserInput(val);
    if (val.trim() === captchaAnswer) {
      setStatus('success');
      if (onVerifyChange) onVerifyChange(true);
    } else {
      setStatus(val.length >= captchaAnswer.length ? 'error' : 'idle');
      if (onVerifyChange) onVerifyChange(false);
    }
  };

  useImperativeHandle(ref, () => ({
    validate: () => {
      const isCorrect = userInput.trim() === captchaAnswer;
      if (isCorrect) {
        setStatus('success');
        if (onVerifyChange) onVerifyChange(true);
        return true;
      } else {
        setStatus('error');
        if (onVerifyChange) onVerifyChange(false);
        return false;
      }
    },
    refresh: () => {
      generateCaptcha();
    },
  }));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-brand-orange" />
          <span>Human Verification</span>
        </label>
        <span className="text-[10px] font-bold text-slate-400">Enter calculation result</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Captcha Canvas Box */}
        <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-50 p-1 shadow-2xs">
          <canvas
            ref={canvasRef}
            width={130}
            height={38}
            className="block select-none pointer-events-none rounded-lg"
          />
        </div>

        {/* Refresh Challenge Button */}
        <button
          type="button"
          onClick={generateCaptcha}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-orange transition shadow-2xs"
          title="Regenerate CAPTCHA Challenge"
        >
          <RefreshCw size={16} />
        </button>

        {/* User Input Answer */}
        <input
          type="text"
          maxLength={4}
          required
          value={userInput}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Answer"
          className={`w-24 rounded-xl border py-2 px-3 text-center text-sm font-bold text-slate-900 outline-none transition ${
            status === 'success'
              ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 focus:border-emerald-600'
              : status === 'error'
              ? 'border-rose-400 bg-rose-50/50 text-rose-800 focus:border-rose-500'
              : 'border-slate-300 bg-white focus:border-brand-orange'
          }`}
        />
      </div>

      {status === 'error' && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
          <ShieldAlert size={12} /> Incorrect security answer. Please retry.
        </p>
      )}
    </div>
  );
});

LoginCaptcha.displayName = 'LoginCaptcha';

export default LoginCaptcha;
