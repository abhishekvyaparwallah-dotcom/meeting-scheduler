import { format, isBefore, isTuesday, parseISO, startOfDay } from 'date-fns';
import { DateSlotInfo, Meeting } from '@/lib/types';

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = Number(hoursStr) || 0;
  const minutes = minutesStr || '00';
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
}

export const WORK_START_MINUTES = 10 * 60; // 10:00 AM (600 mins)
export const WORK_END_MINUTES = 18 * 60;   // 06:00 PM (1080 mins)
export const MIN_GAP_MINUTES = 3 * 60;     // 3 Hours (180 mins)

export function isDateInPast(dateStr: string): boolean {
  try {
    const targetDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());
    return isBefore(targetDate, today);
  } catch {
    return false;
  }
}

export function isSlotInPast(dateStr: string, timeStr: string): boolean {
  try {
    const targetDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());
    if (isBefore(targetDate, today)) return true;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateStr === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = parseMinutes(timeStr);
      return slotMinutes <= currentMinutes;
    }
    return false;
  } catch {
    return false;
  }
}

export function getMaxMeetingsForDate(dateStr: string): number {
  try {
    const dateObj = parseISO(dateStr);
    return isTuesday(dateObj) ? 2 : 3;
  } catch {
    return 3;
  }
}

export function getDateSlotInfo(dateStr: string, allMeetings: Meeting[]): DateSlotInfo {
  const dateObj = parseISO(dateStr);
  const tuesday = isTuesday(dateObj);
  const isPast = isDateInPast(dateStr);
  const maxMeetings = tuesday ? 2 : 3;

  const dayMeetings = allMeetings.filter(
    (m) => m.date === dateStr && m.status !== 'cancelled'
  );
  const bookedCount = dayMeetings.length;
  const remainingSlots = Math.max(0, maxMeetings - bookedCount);

  let status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'PAST' = 'AVAILABLE';
  if (isPast) {
    status = 'PAST';
  } else if (bookedCount >= maxMeetings) {
    status = 'FULL';
  } else if (bookedCount > 0) {
    status = 'PARTIAL';
  }

  return {
    date: dateStr,
    isPast,
    isTuesday: tuesday,
    maxMeetings,
    bookedCount,
    remainingSlots,
    status,
    meetings: dayMeetings,
  };
}

export function getPossibleTimeSlots(): { value: string; label: string }[] {
  return [
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '13:00', label: '01:00 PM' },
    { value: '14:00', label: '02:00 PM' },
    { value: '15:00', label: '03:00 PM' },
    { value: '16:00', label: '04:00 PM' },
    { value: '17:00', label: '05:00 PM' },
    { value: '18:00', label: '06:00 PM' },
  ];
}

export function validateMeetingSlot(
  allMeetings: Meeting[],
  dateStr: string,
  timeStr: string,
  excludeMeetingId?: string
): { valid: boolean; message?: string } {
  if (isDateInPast(dateStr)) {
    return {
      valid: false,
      message: 'Cannot book meetings on past dates. Please select today or a future date.',
    };
  }

  if (isSlotInPast(dateStr, timeStr)) {
    return {
      valid: false,
      message: 'This time slot has already passed today. Please select an upcoming time slot.',
    };
  }

  const targetMinutes = parseMinutes(timeStr);

  if (targetMinutes < WORK_START_MINUTES || targetMinutes > WORK_END_MINUTES) {
    return {
      valid: false,
      message: 'Meetings can only be scheduled between 10:00 AM and 06:00 PM.',
    };
  }

  const existingMeetings = allMeetings.filter(
    (m) =>
      m.date === dateStr &&
      m.status !== 'cancelled' &&
      m.id !== excludeMeetingId
  );

  const maxAllowed = getMaxMeetingsForDate(dateStr);
  if (existingMeetings.length >= maxAllowed) {
    const isTue = isTuesday(parseISO(dateStr));
    return {
      valid: false,
      message: isTue
        ? 'Tuesday limit reached! Maximum 2 meetings are allowed on Tuesdays.'
        : 'Daily limit reached! Maximum 3 meetings are allowed per day.',
    };
  }

  for (const m of existingMeetings) {
    const existingMinutes = parseMinutes(m.time);
    const diff = Math.abs(targetMinutes - existingMinutes);
    if (diff < MIN_GAP_MINUTES) {
      return {
        valid: false,
        message: `Conflict with meeting at ${formatTime12h(m.time)} (${m.clientName}). A mandatory 3-hour gap is required between meetings.`,
      };
    }
  }

  return { valid: true };
}

export function getAvailableSlotsForDate(
  dateStr: string,
  allMeetings: Meeting[]
): { time: string; label: string; available: boolean; isPast: boolean; reason?: string }[] {
  const slots = getPossibleTimeSlots();
  return slots.map((slot) => {
    const isPast = isSlotInPast(dateStr, slot.value);
    const validation = validateMeetingSlot(allMeetings, dateStr, slot.value);
    return {
      time: slot.value,
      label: slot.label,
      available: validation.valid,
      isPast,
      reason: validation.message,
    };
  });
}

export function getTodayMeetings(meetings: Meeting[]): Meeting[] {
  const todayKey = toDateKey(startOfDay(new Date()));
  return meetings.filter((m) => m.date === todayKey && m.status !== 'cancelled');
}

export function sortMeetings(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.time.localeCompare(b.time);
  });
}

export function getRevenueSummary(meetings: Meeting[]) {
  return meetings.reduce(
    (acc, m) => {
      if (m.convertedToClient && m.dealAmount) {
        acc.revenue += m.dealAmount;
      }
      if (m.acquisitionExpense) {
        acc.expense += m.acquisitionExpense;
      }
      return acc;
    },
    { revenue: 0, expense: 0 }
  );
}

export function meetingDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}
