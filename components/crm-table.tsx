'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, MapPin, Phone, Edit, Trash2, ExternalLink, MessageCircle } from 'lucide-react';
import { formatTime12h } from '@/lib/meeting-utils';
import { generateWhatsAppLink, getMeetingWhatsAppMessage } from '@/utils/fast2sms';
import { Meeting } from '@/lib/types';

type Props = {
  meetings: Meeting[];
  isAdmin?: boolean;
  onSelectMeeting: (meeting: Meeting) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onConvertMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meeting: Meeting) => Promise<void>;
};

export default function CRMTable({
  meetings,
  isAdmin = false,
  onSelectMeeting,
  onEditMeeting,
  onConvertMeeting,
  onDeleteMeeting,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = meetings.filter((m) => {
    const matchesSearch =
      m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      (m.businessAddress && m.businessAddress.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'ALL' || m.clientType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client name, phone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-brand-orange focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Category:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand-orange"
          >
            <option value="ALL">All Categories</option>
            <option value="School / Coaching">School / Coaching</option>
            <option value="Clinic / Hospital">Clinic / Hospital</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="p-3.5">Date & Time</th>
              <th className="p-3.5">Client & Category</th>
              <th className="p-3.5">Phone</th>
              <th className="p-3.5">Navigation / Maps</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((meeting) => (
              <tr key={meeting.id} className="hover:bg-slate-50/80 transition">
                <td className="p-3.5 whitespace-nowrap">
                  <div className="font-bold text-brand-navy">
                    {format(parseISO(meeting.date), 'dd MMM yyyy')}
                  </div>
                  <div className="text-xs font-mono font-bold text-brand-orange mt-0.5">
                    ⏰ {formatTime12h(meeting.time)}
                  </div>
                </td>

                <td className="p-3.5">
                  <div className="font-bold text-slate-900">{meeting.clientName}</div>
                  <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                    {meeting.clientType || 'School / Coaching'}
                  </span>
                </td>

                <td className="p-3.5 whitespace-nowrap font-mono font-medium text-slate-700">
                  <a
                    href={`tel:${meeting.phone.replace(/\s+/g, '')}`}
                    className="hover:text-brand-orange flex items-center gap-1.5"
                  >
                    <Phone size={13} className="text-emerald-600" />
                    {meeting.phone}
                  </a>
                </td>

                <td className="p-3.5 max-w-xs">
                  {meeting.mapsLink ? (
                    <a
                      href={meeting.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                    >
                      <MapPin size={12} /> Open Maps Link <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">{meeting.businessAddress || 'Location Confirmed'}</span>
                  )}
                </td>

                <td className="p-3.5 whitespace-nowrap">
                  {meeting.convertedToClient ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                      {isAdmin ? `Converted (₹${meeting.dealAmount?.toLocaleString('en-IN') || 0})` : 'Completed'}
                    </span>
                  ) : meeting.status === 'completed' ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                      Completed
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                      Scheduled
                    </span>
                  )}
                </td>

                <td className="p-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {isAdmin && (
                      <a
                        href={generateWhatsAppLink(meeting.phone, getMeetingWhatsAppMessage(meeting))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition"
                        title="Send WhatsApp Confirmation to Client"
                      >
                        <MessageCircle size={13} />
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectMeeting(meeting)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      title="View Details"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditMeeting(meeting)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      title="Edit / Reschedule"
                    >
                      <Edit size={14} />
                    </button>
                    {isAdmin && !meeting.convertedToClient && (
                      <button
                        type="button"
                        onClick={() => onConvertMeeting(meeting)}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        title="Convert to Client"
                      >
                        Convert
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteMeeting(meeting)}
                      className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                      title="Cancel Meeting"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                  No meetings found matching search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
