'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths, startOfToday } from 'date-fns';
import {
  CalendarDays,
  PhoneCall,
  Users,
  IndianRupee,
  Plus,
  Menu,
  Shield,
  Trash2,
  UserPlus,
  TrendingUp,
  MapPin,
  MessageCircle,
  FileSpreadsheet,
  Edit3,
  Sparkles,
  BookOpen,
  KeyRound,
} from 'lucide-react';
import { generateWhatsAppLink, getMeetingWhatsAppMessage } from '@/utils/fast2sms';
import Sidebar from '@/components/sidebar';
import TodayAlertModal from '@/components/today-alert-modal';
import CalendarView from '@/components/calendar-view';
import BookingModal from '@/components/booking-modal';
import ClientConversionModal from '@/components/client-conversion-modal';
import CRMTable from '@/components/crm-table';
import CallingCRMView from '@/components/calling-crm-view';
import MonthlyReportModal from '@/components/monthly-report-modal';
import { AppUser, AuditLog, CallDisposition, CallingLead, ClientRecord, Meeting, UserRole } from '@/lib/types';
import { formatTime12h, getRevenueSummary, getTodayMeetings, sortMeetings, toDateKey } from '@/lib/meeting-utils';

type View = 'calendar' | 'calling' | 'meetings' | 'admin';

type SessionShape = {
  user: {
    id: string;
    role: UserRole;
    employeeId: string;
    name?: string | null;
    email?: string | null;
  };
};

type Props = {
  session: SessionShape;
  activeRoute?: 'dashboard' | 'crm' | 'calling';
};

