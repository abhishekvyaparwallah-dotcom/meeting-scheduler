'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  PhoneCall,
  CalendarPlus,
  Clock,
  PhoneOff,
  Plus,
  Search,
  FileSpreadsheet,
  UploadCloud,
  MessageSquare,
  BookOpen,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Target,
  Share2,
  Users,
  UserCheck,
  BarChart3,
  Award,
  Calendar,
  CalendarRange,
  Database,
} from 'lucide-react';
import { AppUser, AuditLog, CallDisposition, CallingLead, ClientType } from '@/lib/types';
import LeadImportModal from './lead-import-modal';
import CallingScriptModal from './calling-script-modal';
import CelebrationModal from './celebration-modal';
import DateWiseReportModal from './datewise-report-modal';
import LeadAllocationModal from './lead-allocation-modal';
import { generateWhatsAppLink, getLeadIntroWhatsAppMessage } from '@/utils/fast2sms';

type Props = {
  leads: CallingLead[];
  users: AppUser[];
  auditLogs?: AuditLog[];
  isAdmin: boolean;
  onUpdateLeadStatus: (leadId: string, status: CallDisposition, notes?: string, callbackTime?: string) => Promise<void>;
  onBookMeetingFromLead: (lead: CallingLead) => void;
  onAddNewLead: (newLeads: Partial<CallingLead> | Partial<CallingLead>[]) => Promise<void>;
  onAllocateLeads?: (params: {
    mode: 'SPECIFIC_LEADS' | 'QUICK_COUNT' | 'DISTRIBUTE_EQUALLY';
    leadIds?: string[];
    targetEmployeeId?: string;
    count?: number;
    countPerTelecaller?: number;
    telecallerIds?: string[];
  }) => Promise<void>;
  currentUserName?: string;
  currentEmployeeId?: string;
  currentDailyTarget?: number;
  currentScript?: string;
};

