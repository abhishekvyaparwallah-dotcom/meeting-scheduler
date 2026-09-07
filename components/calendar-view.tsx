'use client';

import { useMemo } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatTime12h, getDateSlotInfo, toDateKey } from '@/lib/meeting-utils';
import { Meeting } from '@/lib/types';

type Props = {
  meetings: Meeting[];
  month: Date;
  isAdmin?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateKey: string) => void;
  onOpenMeeting: (meeting: Meeting) => void;
};

export default function CalendarView({
  meetings,
  month,
  isAdmin = false,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onOpenMeeting,
}: Props) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-orange"></span>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Scheduling Calendar</p>
          </div>
          <h2 className="text-2xl font-bold text-brand-navy">{format(month, 'MMMM yyyy')}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Available (Green)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-amber-700 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            Partially Booked (Yellow)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-rose-700 border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            Fully Booked (Red)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-slate-500 border border-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            Past Date (Gray)
          </span>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              type="button"
              onClick={onPrevMonth}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-slate-400">
        <span>Mon</span>
        <span className="text-brand-orange font-extrabold">Tue (Max 2)</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const currentMonth = isSameMonth(day, month);
          const today = isToday(day);
          const slotInfo = getDateSlotInfo(dateKey, meetings);

          let tileBorder = 'border-slate-200';
          let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          let statusText = `${slotInfo.remainingSlots} open`;
          const canClick = !isAdmin && currentMonth && !slotInfo.isPast && slotInfo.status !== 'FULL';

          if (slotInfo.isPast) {
            tileBorder = 'border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed';
            badgeBg = 'bg-slate-200 text-slate-500 border-slate-300';
            statusText = 'PAST';
          } else if (slotInfo.status === 'FULL') {
            tileBorder = 'border-rose-300 bg-rose-50/40 cursor-not-allowed';
            badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
            statusText = `FULL (${slotInfo.bookedCount}/${slotInfo.maxMeetings})`;
          } else if (slotInfo.status === 'PARTIAL') {
            tileBorder = `border-amber-300 bg-amber-50/30 ${isAdmin ? 'cursor-default' : 'cursor-pointer'}`;
            badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
            statusText = `${slotInfo.remainingSlots} left (${slotInfo.bookedCount}/${slotInfo.maxMeetings})`;
          }

          return (
            <div
              key={dateKey}
              onClick={() => {
                if (canClick) {
                  onSelectDate(dateKey);
                }
              }}
              className={`group flex min-h-[115px] flex-col justify-between rounded-xl border p-2.5 transition ${tileBorder} ${
                !currentMonth
                  ? 'opacity-30 bg-slate-50 cursor-not-allowed'
                  : canClick
                  ? 'hover:border-brand-orange hover:shadow-md cursor-pointer'
                  : 'cursor-default'
              } ${today ? 'ring-2 ring-brand-orange ring-offset-1' : ''}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`text-sm font-bold ${
                    today
                      ? 'rounded-full bg-brand-orange px-2 py-0.5 text-white'
                      : slotInfo.isPast
                      ? 'text-slate-400'
                      : currentMonth
                      ? 'text-brand-navy'
                      : 'text-slate-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {currentMonth && (
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badgeBg}`}>
                    {statusText}
                  </span>
                )}
              </div>

              <div className="mt-1.5 space-y-1">
                {slotInfo.meetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMeeting(meeting);
                    }}
                    className="w-full truncate rounded-md bg-brand-navy px-1.5 py-1 text-left text-[11px] font-medium text-white transition hover:bg-brand-orange"
                    title={`${formatTime12h(meeting.time)} - ${meeting.clientName} (${meeting.clientType})`}
                  >
                    <span className="font-bold text-brand-orange font-mono mr-1">{formatTime12h(meeting.time)}</span>
                    <span className="text-slate-200">{meeting.clientName}</span>
                  </button>
                ))}
              </div>

              {slotInfo.isTuesday && currentMonth && !slotInfo.isPast && slotInfo.meetings.length === 0 && (
                <p className="text-[10px] font-semibold text-brand-orange/80 mt-1">Tuesday (Max 2)</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-brand-orange" />
          <span><strong>Working Hours:</strong> 10:00 AM – 06:00 PM</span>
        </div>
        <div>
          <span><strong>Mandatory Buffer:</strong> Min. 3 Hours between meetings</span>
        </div>
        <div>
          <span><strong>Daily Cap:</strong> Max 3 meets/day (Tuesdays: Max 2 meets)</span>
        </div>
      </div>
    </div>
  );
}
