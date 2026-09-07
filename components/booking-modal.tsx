'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Phone, User, Building2, AlertTriangle, X } from 'lucide-react';
import { getAvailableSlotsForDate, validateMeetingSlot } from '@/lib/meeting-utils';
import { AppUser, CallingLead, ClientType, Meeting, UserRole } from '@/lib/types';

type Props = {
  open: boolean;
  date: string | null;
  meetings: Meeting[];
  editingMeeting: Meeting | null;
  prefilledLead?: CallingLead | null;
  employees: AppUser[];
  role: UserRole;
  currentEmployeeId: string;
  onClose: () => void;
  onSave: (payload: Partial<Meeting> & { date: string; time: string }) => Promise<void>;
};

export default function BookingModal({
  open,
  date,
  meetings,
  editingMeeting,
  prefilledLead,
  employees,
  role,
  currentEmployeeId,
  onClose,
  onSave,
}: Props) {
  const [targetDate, setTargetDate] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('School / Coaching');
  const [phone, setPhone] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [mapsLink, setMapsLink] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingMeeting) {
      setTargetDate(editingMeeting.date);
      setClientName(editingMeeting.clientName);
      setClientType(editingMeeting.clientType ?? 'School / Coaching');
      setPhone(editingMeeting.phone);
      setSelectedTime(editingMeeting.time);
      setMapsLink(editingMeeting.mapsLink ?? '');
      setNotes(editingMeeting.notes ?? '');
      setAssignedEmployeeId(editingMeeting.assignedEmployeeId);
    } else if (prefilledLead) {
      setTargetDate(date || format(new Date(), 'yyyy-MM-dd'));
      setClientName(prefilledLead.clientName);
      setClientType(prefilledLead.clientType);
      setPhone(prefilledLead.phone);
      setSelectedTime('10:00');
      setMapsLink('');
      setNotes(prefilledLead.notes ?? '');
      setAssignedEmployeeId(prefilledLead.assignedEmployeeId || currentEmployeeId);
    } else {
      setTargetDate(date || format(new Date(), 'yyyy-MM-dd'));
      setClientName('');
      setClientType('School / Coaching');
      setPhone('');
      setSelectedTime('10:00');
      setMapsLink('');
      setNotes('');
      setAssignedEmployeeId(currentEmployeeId);
    }
    setErrorBanner('');
  }, [open, date, editingMeeting, prefilledLead, currentEmployeeId]);

  const slotOptions = targetDate ? getAvailableSlotsForDate(targetDate, meetings) : [];

  useEffect(() => {
    if (!open || !targetDate || slotOptions.length === 0) return;
    const currentSelectedSlot = slotOptions.find((s) => s.time === selectedTime);
    if (!currentSelectedSlot || (!currentSelectedSlot.available && !editingMeeting)) {
      const firstAvailable = slotOptions.find((s) => s.available);
      if (firstAvailable) {
        setSelectedTime(firstAvailable.time);
      }
    }
  }, [targetDate, meetings, open, editingMeeting]);

  if (!open || !targetDate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner('');

    if (!clientName.trim() || !phone.trim() || !selectedTime) {
      setErrorBanner('Please fill all required fields: Client Name, Phone, and Time Slot.');
      return;
    }

    const validation = validateMeetingSlot(
      meetings,
      targetDate,
      selectedTime,
      editingMeeting?.id
    );

    if (!validation.valid) {
      setErrorBanner(validation.message ?? 'Invalid meeting slot.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        date: targetDate,
        time: selectedTime,
        clientName: clientName.trim(),
        clientType,
        phone: phone.trim(),
        businessAddress: prefilledLead?.city || '',
        mapsLink: mapsLink.trim() || undefined,
        notes: notes.trim() || undefined,
        assignedEmployeeId: role === 'ADMIN' ? assignedEmployeeId : currentEmployeeId,
        leadId: prefilledLead?.id || editingMeeting?.leadId,
      });
      onClose();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to save meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-orange"></span>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                {editingMeeting ? 'Edit Meeting' : 'Book New Meeting'}
              </p>
            </div>
            <h2 className="text-xl font-bold text-brand-navy">
              {format(parseISO(targetDate), 'EEEE, dd MMMM yyyy')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {errorBanner && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <AlertTriangle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <span>{errorBanner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 mb-1.5">
              <span>Select Time Slot (10 AM - 6 PM)</span>
              <span className="text-[11px] font-normal text-brand-orange">Mandatory 3-Hr Gap Enforced</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {slotOptions.map((slot) => {
                const isSelected = selectedTime === slot.time;
                const isPast = slot.isPast;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={isPast || (!slot.available && !isSelected)}
                    onClick={() => {
                      if (!isPast && (slot.available || isSelected)) {
                        setSelectedTime(slot.time);
                      }
                    }}
                    className={`rounded-xl border py-2.5 px-2 text-xs font-bold transition flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-brand-orange bg-brand-orange text-white shadow-sm'
                        : isPast
                        ? 'border-slate-200 bg-slate-100/80 text-slate-400 cursor-not-allowed opacity-40'
                        : slot.available
                        ? 'border-slate-200 bg-slate-50 text-slate-800 hover:border-brand-orange hover:bg-white'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                    }`}
                    title={isPast ? 'Time has already passed today' : slot.reason || 'Available'}
                  >
                    <span className={isPast ? 'line-through decoration-slate-400' : ''}>{slot.label}</span>
                    <span className="text-[9px] font-normal mt-0.5">
                      {isSelected ? 'Selected' : isPast ? 'Passed' : slot.available ? 'Available' : 'Blocked'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600">Client / Business Name *</label>
              <div className="relative mt-1">
                <User size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600">Client Type / Profession *</label>
              <div className="relative mt-1">
                <Building2 size={15} className="absolute left-3 top-3 text-slate-400" />
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value as ClientType)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand-orange"
                >
                  <option value="School / Coaching">School / Coaching</option>
                  <option value="Clinic / Hospital">Clinic / Hospital</option>
                </select>
              </div>
            </div>

            <div className={role === 'ADMIN' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-bold uppercase text-slate-600">Mobile Number (WhatsApp) *</label>
              <div className="relative mt-1">
                <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            {role === 'ADMIN' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Assigned Staff</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-orange"
                >
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">Google Maps Navigation Link (Optional)</label>
              <input
                type="url"
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="mt-1 w-full rounded-xl border border-slate-300 py-2 px-3 text-sm outline-none focus:border-brand-orange"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">Discussion Notes / Agenda</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Demo requirements, packages to present..."
                className="mt-1 w-full rounded-xl border border-slate-300 py-2 px-3 text-sm outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-orange px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-orangeHover disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : editingMeeting ? 'Update Meeting' : 'Book & Send SMS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