const DISPOSITION_CONFIG: Record<CallDisposition, { label: string; bg: string; text: string; border: string }> = {
  NEW: { label: 'New Lead', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CONNECTED: { label: 'Connected', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CALLBACK: { label: 'Callback Due', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEETING_BOOKED: { label: 'Meeting Fixed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  BUSY: { label: 'Callback / Busy', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CALL_CUT: { label: 'Ringing / Cut', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  NOT_INTERESTED: { label: 'Not Interested', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
};

// Helper to format callback date & time preview
function getFormattedDatePreview(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  try {
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const [hour, min] = (timeStr || '16:00').split(':').map(Number);
    const d = new Date(yyyy, mm - 1, dd, hour, min);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

// Helper to extract clean Clinic / Hospital / Institution name for Card & Modal Headings
export function getClinicDisplayName(clientName?: string, doctorName?: string, institutionName?: string): string {
  if (institutionName && institutionName.trim()) {
    return institutionName.trim();
  }
  if (!clientName) return 'Unnamed Clinic';
  const match = clientName.match(/^[^(]+\(([^)]+)\)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return clientName.replace(/^(Dr\.|Dr|Doctor)\s+[A-Za-z\s.,'-]+[-–—|:]\s*/i, '').trim() || clientName;
}

// Helper to extract clean Doctor name
export function getDoctorDisplayName(doctorName?: string, clientName?: string, notes?: string): string {
  if (doctorName && doctorName.trim()) {
    const clean = doctorName.trim();
    return clean.toLowerCase().startsWith('dr') ? clean : `Dr. ${clean}`;
  }
  if (clientName) {
    const match = clientName.match(/^([^(]+)\(([^)]+)\)$/);
    if (match && match[1] && (match[1].toLowerCase().includes('dr') || match[1].toLowerCase().includes('doctor'))) {
      const doc = match[1].trim();
      return doc.toLowerCase().startsWith('dr') ? doc : `Dr. ${doc}`;
    }
    const docRegexMatch = clientName.match(/(?:Dr\.|Dr|Doctor)\s+[A-Za-z\s.,'-]+/i);
    if (docRegexMatch) return docRegexMatch[0].trim();
  }
  if (notes) {
    const noteMatch = notes.match(/(?:Dr\.|Dr|Doctor)\s+[A-Za-z\s.,'-]+/i);
    if (noteMatch) return noteMatch[0].trim();
  }
  return '';
}

export default function CallingCRMView({
  leads,
  users,
  auditLogs = [],
  isAdmin,
  onUpdateLeadStatus,
  onBookMeetingFromLead,
  onAddNewLead,
  onAllocateLeads,
  currentUserName = 'Telecaller',
  currentEmployeeId = '',
  currentDailyTarget,
  currentScript,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<CallingLead | null>(null);
  const [statusForm, setStatusForm] = useState<{
    status: CallDisposition;
    notes: string;
    callbackDate: string;
    callbackTimeOnly: string;
  }>({
    status: 'CONNECTED',
    notes: '',
    callbackDate: new Date().toISOString().slice(0, 10),
    callbackTimeOnly: '16:00',
  });
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showDateWiseReportModal, setShowDateWiseReportModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  // Unassigned pool count
  const unassignedPoolCount = useMemo(() => {
    return leads.filter(
      (l) =>
        !l.assignedEmployeeId ||
        l.assignedEmployeeId === 'UNASSIGNED' ||
        l.assignedEmployeeId === 'ADMIN' ||
        l.assignedEmployeeId === 'EMP-1001'
    ).length;
  }, [leads]);

  // Admin performance date filter
  const [perfDateFilter, setPerfDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [perfCustomFrom, setPerfCustomFrom] = useState('');
  const [perfCustomTo, setPerfCustomTo] = useState('');

  // Daily celebration key for localStorage (e.g. target_celebrated_EMP-1004_2026-09-07)
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const celebrationKey = useMemo(() => {
    const id = currentEmployeeId || currentUserName || 'telecaller';
    return `target_celebration_seen_${id}_${todayDateStr}`;
  }, [currentEmployeeId, currentUserName, todayDateStr]);

  const [hasCelebrated, setHasCelebrated] = useState(() => {
    if (typeof window !== 'undefined') {
      const id = currentEmployeeId || currentUserName || 'telecaller';
      const key = `target_celebration_seen_${id}_${new Date().toISOString().slice(0, 10)}`;
      return localStorage.getItem(key) === 'true';
    }
    return false;
  });

  // Current logged in Telecaller user
  const currentTelecaller = useMemo(() => {
    return users.find(
      (u) =>
        u.role === 'TELECALLER' &&
        (u.employeeId === currentEmployeeId ||
          u.id === currentEmployeeId ||
          u.name.toLowerCase() === currentUserName.toLowerCase())
    );
  }, [users, currentUserName, currentEmployeeId]);

  // Telecaller assigned custom script
  const telecallerScript = useMemo(() => {
    return currentTelecaller?.customScript || currentScript || '';
  }, [currentTelecaller, currentScript]);

  // Calculated date range for Telecaller Performance monitor
  const perfDateRange = useMemo(() => {
    if (perfDateFilter === 'ALL') return null;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (perfDateFilter === 'TODAY') {
      return { from: today, to: today, label: 'Today' };
    }
    if (perfDateFilter === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      return { from: yStr, to: yStr, label: 'Yesterday' };
    }
    if (perfDateFilter === 'LAST_7_DAYS') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      return { from: d7.toISOString().slice(0, 10), to: today, label: 'Last 7 Days' };
    }
    if (perfDateFilter === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: firstDay.toISOString().slice(0, 10), to: today, label: 'This Month' };
    }
    if (perfDateFilter === 'CUSTOM') {
      return { from: perfCustomFrom || '1970-01-01', to: perfCustomTo || today, label: 'Custom Range' };
    }
    return null;
  }, [perfDateFilter, perfCustomFrom, perfCustomTo]);

  // Telecaller-specific performance breakdown for Admin (Date Filter Aware)
  const telecallerPerformance = useMemo(() => {
    const telecallers = users.filter((u) => u.role === 'TELECALLER');
    return telecallers.map((t) => {
      const userLeads = leads.filter(
        (l) => l.assignedEmployeeId === t.employeeId || l.assignedEmployeeId === t.name
      );

      let assignedLeads = userLeads;
      let actionLeads = userLeads;

      if (perfDateRange) {
        assignedLeads = userLeads.filter((l) => {
          const cDate = l.createdAt ? l.createdAt.slice(0, 10) : '';
          return (!perfDateRange.from || cDate >= perfDateRange.from) && (!perfDateRange.to || cDate <= perfDateRange.to);
        });
        actionLeads = userLeads.filter((l) => {
          const uDate = l.updatedAt ? l.updatedAt.slice(0, 10) : (l.createdAt ? l.createdAt.slice(0, 10) : '');
          return (!perfDateRange.from || uDate >= perfDateRange.from) && (!perfDateRange.to || uDate <= perfDateRange.to);
        });
      }

      const totalAssigned = assignedLeads.length;
      const connected = actionLeads.filter((l) => l.status === 'CONNECTED').length;
      const callbacks = actionLeads.filter((l) => l.status === 'CALLBACK').length;
      const booked = actionLeads.filter((l) => l.status === 'MEETING_BOOKED').length;
      const callCut = actionLeads.filter((l) => l.status === 'CALL_CUT' || l.status === 'BUSY').length;
      const notInterested = actionLeads.filter((l) => l.status === 'NOT_INTERESTED').length;
      const pendingNew = assignedLeads.filter((l) => l.status === 'NEW').length;
      // Daily completed target counts only finalized calls (excluding pending callbacks)
      const dialed = connected + booked + notInterested + callCut;
      const target = t.dailyTarget ?? 50;
      const progress = Math.min(100, Math.round((dialed / (target || 1)) * 100));

      return {
        user: t,
        totalAssigned,
        dialed,
        pendingNew,
        connected,
        callbacks,
        booked,
        busy: callCut,
        notInterested,
        progress,
        target,
      };
    });
  }, [users, leads, perfDateRange]);

  // Telecaller sees their assigned leads (+ unassigned pool). Admin sees all or selected staff
  const accessibleLeads = useMemo(() => {
    if (isAdmin) {
      if (selectedStaffFilter === 'ALL') return leads;
      if (selectedStaffFilter === 'UNASSIGNED') {
        return leads.filter(
          (l) =>
            !l.assignedEmployeeId ||
            l.assignedEmployeeId === 'UNASSIGNED' ||
            l.assignedEmployeeId === 'ADMIN' ||
            l.assignedEmployeeId === 'EMP-1001'
        );
      }
      return leads.filter(
        (l) =>
          l.assignedEmployeeId === selectedStaffFilter ||
          l.assignedEmployeeId === users.find((u) => u.id === selectedStaffFilter)?.employeeId ||
          l.assignedEmployeeId === users.find((u) => u.employeeId === selectedStaffFilter)?.name
      );
    }
    // For Telecaller: Show only leads specifically assigned to this telecaller (exclude unassigned pool)
    return leads.filter((l) => {
      if (!l.assignedEmployeeId || l.assignedEmployeeId === 'UNASSIGNED' || l.assignedEmployeeId === 'ADMIN') return false;
      if (currentEmployeeId && (l.assignedEmployeeId === currentEmployeeId || l.assignedEmployeeId.toLowerCase() === currentEmployeeId.toLowerCase())) return true;
      if (currentTelecaller && l.assignedEmployeeId === currentTelecaller.employeeId) return true;
      if (currentUserName && l.assignedEmployeeId === currentUserName) return true;
      return false;
    });
  }, [leads, isAdmin, selectedStaffFilter, users, currentTelecaller, currentUserName, currentEmployeeId]);

  // Telecaller active queue: ONLY shows NEW (uncalled) and CALLBACK (follow-ups).
  // Once dialed and given other dispositions (CONNECTED, BUSY, CALL_CUT, NOT_INTERESTED, MEETING_BOOKED),
  // they are removed from the Telecaller's active queue, but remain 100% saved in the Admin CRM database.
  const visibleQueueLeads = useMemo(() => {
    return accessibleLeads.filter((l) => {
      if (!isAdmin) {
        return l.status === 'NEW' || l.status === 'CALLBACK';
      }
      return true;
    });
  }, [accessibleLeads, isAdmin]);

  // Priority Callback leads
  const callbackLeads = useMemo(() => {
    return visibleQueueLeads.filter((l) => l.status === 'CALLBACK');
  }, [visibleQueueLeads]);

  // Scorecard Metrics
  const scorecard = useMemo(() => {
    const totalAssigned = accessibleLeads.length;
    const connectedCount = accessibleLeads.filter((l) => l.status === 'CONNECTED').length;
    const callbacksCount = accessibleLeads.filter((l) => l.status === 'CALLBACK').length;
    const bookedCount = accessibleLeads.filter((l) => l.status === 'MEETING_BOOKED').length;
    const callCutCount = accessibleLeads.filter((l) => l.status === 'CALL_CUT' || l.status === 'BUSY').length;
    const notInterestedCount = accessibleLeads.filter((l) => l.status === 'NOT_INTERESTED').length;
    // Completed dials (callbacks are excluded from completed daily target count)
    const dialedCount = connectedCount + bookedCount + notInterestedCount + callCutCount;
    const telecallers = users.filter((u) => u.role === 'TELECALLER');
    const dailyTarget = isAdmin
      ? telecallers.reduce((sum, u) => sum + (u.dailyTarget ?? 3), 0) || 3
      : (currentDailyTarget ?? currentTelecaller?.dailyTarget ?? 3);
    const targetProgress = Math.min(100, Math.round((dialedCount / (dailyTarget || 1)) * 100));

    return {
      totalAssigned,
      dialedCount,
      connectedCount,
      callbacksCount,
      bookedCount,
      busyCount: callCutCount,
      notInterestedCount,
      dailyTarget,
      targetProgress,
    };
  }, [accessibleLeads, isAdmin, users, currentTelecaller]);

  // Trigger celebration popup and confetti ONLY once when daily call target is newly reached
  useEffect(() => {
    if (!isAdmin && scorecard.dailyTarget > 0 && scorecard.dialedCount >= scorecard.dailyTarget) {
      if (!hasCelebrated) {
        if (typeof window !== 'undefined') {
          const alreadySeen = localStorage.getItem(celebrationKey) === 'true';
          if (!alreadySeen) {
            setShowCelebration(true);
            setHasCelebrated(true);
            localStorage.setItem(celebrationKey, 'true');
          }
        }
      }
    }
  }, [isAdmin, scorecard.dialedCount, scorecard.dailyTarget, hasCelebrated, celebrationKey]);

  const filteredLeads = useMemo(() => {
    return visibleQueueLeads.filter((l) => {
      const matchesFilter = filterStatus === 'ALL' || l.status === filterStatus;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        l.clientName.toLowerCase().includes(term) ||
        (Boolean(l.doctorName) && l.doctorName!.toLowerCase().includes(term)) ||
        l.phone.includes(searchTerm) ||
        l.city.toLowerCase().includes(term) ||
        l.clientType.toLowerCase().includes(term) ||
        (Boolean(l.notes) && l.notes!.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [visibleQueueLeads, filterStatus, searchTerm]);

  const handleOpenStatusModal = (lead: CallingLead, initialStatus?: CallDisposition) => {
    setSelectedLeadForStatus(lead);

    let initialDate = new Date().toISOString().slice(0, 10);
    let initialTime = '16:00';

    if (lead.callbackTime) {
      const dateMatch = lead.callbackTime.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        initialDate = dateMatch[1];
      }
      const timeMatch = lead.callbackTime.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) {
        initialTime = timeMatch[1].padStart(5, '0');
      }
    } else {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      initialTime = `${hh}:${mm}`;
    }

    // Clean legacy "Dr: ..." notes so telecallers write actual call feedback
    const cleanNotes =
      lead.notes &&
      !lead.notes.toLowerCase().startsWith('dr:') &&
      !lead.notes.toLowerCase().startsWith('dr :')
        ? lead.notes
        : '';

    setStatusForm({
      status: initialStatus || lead.status || 'CONNECTED',
      notes: cleanNotes,
      callbackDate: initialDate,
      callbackTimeOnly: initialTime,
    });
  };

  const handleSaveStatus = async () => {
    if (!selectedLeadForStatus) return;

    if (!statusForm.notes.trim()) {
      alert('Kripya Call Notes / Discussion likhein (telecaller se client ki kya baat hui). Yeh zaroori (mandatory) hai.');
      return;
    }

    let computedCallbackTime = '';
    if (statusForm.status === 'CALLBACK') {
      computedCallbackTime = getFormattedDatePreview(
        statusForm.callbackDate,
        statusForm.callbackTimeOnly
      ) || `${statusForm.callbackDate} ${statusForm.callbackTimeOnly}`;
    }

    await onUpdateLeadStatus(
      selectedLeadForStatus.id,
      statusForm.status,
      statusForm.notes.trim(),
      computedCallbackTime
    );
    setSelectedLeadForStatus(null);
  };

  // 1-Click Fast Disposition Trigger
  const handleQuickDisposition = async (leadId: string, status: CallDisposition) => {
    await onUpdateLeadStatus(leadId, status);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
              {isAdmin ? 'Telecaller Calling CRM & Lead Engine' : `Calling CRM Workspace — ${currentUserName}`}
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Live Queue
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? 'Real-time outreach monitor, daily call target pacing, and bulk lead importer.'
              : 'Direct 1-click calling, immediate disposition logging, and meeting bookings.'}
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Master Lead Bank & Daily Dispatch Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAllocationModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:from-amber-600 hover:to-orange-600"
            >
              <Database size={17} />
              <span>Master Lead Bank & Dispatch ({unassignedPoolCount} Pool)</span>
            </button>
          )}

          {/* Date-Wise Report Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowDateWiseReportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/90 px-3.5 py-2.5 text-sm font-bold text-orange-900 shadow-2xs transition hover:bg-orange-100"
            >
              <Calendar className="text-brand-orange" size={17} />
              <span>Date-Wise Calling Report</span>
            </button>
          )}

          {/* Telecaller Playbook / Pitch Script Button */}
          <button
            type="button"
            onClick={() => setShowScriptModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-sm font-bold text-indigo-900 shadow-2xs transition hover:bg-indigo-100"
          >
            <BookOpen size={16} className="text-indigo-600" />
            <span>Calling Script & Objection Playbook</span>
          </button>

          {/* Bulk Import Leads Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddLeadModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-brand-orangeHover"
            >
              <FileSpreadsheet size={17} />
              Import & Assign Leads (Excel / CSV)
            </button>
          )}
        </div>
      </div>

      {/* Target Met Banner for Telecaller */}
      {!isAdmin && scorecard.dailyTarget > 0 && scorecard.dialedCount >= scorecard.dailyTarget && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-emerald-950">Daily Outreach Target Achieved!</p>
                <span className="rounded-md bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                  {scorecard.dialedCount} / {scorecard.dailyTarget} Calls (100%)
                </span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Aapka aaj ka target pura ho gaya hai. Aap priority callbacks aur remaining queue ko bina kisi rukawat ke follow-up kar sakte hain.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCelebration(true)}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition"
          >
            View Milestone
          </button>
        </div>
      )}

      {/* Scorecard Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {isAdmin ? 'Total Queue Leads' : 'My Assigned Leads'}
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">Active</span>
          </div>
          <p className="mt-2 text-2xl font-black text-brand-navy">{scorecard.totalAssigned} Leads</p>
          <p className="text-[11px] text-slate-400">
            {isAdmin ? 'Across company pool' : 'Assigned to your queue'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Calls Dialed / Attempted</span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {scorecard.connectedCount} Connected
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{scorecard.dialedCount} Calls</p>
          <p className="text-[11px] text-slate-400">
            {scorecard.connectedCount} Connected • {scorecard.busyCount} Ringing/Busy
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Callbacks Pending</span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">Priority</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{scorecard.callbacksCount} Callbacks</p>
          <p className="text-[11px] text-slate-400">Scheduled for today</p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-brand-orange">
              {isAdmin ? 'Team Call Target' : 'Daily Call Target'}
            </span>
            <Target size={18} className="text-brand-orange" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-black text-slate-900">
              {scorecard.dialedCount} / {scorecard.dailyTarget} Calls
            </span>
            <span className="text-xs font-bold text-brand-orange">{scorecard.targetProgress}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-orange-200 overflow-hidden">
            <div
              className="h-full bg-brand-orange transition-all duration-300"
              style={{ width: `${scorecard.targetProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Admin Telecaller Performance Breakdown Table (Admin Only) */}
      {isAdmin && telecallerPerformance.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-orange" />
              <div>
                <h3 className="text-base font-bold text-brand-navy">Telecaller Performance & Results Monitor</h3>
                <p className="text-[11px] text-slate-500">
                  Track date-wise calling productivity, leads assigned, and target pacing.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {telecallerPerformance.length} Active Telecallers
              </span>

              <button
                type="button"
                onClick={() => setShowDateWiseReportModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:from-orange-600 hover:to-amber-700 transition"
              >
                <Calendar size={14} />
                <span>Date-Wise Calling Report</span>
              </button>
            </div>
          </div>

          {/* Date Filter Bar for Monitor */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1">Period:</span>
              {(
                [
                  { key: 'ALL', label: 'All Time' },
                  { key: 'TODAY', label: 'Today' },
                  { key: 'YESTERDAY', label: 'Yesterday' },
                  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { key: 'THIS_MONTH', label: 'This Month' },
                  { key: 'CUSTOM', label: 'Custom Range' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setPerfDateFilter(preset.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    perfDateFilter === preset.key
                      ? 'bg-brand-navy text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {perfDateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={perfCustomFrom}
                  onChange={(e) => setPerfCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                />
                <span className="text-slate-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={perfCustomTo}
                  onChange={(e) => setPerfCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                />
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Telecaller Staff</th>
                  <th className="py-2.5 px-3 font-bold">
                    {perfDateFilter === 'ALL' ? 'Total Assigned' : 'Period Assigned'}
                  </th>
                  <th className="py-2.5 px-3 font-bold">Calls Made</th>
                  <th className="py-2.5 px-3 font-bold">Connected</th>
                  <th className="py-2.5 px-3 font-bold">Callbacks</th>
                  <th className="py-2.5 px-3 font-bold">Busy/Cut</th>
                  <th className="py-2.5 px-3 font-bold">Meetings Fixed</th>
                  <th className="py-2.5 px-3 font-bold">Target</th>
                  <th className="py-2.5 px-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {telecallerPerformance.map((item) => (
                  <tr
                    key={item.user.id}
                    className={`hover:bg-slate-50/80 transition ${
                      selectedStaffFilter === item.user.employeeId ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-brand-navy">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <div>
                          <p>{item.user.name}</p>
                          <p className="font-mono text-[10px] text-slate-400 font-normal">{item.user.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold">{item.totalAssigned} Leads</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{item.dialed} Dialed</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">{item.connected}</td>
                    <td className="py-3 px-3 font-bold text-amber-700">{item.callbacks}</td>
                    <td className="py-3 px-3 text-slate-500">{item.busy}</td>
                    <td className="py-3 px-3 font-black text-purple-700">
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 border border-purple-200">
                        {item.booked} Fixed
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-24">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>{item.dialed}/{item.target}</span>
                          <span className="text-brand-orange">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-brand-orange"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStaffFilter === item.user.employeeId) {
                            setSelectedStaffFilter('ALL');
                          } else {
                            setSelectedStaffFilter(item.user.employeeId);
                          }
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-xs ${
                          selectedStaffFilter === item.user.employeeId
                            ? 'bg-brand-navy text-white'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {selectedStaffFilter === item.user.employeeId ? 'Viewing' : 'Inspect Leads'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Callback Reminder Alert (if any callbacks exist) */}
      {callbackLeads.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500 p-2 text-white">
              <Bell size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                ⏰ You have {callbackLeads.length} Scheduled Callback{callbackLeads.length > 1 ? 's' : ''} Today!
              </h4>
              <p className="text-xs text-amber-700">
                Clients who requested a callback at a specific time. Do not miss these high-priority leads.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterStatus('CALLBACK')}
            className="rounded-lg bg-amber-700 hover:bg-amber-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
          >
            View Callbacks Now
          </button>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
              <Users size={15} className="text-brand-orange" />
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-brand-navy outline-none focus:border-brand-orange"
              >
                <option value="ALL">All Staff ({leads.length} Leads)</option>
                <option value="UNASSIGNED">⚪ Unassigned Master Pool ({unassignedPoolCount} Leads)</option>
                {users
                  .filter((u) => u.role === 'TELECALLER')
                  .map((u) => (
                    <option key={u.id} value={u.employeeId}>
                      {u.name} ({u.employeeId})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {(isAdmin
              ? [
                  { id: 'ALL', label: `All Leads (${visibleQueueLeads.length})` },
                  { id: 'NEW', label: `New (${visibleQueueLeads.filter((l) => l.status === 'NEW').length})` },
                  { id: 'CALLBACK', label: `Callbacks (${callbackLeads.length})` },
                  { id: 'CONNECTED', label: `Connected (${visibleQueueLeads.filter((l) => l.status === 'CONNECTED').length})` },
                  { id: 'MEETING_BOOKED', label: `Meetings Fixed (${visibleQueueLeads.filter((l) => l.status === 'MEETING_BOOKED').length})` },
                  { id: 'BUSY', label: `Busy/Cut (${visibleQueueLeads.filter((l) => l.status === 'BUSY' || l.status === 'CALL_CUT').length})` },
                  { id: 'NOT_INTERESTED', label: `Not Interested (${visibleQueueLeads.filter((l) => l.status === 'NOT_INTERESTED').length})` },
                ]
              : [
                  { id: 'ALL', label: `Active Queue (${visibleQueueLeads.length})` },
                  { id: 'NEW', label: `Pending Calls (${visibleQueueLeads.filter((l) => l.status === 'NEW').length})` },
                  { id: 'CALLBACK', label: `Callbacks Due (${callbackLeads.length})` },
                ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  filterStatus === tab.id
                    ? 'bg-brand-orange text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-brand-orange focus:bg-white"
          />
        </div>
      </div>

      {/* Leads Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLeads.map((lead) => {
          const cfg = DISPOSITION_CONFIG[lead.status] || DISPOSITION_CONFIG.NEW;
          const assignedUser = users.find((u) => u.employeeId === lead.assignedEmployeeId);
          const clinicName = getClinicDisplayName(lead.clientName, lead.doctorName);
          const doctorName = getDoctorDisplayName(lead.doctorName, lead.clientName);

          return (
            <div
              key={lead.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-orange/50 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                      {lead.clientType}
                    </span>
                    <h3 className="mt-1.5 text-lg font-bold text-brand-navy">{clinicName}</h3>
                    <p className="text-xs text-slate-500">📍 {lead.city}</p>
                  </div>

                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Prominently Highlighted Doctor / Contact Person Badge */}
                {doctorName && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-300 px-3 py-2 shadow-2xs">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs shrink-0">
                      👨‍⚕️
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 block">
                        Doctor / Contact Person:
                      </span>
                      <span className="text-xs font-black text-emerald-950 truncate block">
                        {doctorName}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Phone:</span>
                    <span className="font-mono font-bold text-brand-navy">{lead.phone}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-500">Allocation:</span>
                      {(!lead.assignedEmployeeId || lead.assignedEmployeeId === 'UNASSIGNED' || lead.assignedEmployeeId === 'ADMIN') ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900 border border-amber-300 text-[10px]">
                          ⚪ Unassigned Master Pool
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900 border border-emerald-300 text-[10px]">
                          🟢 {assignedUser?.name || lead.assignedEmployeeId}
                        </span>
                      )}
                    </div>
                  )}
                  {lead.callbackTime && (
                    <div className="flex items-center justify-between text-amber-700 bg-amber-100/70 p-1.5 rounded-md font-semibold">
                      <span className="flex items-center gap-1"><Clock size={12} /> Callback Due:</span>
                      <span>{lead.callbackTime}</span>
                    </div>
                  )}
                  {lead.notes &&
                    !lead.notes.toLowerCase().startsWith('dr:') &&
                    !lead.notes.toLowerCase().startsWith('dr :') && (
                      <p className="border-t border-slate-200 pt-1.5 text-slate-600 italic">"{lead.notes}"</p>
                    )}
                </div>

                {/* 1-Click Fast Disposition Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 font-bold uppercase mr-1">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'CONNECTED')}
                    className="rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800 transition shadow-2xs"
                  >
                    Connected
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal(lead, 'CALLBACK')}
                    className="rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 font-bold text-amber-800 transition shadow-2xs flex items-center gap-1"
                  >
                    <Clock size={10} />
                    Callback
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'NOT_INTERESTED')}
                    className="rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 font-bold text-slate-700 transition shadow-2xs"
                  >
                    Not Interested
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'CALL_CUT')}
                    className="rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 font-bold text-rose-800 transition shadow-2xs"
                  >
                    Ringing
                  </button>
                </div>
              </div>

              {/* Main Action Bar */}
              <div className={`mt-4 grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 pt-2 border-t border-slate-100`}>
                {/* 1. Direct Call */}
                <a
                  href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                  title="Direct Call"
                >
                  <PhoneCall size={13} />
                  Call
                </a>

                {/* 2. 1-Click WhatsApp Pitch (Admin only for now) */}
                {isAdmin && (
                  <a
                    href={generateWhatsAppLink(lead.phone, getLeadIntroWhatsAppMessage(lead, currentUserName))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-2 py-2 text-xs font-bold text-white shadow-xs transition"
                    title="Send 1-Click WhatsApp Intro Pitch"
                  >
                    <MessageSquare size={13} />
                    WA Pitch
                  </a>
                )}

                {/* 3. Full Status Modal */}
                <button
                  type="button"
                  onClick={() => handleOpenStatusModal(lead)}
                  className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  title="Detailed Disposition & Notes"
                >
                  Status
                </button>

                {/* 4. Book Meeting */}
                <button
                  type="button"
                  onClick={() => onBookMeetingFromLead(lead)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-brand-orange px-2 py-2 text-xs font-bold text-white transition hover:bg-brand-orangeHover shadow-xs"
                  title="Fix In-Person / Online Meeting"
                >
                  <CalendarPlus size={13} />
                  Book Meet
                </button>
              </div>
            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <PhoneOff size={36} className="mx-auto text-slate-300" />
            <p className="mt-2 font-semibold text-slate-700">No active calling leads in this view.</p>
            <p className="text-xs text-slate-400">All assigned calls are either complete or fixed into meetings.</p>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {selectedLeadForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Update Call Disposition</p>
                <h3 className="text-lg font-bold text-brand-navy">
                  {getClinicDisplayName(selectedLeadForStatus.clientName, selectedLeadForStatus.doctorName)}
                </h3>
                {getDoctorDisplayName(selectedLeadForStatus.doctorName, selectedLeadForStatus.clientName) && (
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    👨‍⚕️ {getDoctorDisplayName(selectedLeadForStatus.doctorName, selectedLeadForStatus.clientName)}
                  </p>
                )}
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedLeadForStatus.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadForStatus(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Call Response / Result</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as CallDisposition })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand-orange"
                >
                  <option value="NEW">New / Pending</option>
                  <option value="CONNECTED">🟢 Connected & Interested</option>
                  <option value="MEETING_BOOKED">🟣 Meeting Booked</option>
                  <option value="CALLBACK">🟡 Callback Requested / Busy</option>
                  <option value="CALL_CUT">🔴 Ringing / No Answer</option>
                  <option value="NOT_INTERESTED">⚫ Not Interested</option>
                </select>
              </div>

              {/* Dedicated Callback Date & Time Picker */}
              {statusForm.status === 'CALLBACK' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                      <Clock size={14} className="text-amber-600" />
                      Schedule Callback Date & Time *
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                      Reminder
                    </span>
                  </div>

                  {/* 1-Click Quick Shortcuts */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block mb-1.5">
                      ⚡ Quick Shortcuts:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setHours(d.getHours() + 1);
                          setStatusForm({
                            ...statusForm,
                            callbackDate: d.toISOString().slice(0, 10),
                            callbackTimeOnly: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
                          });
                        }}
                        className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setHours(d.getHours() + 2);
                          setStatusForm({
                            ...statusForm,
                            callbackDate: d.toISOString().slice(0, 10),
                            callbackTimeOnly: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
                          });
                        }}
                        className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        +2 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusForm({
                            ...statusForm,
                            callbackDate: new Date().toISOString().slice(0, 10),
                            callbackTimeOnly: '17:00',
                          });
                        }}
                        className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        Today 5:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setStatusForm({
                            ...statusForm,
                            callbackDate: tomorrow.toISOString().slice(0, 10),
                            callbackTimeOnly: '11:00',
                          });
                        }}
                        className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        Tomorrow 11:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setStatusForm({
                            ...statusForm,
                            callbackDate: tomorrow.toISOString().slice(0, 10),
                            callbackTimeOnly: '15:00',
                          });
                        }}
                        className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        Tomorrow 3:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const dayAfter = new Date();
                          dayAfter.setDate(dayAfter.getDate() + 2);
                          setStatusForm({
                            ...statusForm,
                            callbackDate: dayAfter.toISOString().slice(0, 10),
                            callbackTimeOnly: '11:00',
                          });
                        }}
                        className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        Day After (11 AM)
                      </button>
                    </div>
                  </div>

                  {/* Custom Date & Time Inputs */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">📅 Callback Date</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().slice(0, 10)}
                        value={statusForm.callbackDate}
                        onChange={(e) => setStatusForm({ ...statusForm, callbackDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">⏰ Callback Time</label>
                      <input
                        type="time"
                        required
                        value={statusForm.callbackTimeOnly}
                        onChange={(e) => setStatusForm({ ...statusForm, callbackTimeOnly: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                      />
                    </div>
                  </div>

                  {/* Live Selected Callback Preview */}
                  {statusForm.callbackDate && statusForm.callbackTimeOnly && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 px-2.5 py-1.5 text-xs font-bold text-amber-950">
                      <span>⏰</span>
                      <span>
                        Scheduled Callback:{' '}
                        <span className="underline">
                          {getFormattedDatePreview(statusForm.callbackDate, statusForm.callbackTimeOnly)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Call Notes / Discussion (Kya Baat Hui) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    Mandatory
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="Enter call discussion summary, client response, objections or next steps (Mandatory)..."
                  className={`mt-1 w-full rounded-xl border p-3 text-sm outline-none transition ${
                    !statusForm.notes.trim()
                      ? 'border-slate-300 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange'
                      : 'border-emerald-300 bg-emerald-50/20 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLeadForStatus(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-orangeHover shadow-md shadow-orange-500/20"
              >
                Save Disposition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Lead Import Modal */}
      <LeadImportModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        users={users}
        onImportLeads={async (newLeads) => {
          await onAddNewLead(newLeads);
        }}
      />

      {/* Telecaller Calling Playbook & Scripts Modal */}
      <CallingScriptModal
        isOpen={showScriptModal}
        onClose={() => setShowScriptModal(false)}
        employeeName={currentUserName}
        customScript={telecallerScript}
      />

      {/* Target Achievement Celebration Modal with Confetti & Balloons */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        telecallerName={currentUserName}
        callsDialed={scorecard.dialedCount}
        dailyTarget={scorecard.dailyTarget}
      />

      {/* Date-Wise Calling & Lead Assignment Report Modal (Admin / Manager) */}
      <DateWiseReportModal
        isOpen={showDateWiseReportModal}
        onClose={() => setShowDateWiseReportModal(false)}
        leads={leads}
        users={users}
        auditLogs={auditLogs}
      />

      {/* Master Leads Bank & Daily Allocation Manager Modal */}
      <LeadAllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        leads={leads}
        users={users}
        onAllocateLeads={onAllocateLeads || (async () => {})}
      />
    </div>
  );
}
