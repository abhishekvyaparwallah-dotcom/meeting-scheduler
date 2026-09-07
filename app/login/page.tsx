'use client';

import { FormEvent, useState, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginCaptcha, { LoginCaptchaRef } from '@/components/login-captcha';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  // Step state: 'credentials' -> 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  // Step 1 Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const captchaRef = useRef<LoginCaptchaRef | null>(null);

  // Step 2 Form (2FA)
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 60-second cooldown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Validate Password & Captcha, then request OTP
  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validate captcha
    if (captchaRef.current && !captchaRef.current.validate()) {
      setError('Please solve the anti-bot security challenge correctly.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaVerified: true,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.message || 'Authentication failed. Please check credentials.');
        if (captchaRef.current) captchaRef.current.refresh();
        return;
      }

      setChallengeId(data.challengeId);
      if (data.devOtpPreview) {
        setDevOtpHint(data.devOtpPreview);
      }
      setSuccessMsg(data.message || `A 6-digit OTP code has been sent to ${email}.`);
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  // Step 2: Verify 6-digit OTP and complete session login
  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the valid 6-digit security code sent to your email.');
      return;
    }

    setLoading(true);

    const result = await signIn('credentials', {
      email,
      otp: otp.trim(),
      challengeId,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid or expired security code. Please check and retry.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaVerified: true,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.message || 'Failed to resend OTP.');
        return;
      }

      setChallengeId(data.challengeId);
      if (data.devOtpPreview) {
        setDevOtpHint(data.devOtpPreview);
      }
      setSuccessMsg(`Fresh security code sent to ${email}.`);
      setResendCooldown(60);
      setOtp('');
    } catch {
      setLoading(false);
      setError('Failed to resend OTP.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-surface px-4 py-8 text-slate-900">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1fr_1fr]">
        {/* Left Branding & Highlights */}
        <div className="flex flex-col justify-between bg-white border-r border-slate-200 p-8 text-slate-800 md:p-10">
          <div>
            <div>
              <img
                src="/logo.png"
                alt="Vyapar Wallah"
                className="h-11 w-auto max-w-[200px] object-contain"
              />
              <p className="text-xs font-bold text-brand-orange mt-2.5 tracking-wide uppercase">
                Meeting Scheduler & Telecalling CRM
              </p>
            </div>

            <h2 className="mt-8 text-2xl font-black leading-tight text-slate-900">
              Smart Client Management & Telecalling CRM
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">
              Next-generation unified operating portal for client consultations, team scheduling, and high-impact sales workflows.
            </p>

            <div className="mt-6 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-orange shrink-0"></span>
                <span className="font-semibold text-slate-800">
                  High-Conversion Telecalling CRM & Instant WhatsApp Outreach
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold text-slate-800">
                  Intelligent Slot Booking & Real-Time Client Notifications
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"></span>
                <span className="font-semibold text-slate-800">
                  Two-Factor Email Authentication & Anti-Bot Shield Protection
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-[11px] font-medium text-slate-500 flex items-center justify-between">
            <span>Vyapar Wallah Operating Portal</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ShieldCheck size={12} /> 2FA Secured
            </span>
          </div>
        </div>

        {/* Right Authentication Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
          {step === 'credentials' ? (
            <div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Secure Access</p>
                <h3 className="text-2xl font-bold text-brand-navy mt-1">Sign In to Portal</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter your account credentials and solve the anti-bot challenge</p>
              </div>

              <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">Email Address</label>
                  <div className="relative mt-1">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@vyaparwallah.com"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">Password</label>
                  <div className="relative mt-1">
                    <LockKeyhole size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                {/* Anti-Bot Interactive CAPTCHA */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <LoginCaptcha
                    ref={captchaRef}
                    onVerifyChange={(verified) => setIsCaptchaVerified(verified)}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  disabled={loading}
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white transition hover:bg-brand-orangeHover shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Verifying & Sending OTP...' : 'Continue with 2FA Verification'}
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          ) : (
            /* Step 2: 6-Digit Email OTP Verification Screen */
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                  setSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-3"
              >
                <ArrowLeft size={14} /> Back to credentials
              </button>

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-brand-orange">
                  <KeyRound size={13} /> Two-Factor Authentication
                </div>
                <h3 className="text-2xl font-bold text-brand-navy mt-2">Enter 6-Digit Security Code</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  We sent a verification code to <strong className="text-slate-900">{email}</strong>. Enter it below to complete sign-in.
                </p>
              </div>

              {devOtpHint && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-center justify-between">
                  <span>💡 <strong>Dev Preview Code:</strong> <code className="font-mono font-black text-amber-950 text-sm tracking-widest">{devOtpHint}</code></span>
                  <span className="text-[10px] text-amber-700 font-semibold">(SMTP fallback mode)</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    6-Digit One-Time Password (OTP)
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full tracking-[10px] text-center font-mono text-2xl font-black rounded-xl border border-slate-300 py-3 text-brand-navy outline-none focus:border-brand-orange shadow-2xs"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 text-center">⏱️ Code expires in 5 minutes</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && !error && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  disabled={loading || otp.length !== 6}
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy py-3 text-sm font-bold text-white transition hover:bg-brand-navy/90 shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Verifying OTP...' : 'Verify Code & Sign In'}
                  <ArrowRight size={16} />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange hover:text-brand-orangeHover disabled:text-slate-400 transition"
                  >
                    <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Security Code'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
