'use client';

import { useState } from 'react';
import { IndianRupee, DollarSign, X } from 'lucide-react';
import { Meeting } from '@/lib/types';

type Props = {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onConvert: (payload: {
    meetingId: string;
    dealAmount: number;
    contractDuration: string;
    acquisitionExpense: number;
    nextFollowUp: string;
  }) => Promise<void>;
};

export default function ClientConversionModal({ open, meeting, onClose, onConvert }: Props) {
  const [dealAmount, setDealAmount] = useState('35000');
  const [contractDuration, setContractDuration] = useState('1 Year');
  const [acquisitionExpense, setAcquisitionExpense] = useState('5000');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open || !meeting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConvert({
        meetingId: meeting.id,
        dealAmount: Number(dealAmount) || 0,
        contractDuration,
        acquisitionExpense: Number(acquisitionExpense) || 0,
        nextFollowUp: nextFollowUp || meeting.date,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Deal Closed</span>
            <h3 className="text-xl font-bold text-brand-navy">Convert Lead to Client</h3>
            <p className="text-xs text-slate-500">{meeting.clientName} ({meeting.clientType})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600">Deal Closure Value (₹) *</label>
            <div className="relative mt-1">
              <IndianRupee size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="number"
                required
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600">Contract Duration *</label>
            <select
              value={contractDuration}
              onChange={(e) => setContractDuration(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="3 Months">3 Months</option>
              <option value="6 Months">6 Months</option>
              <option value="1 Year">1 Year</option>
              <option value="2 Years">2 Years</option>
              <option value="One-time Service">One-time Service</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600">Client Acquisition Expense (₹)</label>
            <div className="relative mt-1">
              <DollarSign size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="number"
                value={acquisitionExpense}
                onChange={(e) => setAcquisitionExpense(e.target.value)}
                placeholder="Travel, demo, ad cost (e.g. 5000)"
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600">Next Follow-up / Renewal Date</label>
            <input
              type="date"
              value={nextFollowUp}
              onChange={(e) => setNextFollowUp(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 py-2 px-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Confirm Conversion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
