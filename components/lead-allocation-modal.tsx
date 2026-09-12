'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Database,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Shuffle,
  Clock,
  Phone,
  Building2,
  CheckSquare,
  Square,
  AlertCircle,
  TrendingUp,
  X,
  UserCheck,
} from 'lucide-react';
import { AppUser, CallingLead } from '@/lib/types';
import { getClinicDisplayName, getDoctorDisplayName } from './calling-crm-view';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: CallingLead[];
  users: AppUser[];
  onAllocateLeads: (params: {
    mode: 'SPECIFIC_LEADS' | 'QUICK_COUNT' | 'DISTRIBUTE_EQUALLY';
    leadIds?: string[];
    targetEmployeeId?: string;
    count?: number;
    countPerTelecaller?: number;
    telecallerIds?: string[];
  }) => Promise<void>;
}

export default function LeadAllocationModal({
  isOpen,
  onClose,
  leads = [],
  users = [],
  onAllocateLeads,
}: Props) {
  const telecallers = useMemo(() => users.filter((u) => u.role === 'TELECALLER'), [users]);
  const defaultTelecallerId = telecallers[0]?.employeeId || '';

  // Quick Dispatch Form State
  const [quickTargetEmpId, setQuickTargetEmpId] = useState<string>(defaultTelecallerId);
  const [quickCount, setQuickCount] = useState<number>(5);
  const [isAllocating, setIsAllocating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Table Selection & Filtering
  const [poolFilter, setPoolFilter] = useState<'UNASSIGNED' | 'ALL' | 'ASSIGNED'>('UNASSIGNED');
  const [selectedStaffTab, setSelectedStaffTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [batchTargetEmpId, setBatchTargetEmpId] = useState<string>(defaultTelecallerId);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Helper to check if a lead is unassigned
  const isUnassignedLead = (lead: CallingLead) => {
    return (
      !lead.assignedEmployeeId ||
      lead.assignedEmployeeId === 'UNASSIGNED' ||
      lead.assignedEmployeeId === 'ADMIN' ||
      lead.assignedEmployeeId === 'EMP-1001'
    );
  };

  // Metrics
  const totalLeadsCount = leads.length;
  const unassignedCount = useMemo(() => leads.filter(isUnassignedLead).length, [leads]);
  const assignedCount = totalLeadsCount - unassignedCount;

  // Today assigned leads count
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayAssignedCount = useMemo(
    () =>
      leads.filter((l) => !isUnassignedLead(l) && (l.updatedAt?.slice(0, 10) === todayStr || l.createdAt?.slice(0, 10) === todayStr)).length,
    [leads, todayStr]
  );

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const isUnassigned = isUnassignedLead(lead);

      if (poolFilter === 'UNASSIGNED' && !isUnassigned) return false;
      if (poolFilter === 'ASSIGNED' && isUnassigned) return false;

      if (selectedStaffTab !== 'ALL' && lead.assignedEmployeeId !== selectedStaffTab) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const client = (lead.clientName || '').toLowerCase();
        const doc = (lead.doctorName || '').toLowerCase();
        const phone = (lead.phone || '').toLowerCase();
        const city = (lead.city || '').toLowerCase();
        return client.includes(query) || doc.includes(query) || phone.includes(query) || city.includes(query);
      }

      return true;
    });
  }, [leads, poolFilter, selectedStaffTab, searchTerm]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  if (!isOpen) return null;

  // Selection helpers
  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedLeads.map((l) => l.id);
    const allSelected = pageIds.every((id) => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllUnassigned = () => {
    const unassignedIds = leads.filter(isUnassignedLead).map((l) => l.id);
    setSelectedLeadIds(unassignedIds);
  };

  // Dispatch Mode 1: Quick Count allocation
  const handleQuickDispatch = async () => {
    if (!quickTargetEmpId) {
      alert('Please select a telecaller to assign leads.');
      return;
    }
    if (unassignedCount === 0) {
      alert('No unassigned leads remaining in the Master Pool.');
      return;
    }

    setIsAllocating(true);
    setStatusMessage(null);
    try {
      await onAllocateLeads({
        mode: 'QUICK_COUNT',
        targetEmployeeId: quickTargetEmpId,
        count: quickCount,
      });
      const staffName = telecallers.find((u) => u.employeeId === quickTargetEmpId)?.name || quickTargetEmpId;
      setStatusMessage({
        type: 'success',
        text: `✓ Successfully dispatched ${Math.min(quickCount, unassignedCount)} leads to ${staffName}!`,
      });
      setSelectedLeadIds([]);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to allocate leads. Please try again.' });
    } finally {
      setIsAllocating(false);
    }
  };

  // Dispatch Mode 2: Equal Distribution across all telecallers
  const handleEqualDistribution = async () => {
    if (telecallers.length === 0) {
      alert('No active telecallers found.');
      return;
    }
    if (unassignedCount === 0) {
      alert('No unassigned leads remaining in the Master Pool.');
      return;
    }

    const countPerStaff = prompt(
      `How many calls do you want to assign to each of the ${telecallers.length} telecallers?`,
      '5'
    );
    if (!countPerStaff) return;
    const num = parseInt(countPerStaff, 10);
    if (isNaN(num) || num <= 0) return;

    setIsAllocating(true);
    setStatusMessage(null);
    try {
      await onAllocateLeads({
        mode: 'DISTRIBUTE_EQUALLY',
        countPerTelecaller: num,
        telecallerIds: telecallers.map((t) => t.employeeId),
      });
      setStatusMessage({
        type: 'success',
        text: `✓ Successfully distributed ${num} leads each to all ${telecallers.length} active telecallers!`,
      });
      setSelectedLeadIds([]);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to distribute leads.' });
    } finally {
      setIsAllocating(false);
    }
  };

  // Dispatch Mode 3: Specific Checkbox Selection
  const handleBatchAssignSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!batchTargetEmpId) {
      alert('Please choose a telecaller.');
      return;
    }

    setIsAllocating(true);
    setStatusMessage(null);
    try {
      await onAllocateLeads({
        mode: 'SPECIFIC_LEADS',
        leadIds: selectedLeadIds,
        targetEmployeeId: batchTargetEmpId,
      });
      const staffName = telecallers.find((u) => u.employeeId === batchTargetEmpId)?.name || batchTargetEmpId;
      setStatusMessage({
        type: 'success',
        text: `✓ Successfully allocated ${selectedLeadIds.length} chosen leads to ${staffName}!`,
      });
      setSelectedLeadIds([]);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to assign selected leads.' });
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-brand-orange">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Admin Hub</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Lead Pool & Allocation
                </span>
              </div>
              <h2 className="text-xl font-bold text-brand-navy">Master Leads Bank & Daily Lead Dispatch</h2>
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

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Master Total Leads</span>
              <p className="mt-1 text-2xl font-black text-brand-navy">{totalLeadsCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Uploaded in database</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Unassigned in Pool</span>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              <p className="mt-1 text-2xl font-black text-amber-900">{unassignedCount}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Ready for daily dispatch</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Allocated</span>
              <p className="mt-1 text-2xl font-black text-emerald-900">{assignedCount}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Active in telecaller queues</p>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Active Telecallers</span>
              <p className="mt-1 text-2xl font-black text-indigo-900">{telecallers.length}</p>
              <p className="text-[10px] text-indigo-700 mt-0.5">Ready for call distribution</p>
            </div>
          </div>

          {/* Quick Daily Dispatch Section */}
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-brand-orange" />
                <div>
                  <h3 className="text-base font-bold text-brand-navy">⚡ 1-Click Daily Batch Dispatch</h3>
                  <p className="text-xs text-slate-500">
                    Quickly allocate a batch of unassigned leads to telecallers without re-uploading CSV.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEqualDistribution}
                disabled={isAllocating || unassignedCount === 0}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-900 shadow-2xs hover:bg-indigo-100 transition disabled:opacity-50"
              >
                <Shuffle size={14} className="text-indigo-600" />
                <span>Distribute Equally to All Staff</span>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-12 items-end">
              {/* Telecaller Select */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Target Telecaller:
                </label>
                <select
                  value={quickTargetEmpId}
                  onChange={(e) => setQuickTargetEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                >
                  {telecallers.map((t) => (
                    <option key={t.employeeId} value={t.employeeId}>
                      {t.name} ({t.employeeId}) — Target: {t.dailyTarget ?? 50}/day
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Selector */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Number of Leads to Dispatch:
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 25].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuickCount(num)}
                      className={`rounded-lg px-2.5 py-2 text-xs font-black transition ${
                        quickCount === num
                          ? 'bg-brand-navy text-white shadow-2xs'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={quickCount}
                    onChange={(e) => setQuickCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-center text-slate-800"
                  />
                </div>
              </div>

              {/* Dispatch Action Button */}
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleQuickDispatch}
                  disabled={isAllocating || unassignedCount === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-orange py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-brand-orangeHover transition disabled:opacity-50"
                >
                  <ArrowRight size={16} />
                  <span>
                    {isAllocating ? 'Allocating...' : `Assign ${quickCount} Leads Now`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Master Leads Pool Explorer & Manual Selection Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            {/* Filter Tabs & Search */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPoolFilter('UNASSIGNED');
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    poolFilter === 'UNASSIGNED'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>⚪ Unassigned Pool Only</span>
                  <span className="rounded-full bg-white px-2 py-0.2 text-[10px] font-black text-amber-950">
                    {unassignedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPoolFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    poolFilter === 'ALL'
                      ? 'bg-brand-navy text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>All Master Leads</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-black text-slate-800">
                    {totalLeadsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPoolFilter('ASSIGNED');
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    poolFilter === 'ASSIGNED'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>🟢 Assigned Leads</span>
                  <span className="rounded-full bg-white px-2 py-0.2 text-[10px] font-black text-emerald-950">
                    {assignedCount}
                  </span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clinic, doctor, phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-brand-orange focus:bg-white"
                />
              </div>
            </div>

            {/* Selection Bulk Action Bar */}
            {selectedLeadIds.length > 0 && (
              <div className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-50 border border-brand-orange/40 p-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange text-white text-xs font-black">
                    {selectedLeadIds.length}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedLeadIds.length} Leads selected for assignment
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Assign to:</span>
                  <select
                    value={batchTargetEmpId}
                    onChange={(e) => setBatchTargetEmpId(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-orange"
                  >
                    {telecallers.map((t) => (
                      <option key={t.employeeId} value={t.employeeId}>
                        {t.name} ({t.employeeId})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleBatchAssignSelected}
                    disabled={isAllocating}
                    className="rounded-lg bg-brand-orange px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-orangeHover transition disabled:opacity-50"
                  >
                    {isAllocating ? 'Assigning...' : 'Confirm Allocation'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLeadIds([])}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Leads Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          paginatedLeads.length > 0 &&
                          paginatedLeads.every((l) => selectedLeadIds.includes(l.id))
                        }
                        onChange={handleSelectAllOnPage}
                        className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                      />
                    </th>
                    <th className="py-2.5 px-3 font-bold">Clinic / Hospital & Doctor</th>
                    <th className="py-2.5 px-3 font-bold">Contact</th>
                    <th className="py-2.5 px-3 font-bold">Category & City</th>
                    <th className="py-2.5 px-3 font-bold">Current Allocation</th>
                    <th className="py-2.5 px-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedLeads.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const isUnassigned = isUnassignedLead(lead);
                    const assignedStaff = users.find(
                      (u) => u.employeeId === lead.assignedEmployeeId || u.name === lead.assignedEmployeeId
                    );
                    const clinicName = getClinicDisplayName(lead.clientName, lead.doctorName, lead.institutionName);
                    const doctorName = getDoctorDisplayName(lead.doctorName, lead.clientName, lead.notes);

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? 'bg-orange-50/50' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-brand-navy">{clinicName}</p>
                          {doctorName && (
                            <p className="text-[11px] font-semibold text-emerald-700">👨‍⚕️ {doctorName}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">
                          {lead.phone}
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {lead.clientType}
                          </span>
                          <span className="text-slate-400 ml-1">📍 {lead.city}</span>
                        </td>
                        <td className="py-3 px-3">
                          {isUnassigned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              Unassigned Pool
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                {assignedStaff?.name || lead.assignedEmployeeId}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                ({assignedStaff?.employeeId || lead.assignedEmployeeId})
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleSelectLead(lead.id);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs ${
                              isSelected
                                ? 'bg-brand-navy text-white'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedLeads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No leads match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} leads
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold disabled:opacity-40 hover:bg-slate-100"
                  >
                    Prev
                  </button>
                  <span className="font-bold text-slate-800">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold disabled:opacity-40 hover:bg-slate-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
