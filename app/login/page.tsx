'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { ArrowRight, LockKeyhole, Mail, Shield, PhoneCall } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password. Please check your credentials.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-surface px-4 py-8 text-slate-900">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1fr_1fr]">
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
                <span className="font-semibold text-slate-800">High-Conversion Telecalling CRM & Instant WhatsApp Outreach</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold text-slate-800">Intelligent Slot Booking & Real-Time Client Notifications</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"></span>
                <span className="font-semibold text-slate-800">Centralized Team Workspace, Performance Tracking & Reports</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-[11px] font-medium text-slate-500">
            Vyapar Wallah Operating Portal • Enterprise Edition
          </div>
        </div>

        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Sign In</p>
            <h3 className="text-2xl font-bold text-brand-navy mt-1">Account Access</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter your email and password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white transition hover:bg-brand-orangeHover shadow-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
