'use client';

import React, { useState } from 'react';
import { BookOpen, Copy, Check, Stethoscope, GraduationCap, ShieldAlert, Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
  customScript?: string;
}

export default function CallingScriptModal({
  isOpen,
  onClose,
  employeeName = 'Telecaller',
  customScript = '',
}: Props) {
  const [activeCategory, setActiveCategory] = useState<'CUSTOM' | 'CLINIC' | 'SCHOOL' | 'OBJECTIONS'>(
    customScript.trim() ? 'CUSTOM' : 'CLINIC'
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clinicScript = `Namaste Dr. Sahib,

Mai ${employeeName} baat kar raha hu Vyapar Wallah Health-Tech Team se.

Dr. Sahib, hum aapke clinic/hospital ke patient appointments aur automatic WhatsApp reminders ke regarding connect kar rahe hain. 

Aapke clinic par jo patients ka no-show ya appointment scheduling aur billing ka time lagta hai, usko hum completely 1-click automated bana dete hain. Isme patient ko appointment book hote hi clinic ke naam se WhatsApp reminder chala jata hai aur follow-up miss nahi hota.

Kya hum kal 10:00 AM ya 01:00 PM par ek quick 10-minute ka live system demo schedule kar sakte hain?`;

  const schoolScript = `Namaste Sir/Madam,

Mai ${employeeName} baat kar raha hu Vyapar Wallah Education Technology se.

Sir, hum aapke school/coaching institute ke student fees collection aur parent communication automation ke silsile me baat kar rahe hain.

Is system se parents ko WhatsApp par automated fee due alerts, daily attendance aur exam report cards chale jaate hain jisse 100% on-time fee recovery hoti hai. Institute ke liye bilkul hassle-free hai aur accounts ka load 80% kam ho jata hai.

Aapke convenience ke hisab se, kya kal 10:00 AM ya 01:00 PM par ek short 10-min live demo fix kar lein?`;

  const objections = [
    {
      objection: '❌ Client: "Abhi mai bohot busy hu, baad me call karo."',
      response: `Bilkul Sir/Madam, mai samajh sakta hu aap busy honge. Hum kal exact 04:00 PM par 2 minute ke liye connect kar lenge taaki aapka time waste na ho. Have a great day!`,
    },
    {
      objection: '❌ Client: "Hamare paas pehle se hi software chal raha hai."',
      response: `Bohot badiya Sir! Hamara system aapke existing software ke sath directly WhatsApp API sync kar deta hai taaki automated updates mil sakein. Ek bar 5 minute ka demo dekh lijiye, pasand aaye toh hi aage sochiye.`,
    },
    {
      objection: '❌ Client: "Pehle charges / price batao, tab demo lenge."',
      response: `Sir, hamare plans bohot hi pocket-friendly hain (₹999/month se start) aur aapke student/patient size par depend karte hain. Demo me hum aapke exact workflow ke hisab se customised plan dikha denge.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-brand-orange">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Telecaller Live Teleprompter</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Phone Speaking Guide
                </span>
              </div>
              <h2 className="text-xl font-bold text-brand-navy">Live Calling Script & Talking Guide</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 overflow-x-auto">
          {customScript?.trim() && (
            <button
              type="button"
              onClick={() => setActiveCategory('CUSTOM')}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
                activeCategory === 'CUSTOM'
                  ? 'border-brand-orange text-brand-orange bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={16} className="text-amber-500" />
              ⭐ Admin Assigned Script
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveCategory('CLINIC')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
              activeCategory === 'CLINIC'
                ? 'border-brand-orange text-brand-orange bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope size={16} />
            Doctor & Hospital Call Script
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('SCHOOL')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
              activeCategory === 'SCHOOL'
                ? 'border-brand-orange text-brand-orange bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={16} />
            School & Coaching Call Script
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('OBJECTIONS')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
              activeCategory === 'OBJECTIONS'
                ? 'border-brand-orange text-brand-orange bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert size={16} />
            Objection Answers (Call Par)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeCategory === 'CUSTOM' && customScript?.trim() && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">🗣️ Live Call Speaking Guide (Assigned by Admin)</h4>
                      <p className="text-[11px] text-amber-800">Phone call par client se baat karte waqt screen par dekh kar bolein.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(customScript, 99)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-amber-50 shadow-xs"
                  >
                    {copiedIndex === 99 ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Copy Script
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white p-4 rounded-lg border border-amber-200 shadow-inner">
                  {customScript}
                </pre>
              </div>
            </div>
          )}

          {activeCategory === 'CLINIC' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-brand-navy">Doctor & Hospital Call Script</h4>
                <button
                  type="button"
                  onClick={() => handleCopy(clinicScript, 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs"
                >
                  {copiedIndex === 1 ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      Copy Script
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white p-4 rounded-lg border border-slate-200">
                {clinicScript}
              </pre>
            </div>
          )}

          {activeCategory === 'SCHOOL' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-brand-navy">School & Coaching Call Script</h4>
                <button
                  type="button"
                  onClick={() => handleCopy(schoolScript, 2)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs"
                >
                  {copiedIndex === 2 ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      Copy Script
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white p-4 rounded-lg border border-slate-200">
                {schoolScript}
              </pre>
            </div>
          )}

          {activeCategory === 'OBJECTIONS' && (
            <div className="space-y-4">
              {objections.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-rose-700">{item.objection}</h4>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.response, idx + 20)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs"
                    >
                      {copiedIndex === idx + 20 ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          Copy Reply
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    <p className="font-semibold text-emerald-800">💡 Winning Answer:</p>
                    <p className="mt-1">{item.response}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-500">
            Tip: Always confirm the exact time slot (10:00 AM / 01:00 PM / 04:00 PM) before ending the call.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-brand-navy px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Got it, Let's Call!
          </button>
        </div>
      </div>
    </div>
  );
}
