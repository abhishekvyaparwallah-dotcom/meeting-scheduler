'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  IndianRupee,
  Trophy,
  Filter,
  CheckCircle2,
  Printer,
  TrendingUp,
  X
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { AppUser, Meeting } from '@/lib/types';
import { formatTime12h } from '@/lib/meeting-utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meetings: Meeting[];
  users: AppUser[];
}

export default function MonthlyReportModal({
  isOpen,
  onClose,
  meetings = [],
  users = [],
}: Props) {
  // Default to current year-month (e.g. 2026-09)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Generate list of past 12 months for selector
  const monthOptions = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = format(d, 'MMMM yyyy');
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // Filter meetings for selected month & filters
  const filteredMeetings = useMemo(() => {
    const safeMeetings = Array.isArray(meetings) ? meetings : [];
    return safeMeetings.filter((m) => {
      if (!m) return false;
      // Month match
      let matchesMonth = true;
      if (selectedMonth !== 'ALL') {
        try {
          const [year, month] = selectedMonth.split('-').map(Number);
          const mDate = parseISO(m.date);
          const start = startOfMonth(new Date(year, month - 1, 1));
          const end = endOfMonth(new Date(year, month - 1, 1));
          matchesMonth = isWithinInterval(mDate, { start, end });
        } catch {
          matchesMonth = true;
        }
      }

      // Staff match
      const matchesStaff = selectedStaff === 'ALL' || m.assignedEmployeeId === selectedStaff;

      // Category match
      const matchesCategory = selectedCategory === 'ALL' || m.clientType === selectedCategory;

      return matchesMonth && matchesStaff && matchesCategory;
    });
  }, [meetings, selectedMonth, selectedStaff, selectedCategory]);

  // Telecaller lookup map
  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    const safeUsers = Array.isArray(users) ? users : [];
    safeUsers.forEach((u) => {
      if (u?.employeeId) {
        map[u.employeeId] = u.name;
      }
    });
    return map;
  }, [users]);

  // Calculate Monthly Metrics
  const metrics = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    const totalMeetings = filteredMeetings.length;
    const convertedMeetings = filteredMeetings.filter((m) => m.convertedToClient);
    const totalRevenue = convertedMeetings.reduce((sum, m) => sum + (m.dealAmount || 0), 0);
    const totalExpense = convertedMeetings.reduce((sum, m) => sum + (m.acquisitionExpense || 0), 0);
    const conversionRate = totalMeetings > 0 ? Math.round((convertedMeetings.length / totalMeetings) * 100) : 0;

    // Telecaller Leaderboard
    const telecallerPerformance: Record<
      string,
      { name: string; meetings: number; converted: number; revenue: number }
    > = {};

    safeUsers
      .filter((u) => u.role === 'TELECALLER')
      .forEach((t) => {
        telecallerPerformance[t.employeeId] = {
          name: t.name,
          meetings: 0,
          converted: 0,
          revenue: 0,
        };
      });

    filteredMeetings.forEach((m) => {
      const empId = m.assignedEmployeeId;
      if (!empId) return;
      if (!telecallerPerformance[empId]) {
        telecallerPerformance[empId] = {
          name: staffMap[empId] || empId,
          meetings: 0,
          converted: 0,
          revenue: 0,
        };
      }
      telecallerPerformance[empId].meetings += 1;
      if (m.convertedToClient) {
        telecallerPerformance[empId].converted += 1;
        telecallerPerformance[empId].revenue += m.dealAmount || 0;
      }
    });

    const leaderboard = Object.entries(telecallerPerformance)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.meetings - a.meetings || b.revenue - a.revenue);

    const topTelecaller = leaderboard[0];

    return {
      totalMeetings,
      convertedCount: convertedMeetings.length,
      totalRevenue,
      totalExpense,
      conversionRate,
      leaderboard,
      topTelecaller: topTelecaller && topTelecaller.meetings > 0 ? topTelecaller : null,
    };
  }, [filteredMeetings, users, staffMap]);

  if (!isOpen) return null;

  // Export Multi-Sheet Excel (.xlsx)
  const handleExportExcel = () => {
    const monthLabel =
      selectedMonth === 'ALL'
        ? 'All_Time'
        : format(new Date(selectedMonth + '-01'), 'MMM_yyyy');

    // Sheet 1: Detailed Meetings Data
    const meetingsRows = filteredMeetings.map((m, index) => ({
      'S.No': index + 1,
      'Meeting Date': m.date,
      'Meeting Time (IST)': formatTime12h(m.time),
      'Client / Institution Name': m.clientName,
      'Category': m.clientType,
      'Phone Number': m.phone,
      'Fixed By (Staff)': staffMap[m.assignedEmployeeId] || m.assignedEmployeeId,
      'Status': m.status,
      'Converted to Client': m.convertedToClient ? 'YES' : 'NO',
      'Deal Amount (INR)': m.dealAmount || 0,
      'Contract Duration': m.contractDuration || 'N/A',
      'Acquisition Expense (INR)': m.acquisitionExpense || 0,
      'Address / Location': m.businessAddress || 'Confirmed',
      'Notes / Agenda': m.notes || '',
    }));

    // Sheet 2: Staff Monthly Performance Summary
    const staffSummaryRows = metrics.leaderboard.map((item, idx) => ({
      'Rank': idx + 1,
      'Staff Name': item.name,
      'Employee ID': item.id,
      'Total Meetings Fixed': item.meetings,
      'Deals Converted': item.converted,
      'Conversion Rate (%)': item.meetings > 0 ? `${Math.round((item.converted / item.meetings) * 100)}%` : '0%',
      'Total Revenue Generated (INR)': item.revenue,
    }));

    const workbook = XLSX.utils.book_new();

    // Add Sheet 1
    const ws1 = XLSX.utils.json_to_sheet(meetingsRows);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 22 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 25 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws1, 'Meetings_Detailed_List');

    // Add Sheet 2
    const ws2 = XLSX.utils.json_to_sheet(staffSummaryRows);
    ws2['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws2, 'Staff_Performance_Summary');

    XLSX.writeFile(workbook, `Vyapar_Wallah_Monthly_Meetings_Report_${monthLabel}.xlsx`, { bookType: 'xlsx' });
  };

  // Export CSV
  const handleExportCSV = () => {
    const monthLabel =
      selectedMonth === 'ALL'
        ? 'All_Time'
        : format(new Date(selectedMonth + '-01'), 'MMM_yyyy');

    const csvRows = filteredMeetings.map((m, index) => ({
      'S.No': index + 1,
      'Meeting Date': m.date,
      'Time': formatTime12h(m.time),
      'Client Name': m.clientName,
      'Category': m.clientType,
      'Phone': m.phone,
      'Assigned Telecaller': staffMap[m.assignedEmployeeId] || m.assignedEmployeeId,
      'Converted': m.convertedToClient ? 'YES' : 'NO',
      'Deal Amount': m.dealAmount || 0,
      'Notes': m.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Meetings');
    XLSX.writeFile(workbook, `Vyapar_Wallah_Meetings_${monthLabel}.csv`, { bookType: 'csv' });
  };

  // Print Summary
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-brand-orange">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Admin Intelligence</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                  Monthly Performance Reports
                </span>
              </div>
              <h2 className="text-xl font-bold text-brand-navy">Monthly Meetings & Conversion Reports</h2>
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

        {/* Filters Bar */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar size={15} className="text-brand-orange" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Months (Lifetime)</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <Users size={15} className="text-blue-600" />
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Staff Members</option>
                {users
                  .filter((u) => u.role === 'TELECALLER')
                  .map((t) => (
                    <option key={t.employeeId} value={t.employeeId}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <Filter size={15} className="text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Clinic / Hospital">Clinic / Hospital</option>
                <option value="School / Coaching">School / Coaching</option>
              </select>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <Download size={14} />
              Export Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">Meetings Fixed in Month</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-brand-navy">{metrics.totalMeetings}</span>
                <span className="text-xs text-slate-400 font-semibold">Scheduled</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">Closed Deals</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">{metrics.convertedCount}</span>
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {metrics.conversionRate}% Rate
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">Total Month Revenue</p>
              <div className="mt-1.5 flex items-baseline gap-1 text-2xl font-black text-brand-orange">
                <span>₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase text-brand-orange">Top Performer 🏆</p>
                <Trophy size={16} className="text-brand-orange" />
              </div>
              <p className="mt-1.5 text-sm font-bold text-slate-900 truncate">
                {metrics.topTelecaller ? metrics.topTelecaller.name : 'No meetings yet'}
              </p>
              {metrics.topTelecaller && (
                <p className="text-[10px] text-slate-600">
                  {metrics.topTelecaller.meetings} meets fixed • ₹{metrics.topTelecaller.revenue.toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>

          {/* Telecaller Performance Breakdown Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Staff Monthly Scorecard</span>
              <span className="text-[11px] text-slate-500">Telecaller meeting fix count & conversion breakdown</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3.5">Telecaller Name</th>
                    <th className="py-2.5 px-3.5 text-center">Meetings Fixed</th>
                    <th className="py-2.5 px-3.5 text-center">Converted Deals</th>
                    <th className="py-2.5 px-3.5 text-center">Conversion %</th>
                    <th className="py-2.5 px-3.5 text-right">Closed Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.leaderboard.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {item.name} <span className="font-normal text-slate-400 font-mono text-[10px]">({item.id})</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-bold text-brand-navy">
                        <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-0.5 text-blue-700 font-mono">
                          {item.meetings}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-bold text-emerald-700">
                        <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-0.5 text-emerald-700 font-mono">
                          {item.converted}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-semibold text-slate-600">
                        {item.meetings > 0 ? `${Math.round((item.converted / item.meetings) * 100)}%` : '0%'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        ₹{item.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {metrics.leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No telecaller activity found in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Meetings Table for Selected Month */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Detailed Meetings Record ({filteredMeetings.length} Records)
              </span>
              <span className="text-[11px] text-slate-500">Complete meeting list for {selectedMonth}</span>
            </div>

            <div className="max-h-72 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100/90 text-slate-600 font-bold uppercase backdrop-blur-xs">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Date & Time</th>
                    <th className="py-2 px-3">Client / Doctor</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">Fixed By</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMeetings.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-bold text-brand-navy">{m.date}</span>
                        <span className="ml-1 text-[11px] font-mono text-brand-orange">
                          {formatTime12h(m.time)}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{m.clientName}</td>
                      <td className="py-2 px-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {m.clientType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">{m.phone}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {staffMap[m.assignedEmployeeId] || m.assignedEmployeeId}
                      </td>
                      <td className="py-2 px-3">
                        {m.convertedToClient ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Converted
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {m.dealAmount ? `₹${m.dealAmount.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredMeetings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No meetings recorded for this month/filter combination.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-500 font-medium">
            Total <strong>{filteredMeetings.length}</strong> meetings recorded in selected period.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
