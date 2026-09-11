'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  CheckCircle2,
  TrendingUp,
  X,
  PhoneCall,
  UserPlus,
  Clock,
  CalendarPlus,
  PhoneOff,
} from 'lucide-react';
import { AppUser, AuditLog, CallingLead } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: CallingLead[];
  users: AppUser[];
  auditLogs?: AuditLog[];
}

export type DailyTelecallerRecord = {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // e.g. "10 Sep 2026"
  employeeId: string;
  employeeName: string;
  assignedCount: number;
  dialedCount: number;
  connectedCount: number;
  callbacksCount: number;
  bookedCount: number;
  busyCount: number;
  notInterestedCount: number;
  dailyTarget: number;
  targetProgress: number;
};

export default function DateWiseReportModal({
  isOpen,
  onClose,
  leads = [],
  users = [],
  auditLogs = [],
}: Props) {
  const telecallers = useMemo(() => users.filter((u) => u.role === 'TELECALLER'), [users]);

  // Default date range: Last 30 days
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultFromStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const [dateRangePreset, setDateRangePreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM'>('LAST_30_DAYS');
  const [fromDate, setFromDate] = useState<string>(defaultFromStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');

  // Handle preset date changes
  const applyPreset = (preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM') => {
    setDateRangePreset(preset);
    const curr = new Date();
    const currStr = curr.toISOString().slice(0, 10);

    if (preset === 'TODAY') {
      setFromDate(currStr);
      setToDate(currStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === 'LAST_7_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(currStr);
    } else if (preset === 'THIS_MONTH') {
      const d = new Date(curr.getFullYear(), curr.getMonth(), 1);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(currStr);
    } else if (preset === 'LAST_30_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(currStr);
    }
  };

  // Group lead assignments and calling activity day-by-day per telecaller
  const dailyReportRecords = useMemo(() => {
    if (!isOpen) return [];

    const dateMap = new Map<string, Map<string, DailyTelecallerRecord>>();

    // Helper to get or create entry in nested map
    const getEntry = (dateKey: string, empId: string, empName: string, target: number): DailyTelecallerRecord => {
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map());
      }
      const staffMap = dateMap.get(dateKey)!;
      if (!staffMap.has(empId)) {
        let displayDate = dateKey;
        try {
          const [yyyy, mm, dd] = dateKey.split('-').map(Number);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          displayDate = `${dd} ${monthNames[mm - 1]} ${yyyy}`;
        } catch {}

        staffMap.set(empId, {
          dateKey,
          displayDate,
          employeeId: empId,
          employeeName: empName,
          assignedCount: 0,
          dialedCount: 0,
          connectedCount: 0,
          callbacksCount: 0,
          bookedCount: 0,
          busyCount: 0,
          notInterestedCount: 0,
          dailyTarget: target || 3,
          targetProgress: 0,
        });
      }
      return staffMap.get(empId)!;
    };

    // 1. Process Lead Creation / Assignment Dates (createdAt)
    leads.forEach((lead) => {
      if (!lead.assignedEmployeeId) return;
      const assignedStaff = users.find(
        (u) =>
          u.employeeId === lead.assignedEmployeeId ||
          u.name === lead.assignedEmployeeId ||
          u.id === lead.assignedEmployeeId
      );
      const empId = assignedStaff?.employeeId || lead.assignedEmployeeId;
      const empName = assignedStaff?.name || lead.assignedEmployeeId;
      const dailyTarget = assignedStaff?.dailyTarget ?? 3;

      const createdDateKey = lead.createdAt ? lead.createdAt.slice(0, 10) : todayStr;
      const entry = getEntry(createdDateKey, empId, empName, dailyTarget);
      entry.assignedCount += 1;
    });

    // 2. Process Calling & Disposition Activities (updatedAt)
    leads.forEach((lead) => {
      if (!lead.assignedEmployeeId || lead.status === 'NEW') return;
      const assignedStaff = users.find(
        (u) =>
          u.employeeId === lead.assignedEmployeeId ||
          u.name === lead.assignedEmployeeId ||
          u.id === lead.assignedEmployeeId
      );
      const empId = assignedStaff?.employeeId || lead.assignedEmployeeId;
      const empName = assignedStaff?.name || lead.assignedEmployeeId;
      const dailyTarget = assignedStaff?.dailyTarget ?? 3;

      const updatedDateKey = lead.updatedAt ? lead.updatedAt.slice(0, 10) : (lead.createdAt ? lead.createdAt.slice(0, 10) : todayStr);
      const entry = getEntry(updatedDateKey, empId, empName, dailyTarget);

      entry.dialedCount += 1;
      if (lead.status === 'CONNECTED') entry.connectedCount += 1;
      else if (lead.status === 'CALLBACK') entry.callbacksCount += 1;
      else if (lead.status === 'MEETING_BOOKED') entry.bookedCount += 1;
      else if (lead.status === 'CALL_CUT' || lead.status === 'BUSY') entry.busyCount += 1;
      else if (lead.status === 'NOT_INTERESTED') entry.notInterestedCount += 1;
    });

    // 3. Process Audit Logs for historical update logging
    if (Array.isArray(auditLogs) && auditLogs.length > 0) {
      auditLogs.forEach((log) => {
        if (!log.createdAt || !log.employeeId) return;
        const logDateKey = log.createdAt.slice(0, 10);
        const assignedStaff = users.find(
          (u) => u.employeeId === log.employeeId || u.name === log.employeeName
        );
        if (assignedStaff?.role !== 'TELECALLER') return;

        const empId = assignedStaff?.employeeId || log.employeeId;
        const empName = assignedStaff?.name || log.employeeName;
        const dailyTarget = assignedStaff?.dailyTarget ?? 3;

        const entry = getEntry(logDateKey, empId, empName, dailyTarget);
        if (log.actionType === 'UPDATE_LEAD_STATUS' || log.actionType === 'BOOK_MEETING') {
          if (entry.dialedCount === 0) {
            entry.dialedCount = 1;
          }
        }
      });
    }

    // Flatten map into sorted list and calculate target progress
    const flatList: DailyTelecallerRecord[] = [];
    dateMap.forEach((staffMap) => {
      staffMap.forEach((record) => {
        record.targetProgress = Math.min(100, Math.round((record.dialedCount / (record.dailyTarget || 1)) * 100));
        flatList.push(record);
      });
    });

    // Filter by Date Range and Selected Staff
    return flatList
      .filter((r) => {
        const matchesDate = (!fromDate || r.dateKey >= fromDate) && (!toDate || r.dateKey <= toDate);
        const matchesStaff = selectedStaff === 'ALL' || r.employeeId === selectedStaff;
        return matchesDate && matchesStaff;
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [isOpen, leads, users, auditLogs, fromDate, toDate, selectedStaff, todayStr]);

  // Overall aggregated summary for selected filter range
  const summary = useMemo(() => {
    return dailyReportRecords.reduce(
      (acc, r) => ({
        totalAssigned: acc.totalAssigned + r.assignedCount,
        totalDialed: acc.totalDialed + r.dialedCount,
        totalConnected: acc.totalConnected + r.connectedCount,
        totalCallbacks: acc.totalCallbacks + r.callbacksCount,
        totalBooked: acc.totalBooked + r.bookedCount,
        totalBusy: acc.totalBusy + r.busyCount,
        totalNotInterested: acc.totalNotInterested + r.notInterestedCount,
      }),
      {
        totalAssigned: 0,
        totalDialed: 0,
        totalConnected: 0,
        totalCallbacks: 0,
        totalBooked: 0,
        totalBusy: 0,
        totalNotInterested: 0,
      }
    );
  }, [dailyReportRecords]);

  // Download Date-Wise Report in Excel (.xlsx) / CSV
  const handleExportExcel = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (dailyReportRecords.length === 0) {
      alert('No telecalling records found in this date range.');
      return;
    }

    const excelData = dailyReportRecords.map((r, i) => ({
      'S.No': i + 1,
      'Date': r.displayDate,
      'Date (YYYY-MM-DD)': r.dateKey,
      'Telecaller Name': r.employeeName,
      'Employee ID': r.employeeId,
      'Leads Assigned': r.assignedCount,
      'Calls Dialed': r.dialedCount,
      'Connected & Interested': r.connectedCount,
      'Callbacks Requested': r.callbacksCount,
      'Meetings Fixed': r.bookedCount,
      'Ringing / Cut / Busy': r.busyCount,
      'Not Interested': r.notInterestedCount,
      'Daily Target': r.dailyTarget,
      'Target Progress (%)': `${r.targetProgress}%`,
    }));

    // Add Summary Row
    excelData.push({
      'S.No': '' as any,
      'Date': 'TOTAL SUMMARY',
      'Date (YYYY-MM-DD)': '',
      'Telecaller Name': `${dailyReportRecords.length} Day-Records`,
      'Employee ID': '',
      'Leads Assigned': summary.totalAssigned,
      'Calls Dialed': summary.totalDialed,
      'Connected & Interested': summary.totalConnected,
      'Callbacks Requested': summary.totalCallbacks,
      'Meetings Fixed': summary.totalBooked,
      'Ringing / Cut / Busy': summary.totalBusy,
      'Not Interested': summary.totalNotInterested,
      'Daily Target': '' as any,
      'Target Progress (%)': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 18 },
      { wch: 22 },
      { wch: 14 },
      { wch: 15 },
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Date-Wise Telecalling Report');

    const fileName = `Vyapar_Wallah_DateWise_Telecalling_${fromDate}_to_${toDate}.${format}`;
    if (format === 'csv') {
      XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-brand-orange">
              <Calendar size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Admin Analytics</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Live Audit Sync
                </span>
              </div>
              <h2 className="text-xl font-bold text-brand-navy">Date-Wise Calling & Lead Assignment Report</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportExcel('xlsx')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <FileSpreadsheet size={15} />
              Export Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Control Bar */}
        <div className="border-b border-slate-200 bg-slate-50/80 p-5 space-y-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1">Quick Period:</span>
              {[
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                { id: 'CUSTOM', label: 'Custom Range' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => applyPreset(tab.id as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    dateRangePreset === tab.id
                      ? 'bg-brand-orange text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Staff Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Telecaller:</span>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-brand-navy outline-none focus:border-brand-orange"
              >
                <option value="ALL">All Telecallers ({telecallers.length})</option>
                {telecallers.map((t) => (
                  <option key={t.id} value={t.employeeId}>
                    {t.name} ({t.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker Range (From - To) */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <span>📅 From Date:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDateRangePreset('CUSTOM');
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>📅 To Date:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateRangePreset('CUSTOM');
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold outline-none focus:border-brand-orange"
              />
            </div>

            <span className="text-slate-400 font-normal">
              Showing <strong>{dailyReportRecords.length}</strong> date records
            </span>
          </div>
        </div>

        {/* Aggregated Scorecard Bar for the Range */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-5 bg-white border-b border-slate-100">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-blue-700">
              <UserPlus size={14} />
              <span>Assigned Leads</span>
            </div>
            <p className="mt-1 text-xl font-black text-blue-950">{summary.totalAssigned}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-600">
              <PhoneCall size={14} />
              <span>Calls Made</span>
            </div>
            <p className="mt-1 text-xl font-black text-slate-900">{summary.totalDialed}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-700">
              <CheckCircle2 size={14} />
              <span>Connected</span>
            </div>
            <p className="mt-1 text-xl font-black text-emerald-950">{summary.totalConnected}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-700">
              <Clock size={14} />
              <span>Callbacks</span>
            </div>
            <p className="mt-1 text-xl font-black text-amber-950">{summary.totalCallbacks}</p>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-purple-700">
              <CalendarPlus size={14} />
              <span>Meetings Fixed</span>
            </div>
            <p className="mt-1 text-xl font-black text-purple-950">{summary.totalBooked}</p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-rose-700">
              <PhoneOff size={14} />
              <span>Busy / Cut</span>
            </div>
            <p className="mt-1 text-xl font-black text-rose-950">{summary.totalBusy}</p>
          </div>
        </div>

        {/* Day-by-Day Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-5">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100/95 text-slate-700 font-bold uppercase tracking-wider backdrop-blur-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Telecaller Staff</th>
                <th className="py-3 px-3 text-center">Leads Assigned</th>
                <th className="py-3 px-3 text-center">Calls Made</th>
                <th className="py-3 px-3 text-center">Connected</th>
                <th className="py-3 px-3 text-center">Callbacks</th>
                <th className="py-3 px-3 text-center">Meetings Fixed</th>
                <th className="py-3 px-3 text-center">Busy / Cut</th>
                <th className="py-3 px-3 text-center">Not Int.</th>
                <th className="py-3 px-3 text-right">Target Met (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dailyReportRecords.map((r, idx) => (
                <tr key={`${r.dateKey}-${r.employeeId}-${idx}`} className="hover:bg-slate-50 transition">
                  {/* Date */}
                  <td className="py-3 px-3 font-bold text-slate-900">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs border border-slate-200">
                      📅 {r.displayDate}
                    </span>
                  </td>

                  {/* Telecaller Name */}
                  <td className="py-3 px-3 font-semibold text-brand-navy">
                    <div>
                      <p className="font-bold">{r.employeeName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.employeeId}</p>
                    </div>
                  </td>

                  {/* Assigned Leads */}
                  <td className="py-3 px-3 text-center font-bold text-blue-800">
                    {r.assignedCount > 0 ? (
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 border border-blue-200">
                        +{r.assignedCount} Leads
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Calls Dialed */}
                  <td className="py-3 px-3 text-center font-bold text-slate-900">
                    {r.dialedCount > 0 ? `${r.dialedCount} Calls` : <span className="text-slate-300">0</span>}
                  </td>

                  {/* Connected */}
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">
                    {r.connectedCount > 0 ? r.connectedCount : <span className="text-slate-300">0</span>}
                  </td>

                  {/* Callbacks */}
                  <td className="py-3 px-3 text-center font-bold text-amber-700">
                    {r.callbacksCount > 0 ? r.callbacksCount : <span className="text-slate-300">0</span>}
                  </td>

                  {/* Meetings Booked */}
                  <td className="py-3 px-3 text-center font-black text-purple-700">
                    {r.bookedCount > 0 ? (
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 border border-purple-200">
                        {r.bookedCount} Fixed
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* Busy / Cut */}
                  <td className="py-3 px-3 text-center text-rose-700 font-semibold">
                    {r.busyCount > 0 ? r.busyCount : <span className="text-slate-300">0</span>}
                  </td>

                  {/* Not Interested */}
                  <td className="py-3 px-3 text-center text-slate-500">
                    {r.notInterestedCount > 0 ? r.notInterestedCount : <span className="text-slate-300">0</span>}
                  </td>

                  {/* Target Met Progress */}
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="font-mono text-xs font-bold text-brand-orange">
                        {r.dialedCount}/{r.dailyTarget} ({r.targetProgress}%)
                      </span>
                      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-brand-orange"
                          style={{ width: `${r.targetProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {dailyReportRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No calling activity found in this date range.</p>
                    <p className="text-xs">Try selecting a different date range or staff member.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="text-xs text-slate-500">
            📊 Data synced from calling dispositions, Excel imports, and real-time activity logs.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
