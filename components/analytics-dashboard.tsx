'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { IndianRupee, TrendingUp, Users, CheckCircle, Percent } from 'lucide-react';
import { ClientRecord, Meeting } from '@/lib/types';
import { getRevenueSummary } from '@/lib/meeting-utils';

type Props = {
  meetings: Meeting[];
  clients: ClientRecord[];
};

const PIE_COLORS = ['#FF6B00', '#2563EB', '#10B981', '#F59E0B', '#64748B', '#EF4444'];

export default function AnalyticsDashboard({ meetings, clients }: Props) {
  const summary = useMemo(() => getRevenueSummary(meetings), [meetings]);
  const totalMeetings = meetings.length;
  const convertedCount = clients.length;
  const conversionRate = totalMeetings > 0 ? Math.round((convertedCount / totalMeetings) * 100) : 0;
  const netProfit = summary.revenue - summary.expense;
  const roi = summary.expense > 0 ? Math.round((netProfit / summary.expense) * 100) : 100;

  const clientTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    meetings.forEach((m) => {
      const type = m.clientType || 'Others';
      map[type] = (map[type] || 0) + 1;
    });
    return Object.keys(map).map((k) => ({ name: k, value: map[k] }));
  }, [meetings]);

  const financialBarData = [
    { name: 'Total Revenue', amount: summary.revenue },
    { name: 'Expenses', amount: summary.expense },
    { name: 'Net Profit', amount: Math.max(0, netProfit) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-orange"></span>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Admin Analytics</p>
        </div>
        <h2 className="text-2xl font-bold text-brand-navy">Business & Conversion Intelligence</h2>
        <p className="text-xs text-slate-500">Live ROI, Client acquisition costs, and conversion metrics.</p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Closed Revenue</p>
              <p className="mt-2 text-2xl font-black text-brand-navy">?{summary.revenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl bg-emerald-600 p-3 text-white">
              <IndianRupee size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Total Expenses</p>
              <p className="mt-2 text-2xl font-black text-brand-navy">?{summary.expense.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl bg-rose-600 p-3 text-white">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Conversion Rate</p>
              <p className="mt-2 text-2xl font-black text-brand-navy">{conversionRate}%</p>
            </div>
            <div className="rounded-xl bg-brand-orange p-3 text-white">
              <Percent size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Estimated ROI</p>
              <p className="mt-2 text-2xl font-black text-brand-navy">{roi}%</p>
            </div>
            <div className="rounded-xl bg-brand-navy p-3 text-white">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue vs Expense Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-brand-navy">Revenue vs Acquisition Cost (?)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialBarData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  formatter={(value: any) => [`?${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" fill="#FF6B00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Type Distribution Pie Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-brand-navy">Meetings by Profession / Client Type</h3>
          <div className="mt-4 h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {clientTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {clientTypeData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                ></span>
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
