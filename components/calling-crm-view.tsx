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
} from 'lucide-react';
import { AppUser, CallDisposition, CallingLead, ClientType } from '@/lib/types';
import LeadImportModal from './lead-import-modal';
import CallingScriptModal from './calling-script-modal';
import CelebrationModal from './celebration-modal';
import { generateWhatsAppLink, getLeadIntroWhatsAppMessage } from '@/utils/fast2sms';

type Props = {
  leads: CallingLead[];
  users: AppUser[];
  isAdmin: boolean;
  onUpdateLeadStatus: (leadId: string, status: CallDisposition, notes?: string, callbackTime?: string) => Promise<void>;
  onBookMeetingFromLead: (lead: CallingLead) => void;
  onAddNewLead: (newLeads: Partial<CallingLead> | Partial<CallingLead>[]) => Promise<void>;
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

export default function CallingCRMView({
  leads,
  users,
  isAdmin,
  onUpdateLeadStatus,
  onBookMeetingFromLead,
  onAddNewLead,
  currentUserName = 'Telecaller',
  currentEmployeeId = '',
  currentDailyTarget,
  currentScript,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<CallingLead | null>(null);
  const [statusForm, setStatusForm] = useState<{ status: CallDisposition; notes: string; callbackTime: string }>({
    status: 'CONNECTED',
    notes: '',
    callbackTime: '',
  });
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Current logged in Telecaller user
  const currentTelecaller = useMemo(() => {
    return users.find(
      (u) =>
        (currentEmployeeId && u.employeeId?.toLowerCase() === currentEmployeeId.toLowerCase()) ||
        (currentUserName && u.name?.toLowerCase() === currentUserName.toLowerCase()) ||
        u.employeeId === currentUserName
    );
  }, [users, currentUserName, currentEmployeeId]);

  // Telecaller assigned custom script
  const telecallerScript = useMemo(() => {
    return currentTelecaller?.customScript || currentScript || '';
  }, [currentTelecaller, currentScript]);

  // Telecaller-specific performance breakdown for Admin
  const telecallerPerformance = useMemo(() => {
    const telecallers = users.filter((u) => u.role === 'TELECALLER');
    return telecallers.map((t) => {
      const userLeads = leads.filter(
        (l) => l.assignedEmployeeId === t.employeeId || l.assignedEmployeeId === t.name
      );
      const totalAssigned = userLeads.length;
      const connected = userLeads.filter((l) => l.status === 'CONNECTED').length;
      const callbacks = userLeads.filter((l) => l.status === 'CALLBACK').length;
      const booked = userLeads.filter((l) => l.status === 'MEETING_BOOKED').length;
      const callCut = userLeads.filter((l) => l.status === 'CALL_CUT' || l.status === 'BUSY').length;
      const notInterested = userLeads.filter((l) => l.status === 'NOT_INTERESTED').length;
      const pendingNew = userLeads.filter((l) => l.status === 'NEW').length;
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
  }, [users, leads]);

  // Telecaller sees their assigned leads (+ unassigned pool). Admin sees all or selected staff
  const accessibleLeads = useMemo(() => {
    if (isAdmin) {
      if (selectedStaffFilter === 'ALL') return leads;
      return leads.filter(
        (l) =>
          l.assignedEmployeeId === selectedStaffFilter ||
          l.assignedEmployeeId === users.find((u) => u.id === selectedStaffFilter)?.employeeId ||
          l.assignedEmployeeId === users.find((u) => u.employeeId === selectedStaffFilter)?.name
      );
    }
    // For Telecaller: The backend /api/leads already filtered by loggedEmployeeId.
    // Ensure all leads belonging to this telecaller (by ID, Name, or server response) are displayed:
    return leads.filter((l) => {
      if (!l.assignedEmployeeId) return true;
      if (currentEmployeeId && (l.assignedEmployeeId === currentEmployeeId || l.assignedEmployeeId.toLowerCase() === currentEmployeeId.toLowerCase())) return true;
      if (currentTelecaller && l.assignedEmployeeId === currentTelecaller.employeeId) return true;
      if (currentUserName && l.assignedEmployeeId === currentUserName) return true;
      return true; // Server already securely provided this telecaller's leads
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

  // Trigger celebration popup and confetti when daily call target is completed
  useEffect(() => {
    if (!isAdmin && scorecard.dailyTarget > 0 && scorecard.dialedCount >= scorecard.dailyTarget) {
      if (!hasCelebrated) {
        setShowCelebration(true);
        setHasCelebrated(true);
      }
    }
  }, [isAdmin, scorecard.dialedCount, scorecard.dailyTarget, hasCelebrated]);

  const filteredLeads = useMemo(() => {
    return visibleQueueLeads.filter((l) => {
      const matchesFilter = filterStatus === 'ALL' || l.status === filterStatus;
      const matchesSearch =
        l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.phone.includes(searchTerm) ||
        l.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.clientType.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [visibleQueueLeads, filterStatus, searchTerm]);

  const handleOpenStatusModal = (lead: CallingLead) => {
    setSelectedLeadForStatus(lead);
    setStatusForm({
      status: lead.status,
      notes: lead.notes ?? '',
      callbackTime: lead.callbackTime ?? '',
    });
  };

  const handleSaveStatus = async () => {
    if (!selectedLeadForStatus) return;
    await onUpdateLeadStatus(
      selectedLeadForStatus.id,
      statusForm.status,
      statusForm.notes,
      statusForm.callbackTime
    );
    setSelectedLeadForStatus(null);
  };

  // 1-Click Fast Disposition Trigger
  const handleQuickDisposition = async (leadId: string, status: CallDisposition) => {
    await onUpdateLeadStatus(leadId, status, `Quick disposition: marked as ${status}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-brand-orange animate-pulse"></span>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Telecalling Workspace</p>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-brand-navy">Daily Calling Queue & Lead Conversion</h2>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Complete company lead repository, assignments & disposition monitoring.'
              : 'Your active calling queue. Use 1-Click WhatsApp pitch or Direct Dial to fix meetings.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <BookOpen size={17} className="text-brand-orange" />
              Live Calling Script & Guide
            </button>
          )}

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
              <h3 className="text-base font-bold text-brand-navy">Telecaller Performance & Results Monitor</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {telecallerPerformance.length} Active Telecallers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Telecaller Staff</th>
                  <th className="py-2.5 px-3 font-bold">Assigned</th>
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

        <div className="relative min-w-[240px]">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, school, clinic..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-brand-orange focus:bg-white"
          />
        </div>
      </div>

      {/* Leads Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLeads.map((lead) => {
          const cfg = DISPOSITION_CONFIG[lead.status] || DISPOSITION_CONFIG.NEW;
          const assignedUser = users.find((u) => u.employeeId === lead.assignedEmployeeId);

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
                    <h3 className="mt-1.5 text-lg font-bold text-brand-navy">{lead.clientName}</h3>
                    <p className="text-xs text-slate-500">📍 {lead.city}</p>
                  </div>

                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Phone:</span>
                    <span className="font-mono font-bold text-brand-navy">{lead.phone}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-500">Assigned To:</span>
                      <span className="font-semibold text-slate-700">{assignedUser?.name || lead.assignedEmployeeId}</span>
                    </div>
                  )}
                  {lead.callbackTime && (
                    <div className="flex items-center justify-between text-amber-700 bg-amber-100/70 p-1.5 rounded-md font-semibold">
                      <span className="flex items-center gap-1"><Clock size={12} /> Callback Due:</span>
                      <span>{lead.callbackTime}</span>
                    </div>
                  )}
                  {lead.notes && (
                    <p className="border-t border-slate-200 pt-1.5 text-slate-600 italic">"{lead.notes}"</p>
                  )}
                </div>

                {/* 1-Click Fast Disposition Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 font-bold uppercase mr-1">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'CONNECTED')}
                    className="rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800 transition"
                  >
                    Connected
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'CALLBACK')}
                    className="rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 transition"
                  >
                    Callback
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'NOT_INTERESTED')}
                    className="rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 font-bold text-slate-700 transition"
                  >
                    Not Interested
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition(lead.id, 'CALL_CUT')}
                    className="rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 font-bold text-rose-800 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Update Call Disposition</p>
                <h3 className="text-lg font-bold text-brand-navy">{selectedLeadForStatus.clientName}</h3>
                <p className="text-xs text-slate-500">{selectedLeadForStatus.phone}</p>
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

              {statusForm.status === 'CALLBACK' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">Callback Timing</label>
                  <input
                    type="text"
                    value={statusForm.callbackTime}
                    onChange={(e) => setStatusForm({ ...statusForm, callbackTime: e.target.value })}
                    placeholder="e.g. Today at 4:30 PM / Tomorrow 11 AM"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Call Notes / Discussion</label>
                <textarea
                  rows={3}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="What did the client say? Any specific interest?"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
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
                className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-orangeHover"
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
    </div>
  );
}