export default function DashboardApp({ session, activeRoute }: Props) {
  const isAdmin = session.user.role === 'ADMIN';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<CallingLead[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [view, setView] = useState<View>(
    activeRoute === 'crm' ? 'meetings' : activeRoute === 'calling' ? 'calling' : 'calendar'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());

  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [prefilledLead, setPrefilledLead] = useState<CallingLead | null>(null);
  const [conversionMeeting, setConversionMeeting] = useState<Meeting | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TELECALLER' as UserRole,
    employeeId: '',
    phone: '',
    customScript: '',
  });

  const [editingScriptUserId, setEditingScriptUserId] = useState<string | null>(null);
  const [editingScriptText, setEditingScriptText] = useState('');
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordText, setNewPasswordText] = useState('');

  const visibleMeetings = useMemo(
    () => (isAdmin ? meetings : meetings.filter((m) => m.assignedEmployeeId === session.user.employeeId)),
    [isAdmin, meetings, session.user.employeeId]
  );
  const today = useMemo(() => toDateKey(startOfToday()), []);
  const todayMeetings = useMemo(() => getTodayMeetings(visibleMeetings), [visibleMeetings]);
  const summary = useMemo(() => getRevenueSummary(visibleMeetings), [visibleMeetings]);
  const sortedMeetings = useMemo(() => sortMeetings(visibleMeetings), [visibleMeetings]);

  const loadData = async () => {
    try {
      const [meetingsRes, leadsRes, clientsRes] = await Promise.all([
        fetch('/api/meetings'),
        fetch('/api/leads'),
        fetch('/api/clients'),
      ]);
      const meetingsJson = await meetingsRes.json();
      const leadsJson = await leadsRes.json();
      const clientsJson = await clientsRes.json();

      setMeetings(sortMeetings(meetingsJson.meetings ?? []));
      setLeads(leadsJson.leads ?? []);
      setClients(clientsJson.clients ?? []);

      if (isAdmin) {
        const [usersRes, logsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/audit-logs'),
        ]);
        const usersJson = await usersRes.json();
        const logsJson = await logsRes.json();
        setUsers(usersJson.users ?? []);
        setAuditLogs(logsJson.logs ?? []);
      }
    } catch {
      setBannerMessage({ text: 'Failed to load live data.', type: 'error' });
    }
  };

  useEffect(() => {
    void loadData();
  }, [isAdmin]);

  useEffect(() => {
    if (todayMeetings.length > 0) {
      setAlertOpen(true);
    }
  }, [todayMeetings.length]);

  const handleSaveMeeting = async (payload: Partial<Meeting> & { date: string; time: string }) => {
    const method = editingMeeting ? 'PATCH' : 'POST';
    const endpoint = editingMeeting ? `/api/meetings/${editingMeeting.id}` : '/api/meetings';
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();

    if (!response.ok) {
      setBannerMessage({ text: json.message ?? 'Unable to save meeting.', type: 'error' });
      return;
    }

    setMeetings((current) =>
      sortMeetings(
        editingMeeting
          ? current.map((m) => (m.id === editingMeeting.id ? json.meeting : m))
          : [...current, json.meeting]
      )
    );

    if (payload.leadId) {
      setLeads((current) =>
        current.map((l) => (l.id === payload.leadId ? { ...l, status: 'MEETING_BOOKED' } : l))
      );
    }

    setEditingMeeting(null);
    setBookingDate(null);
    setPrefilledLead(null);
    setBannerMessage({ text: 'Meeting confirmed & SMS sent!', type: 'success' });
    await loadData();
  };

  const handleUpdateLeadStatus = async (
    leadId: string,
    status: CallDisposition,
    notes?: string,
    callbackTime?: string
  ) => {
    const response = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, callbackTime }),
    });
    const json = await response.json();
    if (response.ok) {
      setLeads((current) => current.map((l) => (l.id === leadId ? json.lead : l)));
      setBannerMessage({ text: 'Lead disposition saved.', type: 'success' });
    }
  };

  const handleAddNewLead = async (newLead: Partial<CallingLead> | Partial<CallingLead>[]) => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      const json = await response.json();
      if (response.ok && json.leads && Array.isArray(json.leads)) {
        setLeads((current) => [...json.leads, ...current]);
        const count = json.count ?? (Array.isArray(newLead) ? newLead.length : 1);
        setBannerMessage({
          text: count > 1 ? `${count} Leads successfully imported and assigned to team!` : 'Lead added and assigned.',
          type: 'success',
        });
      } else {
        const errMsg = json.message ?? 'Failed to add leads.';
        setBannerMessage({ text: errMsg, type: 'error' });
        throw new Error(errMsg);
      }
    } catch (error: any) {
      console.error('Lead submission failed:', error);
      throw error;
    }
  };

  const handleConvertMeeting = async (payload: {
    meetingId: string;
    dealAmount: number;
    contractDuration: string;
    acquisitionExpense: number;
    nextFollowUp: string;
  }) => {
    const meeting = visibleMeetings.find((item) => item.id === payload.meetingId);
    if (!meeting) return;

    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        clientName: meeting.clientName,
        clientType: meeting.clientType,
        phone: meeting.phone,
        businessAddress: meeting.businessAddress,
      }),
    });
    const json = await response.json();

    if (response.ok) {
      setClients((current) => [json.client, ...current]);
      setMeetings((current) =>
        current.map((item) =>
          item.id === payload.meetingId
            ? {
                ...item,
                convertedToClient: true,
                dealAmount: payload.dealAmount,
                contractDuration: payload.contractDuration,
                acquisitionExpense: payload.acquisitionExpense,
                nextFollowUp: payload.nextFollowUp,
              }
            : item
        )
      );
      setConversionMeeting(null);
      setBannerMessage({ text: 'Client conversion saved successfully!', type: 'success' });
    }
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    const response = await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' });
    if (response.ok) {
      setMeetings((current) => current.filter((item) => item.id !== meeting.id));
      setBannerMessage({ text: 'Meeting cancelled.', type: 'success' });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.employeeId) {
      setBannerMessage({ text: 'Please complete all staff fields.', type: 'error' });
      return;
    }

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserForm),
    });
    const json = await response.json();
    if (response.ok) {
      setUsers((current) => [json.user, ...current]);
      setNewUserForm({ name: '', email: '', password: '', role: 'TELECALLER', employeeId: '', phone: '', customScript: '' });
      setBannerMessage({ text: 'Staff account created successfully.', type: 'success' });
    } else {
      setBannerMessage({ text: json.message ?? 'Failed to create user.', type: 'error' });
    }
  };

  const handleSaveUserScript = async (userId: string, scriptText: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, customScript: scriptText }),
      });
      if (res.ok) {
        setUsers((curr) =>
          curr.map((u) => (u.id === userId ? { ...u, customScript: scriptText } : u))
        );
        setEditingScriptUserId(null);
        setEditingScriptText('');
        setBannerMessage({ text: 'Telecaller pitch script saved successfully!', type: 'success' });
      } else {
        setBannerMessage({ text: 'Failed to update telecaller pitch script.', type: 'error' });
      }
    } catch {
      setBannerMessage({ text: 'Error saving script.', type: 'error' });
    }
  };

  const handleSaveUserPassword = async (userId: string, newPass: string) => {
    if (!newPass || newPass.trim().length < 4) {
      setBannerMessage({ text: 'Password must be at least 4 characters.', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, password: newPass.trim() }),
      });
      if (res.ok) {
        setEditingPasswordUserId(null);
        setNewPasswordText('');
        setBannerMessage({ text: 'Telecaller password updated successfully!', type: 'success' });
        await loadData();
      } else {
        setBannerMessage({ text: 'Failed to update password.', type: 'error' });
      }
    } catch {
      setBannerMessage({ text: 'Error updating password.', type: 'error' });
    }
  };

  const stats = [
    { label: "Today's Meetings", value: todayMeetings.length, icon: CalendarDays, color: 'bg-brand-orange text-white' },
    { label: 'Active Calling Leads', value: leads.length, icon: PhoneCall, color: 'bg-brand-navy text-white' },
    { label: 'Total Scheduled', value: visibleMeetings.length, icon: Users, color: 'bg-blue-600 text-white' },
    ...(isAdmin
      ? [
          {
            label: 'Closed Revenue',
            value: `₹${summary.revenue.toLocaleString('en-IN')}`,
            icon: IndianRupee,
            color: 'bg-emerald-600 text-white',
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-brand-surface text-slate-900">
      <div className="flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          onCloseMobile={() => setMobileOpen(false)}
          activeView={view}
          onSelectView={setView}
          userRole={session.user.role}
          userName={session.user.name ?? 'Staff'}
          userEmail={session.user.email ?? ''}
        />

        <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 transition-all duration-200`}>
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden hover:bg-slate-100"
                >
                  <Menu size={18} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-brand-navy">
                    Vyapar Wallah — Meeting Scheduler & CRM
                  </h1>
                  <p className="text-xs text-slate-500 hidden sm:block">
                    {isAdmin
                      ? 'Admin Console • Full calling management, slot engine, finances & audit logs'
                      : 'Telecaller Portal • Active call queue, 1-click meeting fix & calendar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledLead(null);
                      setEditingMeeting(null);
                      setBookingDate(today);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-orangeHover shadow-sm"
                  >
                    <Plus size={16} />
                    New Meeting
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowMonthlyReportModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition shadow-sm"
                  >
                    <FileSpreadsheet size={16} />
                    Monthly Reports
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="p-5 md:p-8 space-y-6 max-w-7xl mx-auto">
            {bannerMessage && (
              <div
                className={`flex items-center justify-between rounded-xl border p-4 text-sm font-semibold ${
                  bannerMessage.type === 'success'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                <span>{bannerMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setBannerMessage(null)}
                  className="text-xs uppercase font-bold underline ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className={`grid gap-4 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">{stat.label}</p>
                        <p className="mt-2 text-2xl font-black text-brand-navy">{stat.value}</p>
                      </div>
                      <div className={`rounded-xl p-3 shadow-sm ${stat.color}`}>
                        <Icon size={20} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {view === 'calendar' && (
              <div className="space-y-6">
                <CalendarView
                  meetings={visibleMeetings}
                  month={month}
                  isAdmin={isAdmin}
                  onPrevMonth={() => setMonth((c) => addMonths(c, -1))}
                  onNextMonth={() => setMonth((c) => addMonths(c, 1))}
                  onSelectDate={(date) => {
                    if (!isAdmin) {
                      setPrefilledLead(null);
                      setEditingMeeting(null);
                      setBookingDate(date);
                    }
                  }}
                  onOpenMeeting={(meeting) => setSelectedMeeting(meeting)}
                />
              </div>
            )}

            {view === 'calling' && (
              <CallingCRMView
                leads={leads}
                users={users}
                isAdmin={isAdmin}
                currentUserName={session.user.name ?? 'Telecaller'}
                currentEmployeeId={session.user.employeeId ?? ''}
                onUpdateLeadStatus={handleUpdateLeadStatus}
                onBookMeetingFromLead={(lead) => {
                  setPrefilledLead(lead);
                  setEditingMeeting(null);
                  setBookingDate(today);
                }}
                onAddNewLead={handleAddNewLead}
              />
            )}

            {view === 'meetings' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-brand-navy">
                      {isAdmin ? 'All Scheduled Meetings & Converted Clients' : 'My Booked Meetings'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isAdmin
                        ? 'Search, edit, cancel, and convert leads into closed deals.'
                        : 'View and manage your scheduled client appointments and meeting details.'}
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowMonthlyReportModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
                    >
                      <FileSpreadsheet size={16} />
                      Download Monthly Reports (Excel / CSV)
                    </button>
                  )}
                </div>

                <CRMTable
                  meetings={sortedMeetings}
                  isAdmin={isAdmin}
                  onSelectMeeting={(m) => setSelectedMeeting(m)}
                  onEditMeeting={(m) => {
                    setEditingMeeting(m);
                    setBookingDate(m.date);
                  }}
                  onConvertMeeting={(m) => setConversionMeeting(m)}
                  onDeleteMeeting={handleDeleteMeeting}
                />
              </div>
            )}

            {view === 'admin' && isAdmin && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Shield size={18} className="text-brand-orange" />
                    <h3 className="text-lg font-bold text-brand-navy">Telecalling Staff Management</h3>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      placeholder="Staff Name"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-orange"
                    />
                    <input
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      placeholder="Email address"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-orange"
                    />
                    <input
                      value={newUserForm.employeeId}
                      onChange={(e) => setNewUserForm({ ...newUserForm, employeeId: e.target.value })}
                      placeholder="Employee ID (e.g. EMP-1004)"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-orange"
                    />
                    <input
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      placeholder="Phone (+91...)"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-orange"
                    />
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      placeholder="Password"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-orange"
                    />
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand-orange"
                    >
                      <option value="TELECALLER">TELECALLER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>

                    <textarea
                      value={newUserForm.customScript}
                      onChange={(e) => setNewUserForm({ ...newUserForm, customScript: e.target.value })}
                      placeholder="Live Calling Speaking Script / Guide (Optional — Telecaller call karte waqt screen par dekh kar baat karega)"
                      rows={3}
                      className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-orange leading-relaxed"
                    />

                    <button
                      type="button"
                      onClick={handleCreateUser}
                      className="sm:col-span-2 rounded-xl bg-brand-navy py-2 text-xs font-bold text-white hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={14} /> Add Telecaller Account
                    </button>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Staff & Live Call Scripts</p>
                    {users.map((u) => (
                      <div key={u.id} className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-brand-navy">{u.name}</p>
                              {u.customScript?.trim() ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  <Sparkles size={10} /> Live Script Set
                                </span>
                              ) : null}
                            </div>
                            <p className="text-slate-500 font-mono text-[11px]">{u.employeeId} • {u.role} {u.phone ? `• ${u.phone}` : ''}</p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {u.role === 'TELECALLER' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingScriptUserId === u.id) {
                                    setEditingScriptUserId(null);
                                  } else {
                                    setEditingScriptUserId(u.id);
                                    setEditingScriptText(u.customScript || '');
                                    setEditingPasswordUserId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs"
                              >
                                <Edit3 size={12} className="text-brand-orange" />
                                {u.customScript?.trim() ? 'Edit Script' : '+ Script'}
                              </button>
                            )}

                            {u.role === 'TELECALLER' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingPasswordUserId === u.id) {
                                    setEditingPasswordUserId(null);
                                    setNewPasswordText('');
                                  } else {
                                    setEditingPasswordUserId(u.id);
                                    setNewPasswordText('');
                                    setEditingScriptUserId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 shadow-xs"
                                title="Change Password"
                              >
                                <KeyRound size={12} className="text-blue-600" />
                                Password
                              </button>
                            )}

                            {u.role === 'TELECALLER' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' });
                                  setUsers((c) => c.filter((item) => item.id !== u.id));
                                }}
                                className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                title="Delete User"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Password Reset Box */}
                        {editingPasswordUserId === u.id && (
                          <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                            <span className="text-[11px] font-bold text-blue-950">Set New Password for {u.name}:</span>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={newPasswordText}
                                onChange={(e) => setNewPasswordText(e.target.value)}
                                placeholder="Enter new password (min 4 characters)..."
                                className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-orange"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveUserPassword(u.id, newPasswordText)}
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                              >
                                Save Password
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPasswordUserId(null);
                                  setNewPasswordText('');
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Script Editor */}
                        {editingScriptUserId === u.id && (
                          <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-amber-900">Live Calling Speaking Script for {u.name}:</span>
                            </div>
                            <textarea
                              value={editingScriptText}
                              onChange={(e) => setEditingScriptText(e.target.value)}
                              placeholder="Write conversation talking points, live pitch, opening hook, or objections guide for this telecaller to speak during the call..."
                              rows={4}
                              className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-brand-orange leading-relaxed"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingScriptUserId(null)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveUserScript(u.id, editingScriptText)}
                                className="rounded-lg bg-brand-orange px-3 py-1 text-xs font-bold text-white hover:bg-brand-orangeHover shadow-xs"
                              >
                                Save Script
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <TrendingUp size={18} className="text-brand-orange" />
                    <h3 className="text-lg font-bold text-brand-navy">System Activity & Audit Logs</h3>
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-brand-orange">{log.actionType}</span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {log.createdAt}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">By: {log.employeeName}</p>
                        <p className="text-slate-800 font-medium mt-1">{log.details}</p>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <p className="text-center text-slate-400 py-6">No audit logs recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <TodayAlertModal
        meetings={todayMeetings}
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        onSelectMeeting={(m) => setSelectedMeeting(m)}
      />

      <BookingModal
        open={Boolean(bookingDate) && (!isAdmin || Boolean(editingMeeting))}
        date={bookingDate}
        meetings={visibleMeetings}
        editingMeeting={editingMeeting}
        prefilledLead={prefilledLead}
        employees={users}
        role={session.user.role}
        currentEmployeeId={session.user.employeeId}
        onClose={() => {
          setBookingDate(null);
          setEditingMeeting(null);
          setPrefilledLead(null);
        }}
        onSave={handleSaveMeeting}
      />

      <ClientConversionModal
        open={Boolean(conversionMeeting)}
        meeting={conversionMeeting}
        onClose={() => setConversionMeeting(null)}
        onConvert={handleConvertMeeting}
      />

      {isAdmin && (
        <MonthlyReportModal
          isOpen={showMonthlyReportModal}
          onClose={() => setShowMonthlyReportModal(false)}
          meetings={visibleMeetings}
          users={users}
        />
      )}

      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                  {selectedMeeting.clientType}
                </span>
                <h2 className="mt-1.5 text-2xl font-bold text-brand-navy">{selectedMeeting.clientName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold uppercase text-slate-400">Date & Time</p>
                <p className="mt-1 text-sm font-bold text-brand-navy">
                  {selectedMeeting.date} at {formatTime12h(selectedMeeting.time)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold uppercase text-slate-400">Phone Contact</p>
                <a
                  href={`tel:${selectedMeeting.phone.replace(/\s+/g, '')}`}
                  className="mt-1 text-sm font-bold font-mono text-emerald-600 hover:underline block"
                >
                  {selectedMeeting.phone}
                </a>
              </div>

              {selectedMeeting.mapsLink && (
                <div className="sm:col-span-2">
                  <a
                    href={selectedMeeting.mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-blue/10 py-2.5 text-xs font-bold text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/20 transition"
                  >
                    <MapPin size={14} /> Open Google Maps Navigation 📍
                  </a>
                </div>
              )}

              {selectedMeeting.notes && (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <p className="font-bold uppercase text-slate-400">Agenda / Notes</p>
                  <p className="mt-1 text-slate-700">{selectedMeeting.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <a
                href={generateWhatsAppLink(selectedMeeting.phone, getMeetingWhatsAppMessage(selectedMeeting, session.user.name ?? 'Vyapar Wallah'))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <MessageCircle size={14} />
                Send WhatsApp Confirmation
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMeeting(selectedMeeting);
                    setBookingDate(selectedMeeting.date);
                    setSelectedMeeting(null);
                  }}
                  className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Edit Meeting
                </button>
                {!selectedMeeting.convertedToClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setConversionMeeting(selectedMeeting);
                      setSelectedMeeting(null);
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Convert to Client
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteMeeting(selectedMeeting);
                    setSelectedMeeting(null);
                  }}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Cancel Meet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
