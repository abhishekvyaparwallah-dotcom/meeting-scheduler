'use client';

import { Bell, MapPin, Phone, X } from 'lucide-react';
import { formatTime12h } from '@/lib/meeting-utils';
import { Meeting } from '@/lib/types';

type Props = {
  meetings: Meeting[];
  open: boolean;
  onClose: () => void;
  onSelectMeeting?: (meeting: Meeting) => void;
};

export default function TodayAlertModal({ meetings, open, onClose, onSelectMeeting }: Props) {
  if (!open || meetings.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange text-white shadow-sm">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Daily Alert</p>
              <h3 className="text-lg font-bold text-brand-navy">
                Today Priority Meetings ({meetings.length})
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-orange hover:bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-brand-navy">{meeting.clientName}</h4>
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {meeting.clientType}
                    </span>
                  </div>
                  {meeting.businessAddress ? (
                    <p className="text-xs text-slate-500 mt-0.5">📍 {meeting.businessAddress}</p>
                  ) : null}
                </div>

                <span className="rounded-full bg-brand-navy px-3 py-1 font-mono text-xs font-bold text-brand-orange">
                  ⏰ {formatTime12h(meeting.time)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                <a
                  href={`tel:${meeting.phone.replace(/\s+/g, '')}`}
                  className="font-mono font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Phone size={12} /> {meeting.phone}
                </a>

                <div className="flex items-center gap-2">
                  {meeting.mapsLink && (
                    <a
                      href={meeting.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-blue hover:underline flex items-center gap-1"
                    >
                      <MapPin size={12} /> Navigation
                    </a>
                  )}
                  {onSelectMeeting && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMeeting(meeting);
                        onClose();
                      }}
                      className="font-bold text-brand-orange hover:underline"
                    >
                      Details &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-brand-navy px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            Acknowledge & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
