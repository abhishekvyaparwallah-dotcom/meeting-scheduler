'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Building2,
  Phone,
  Sparkles,
  ArrowRight,
  Shuffle,
  UserCheck,
  Database,
} from 'lucide-react';
import { AppUser, CallingLead, ClientType } from '@/lib/types';
import {
  ParsedLeadRow,
  parseExcelOrCsvFile,
  downloadSampleTemplate,
  cleanPhoneNumber
} from '@/lib/lead-importer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  onImportLeads: (leads: Partial<CallingLead>[]) => Promise<void>;
}

type AssignmentMode = 'POOL' | 'SINGLE' | 'ROUND_ROBIN' | 'MANUAL';

export default function LeadImportModal({ isOpen, onClose, users, onImportLeads }: Props) {
  const [activeTab, setActiveTab] = useState<'BULK' | 'SINGLE'>('BULK');
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Assignment state (Default to Master Pool)
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('POOL');
  const telecallers = users.filter((u) => u.role === 'TELECALLER');
  const defaultTelecallerId = telecallers[0]?.employeeId || '';
  const [bulkTelecallerId, setBulkTelecallerId] = useState<string>(defaultTelecallerId);

  // Single Lead Form state
  const [singleForm, setSingleForm] = useState<{
    clientName: string;
    doctorName: string;
    clientType: ClientType;
    phone: string;
    city: string;
    assignedEmployeeId: string;
    notes: string;
  }>({
    clientName: '',
    doctorName: '',
    clientType: 'Clinic / Hospital',
    phone: '',
    city: 'Indore',
    assignedEmployeeId: 'UNASSIGNED',
    notes: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle File Drop or Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const initialTarget = assignmentMode === 'POOL' ? 'UNASSIGNED' : (bulkTelecallerId || defaultTelecallerId);
      const rows = parseExcelOrCsvFile(buffer, initialTarget);
      
      // Apply initial assignment mode
      let assignedRows = [...rows];
      if (assignmentMode === 'POOL') {
        assignedRows = assignedRows.map((r) => ({
          ...r,
          assignedEmployeeId: 'UNASSIGNED',
        }));
      } else if (assignmentMode === 'ROUND_ROBIN' && telecallers.length > 0) {
        assignedRows = assignedRows.map((r, i) => ({
          ...r,
          assignedEmployeeId: telecallers[i % telecallers.length].employeeId,
        }));
      } else {
        assignedRows = assignedRows.map((r) => ({
          ...r,
          assignedEmployeeId: bulkTelecallerId || defaultTelecallerId,
        }));
      }

      setParsedRows(assignedRows);
    } catch (err) {
      console.error('File parsing error:', err);
      alert('Failed to parse spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Row edit handler
  const handleUpdateRow = (id: string, updates: Partial<ParsedLeadRow>) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...updates };
        if (updates.phone !== undefined) {
          const { phone, isValid } = cleanPhoneNumber(updates.phone);
          updated.phone = phone;
          updated.isValid = Boolean(updated.clientName && isValid);
          updated.validationError = isValid ? undefined : 'Invalid mobile number';
        }
        if (updates.clientName !== undefined) {
          const { isValid } = cleanPhoneNumber(updated.phone);
          updated.isValid = Boolean(updates.clientName.trim() && isValid);
        }
        return updated;
      })
    );
  };

  // Remove single row
  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Bulk Assignment Re-apply
  const handleAssignmentModeChange = (mode: AssignmentMode, selectedEmployeeId?: string) => {
    setAssignmentMode(mode);
    const targetEmpId = selectedEmployeeId ?? bulkTelecallerId ?? defaultTelecallerId;
    if (selectedEmployeeId) {
      setBulkTelecallerId(selectedEmployeeId);
    }

    setParsedRows((prev) =>
      prev.map((row, index) => {
        if (mode === 'POOL') {
          return {
            ...row,
            assignedEmployeeId: 'UNASSIGNED',
          };
        } else if (mode === 'ROUND_ROBIN' && telecallers.length > 0) {
          return {
            ...row,
            assignedEmployeeId: telecallers[index % telecallers.length].employeeId,
          };
        } else if (mode === 'SINGLE') {
          return {
            ...row,
            assignedEmployeeId: targetEmpId,
          };
        }
        return row;
      })
    );
  };

  // Bulk Submit Handler
  const handleBulkSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid leads to import. Please check that phone numbers and names are filled.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<CallingLead>[] = validRows.map((r) => ({
        clientName: r.clientName,
        doctorName: r.doctorName || '',
        clientType: r.clientType,
        phone: r.phone,
        city: r.city || 'Indore',
        assignedEmployeeId: r.assignedEmployeeId,
        notes: r.notes || '',
        status: 'NEW',
      }));

      await onImportLeads(payload);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import leads. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single Lead Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.clientName || !singleForm.phone) {
      alert('Please fill in clinic/school name and phone number.');
      return;
    }
    const { phone, isValid } = cleanPhoneNumber(singleForm.phone);
    if (!isValid) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onImportLeads([
        {
          clientName: singleForm.clientName.trim(),
          doctorName: singleForm.doctorName.trim(),
          clientType: singleForm.clientType,
          phone,
          city: singleForm.city || 'Indore',
          assignedEmployeeId: singleForm.assignedEmployeeId || defaultTelecallerId,
          notes: singleForm.notes,
          status: 'NEW',
        },
      ]);
      onClose();
    } catch (err) {
      console.error('Create lead error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2 text-brand-orange">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Admin Workspace</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Smart AI Column Detection
                </span>
              </div>
              <h2 className="text-xl font-bold text-brand-navy">Import & Assign Calling Leads</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('BULK')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-bold transition ${
              activeTab === 'BULK'
                ? 'border-brand-orange text-brand-orange bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud size={17} />
            Bulk Excel / CSV File Import
            {parsedRows.length > 0 && (
              <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs text-brand-orange font-bold">
                {parsedRows.length} Leads
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SINGLE')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-bold transition ${
              activeTab === 'SINGLE'
                ? 'border-brand-orange text-brand-orange bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={17} />
            Single Lead Manual Entry
          </button>
        </div>

        {/* Tab 1: BULK EXCEL / CSV IMPORT */}
        {activeTab === 'BULK' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Upload & Template Download Bar */}
            {parsedRows.length === 0 ? (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition hover:border-brand-orange hover:bg-orange-50/30"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-brand-orange transition group-hover:scale-110">
                    <UploadCloud size={28} />
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-800">
                    Click to browse or Drag & Drop Doctor / Hospital Leads Sheet
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md">
                    Supports <strong>.xlsx, .xls, and .csv</strong> files. Automatically detects Doctor Name, Hospital/Clinic, Phone Numbers, and Categories.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 border border-slate-200">
                      🩺 Doctor Name / Hospital / Clinic
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 border border-slate-200">
                      📞 Mobile Number Auto-Clean
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 border border-slate-200">
                      🏫 School / Coaching Auto-Tag
                    </span>
                  </div>
                </div>

                {/* Sample Template Downloads */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="text-blue-600" size={20} />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Need a ready-made Excel format?</p>
                      <p className="text-xs text-blue-700">Download our pre-formatted sample with Doctor & Hospital columns.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate('xlsx')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-50 shadow-sm transition"
                    >
                      <Download size={14} />
                      Sample Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate('csv')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-50 shadow-sm transition"
                    >
                      <Download size={14} />
                      Sample CSV
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* When file is parsed: Show Assignment Controls & Table Preview */
              <div className="space-y-4">
                {/* File summary & Re-upload button */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{fileName}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-emerald-700">✓ {validCount} valid leads</span>
                        {invalidCount > 0 && (
                          <span className="font-semibold text-rose-600">⚠ {invalidCount} need review</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedRows([]);
                        setFileName('');
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Upload Different File
                    </button>
                  </div>
                </div>

                {/* Telecaller Assignment Configuration Box */}
                <div className="rounded-xl border border-brand-orange/30 bg-orange-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="text-brand-orange" size={18} />
                      <h4 className="text-sm font-bold text-brand-navy">Assign Leads to Telecallers</h4>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Choose how leads should be distributed:</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Option 0: Save to Master Pool (Recommended) */}
                    <div
                      onClick={() => handleAssignmentModeChange('POOL')}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        assignmentMode === 'POOL'
                          ? 'border-brand-orange bg-white shadow-sm ring-2 ring-brand-orange'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Database size={16} className={assignmentMode === 'POOL' ? 'text-brand-orange' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-800">Save to Master Pool</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 leading-tight">
                        Stores all {validCount} leads in unassigned bank. You can allocate 5-10 calls daily on demand.
                      </p>
                    </div>

                    {/* Option 1: Single Assignee */}
                    <div
                      onClick={() => handleAssignmentModeChange('SINGLE')}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        assignmentMode === 'SINGLE'
                          ? 'border-brand-orange bg-white shadow-sm ring-2 ring-brand-orange'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className={assignmentMode === 'SINGLE' ? 'text-brand-orange' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-800">Assign to One Telecaller</span>
                      </div>
                      <select
                        value={bulkTelecallerId}
                        onChange={(e) => handleAssignmentModeChange('SINGLE', e.target.value)}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-orange"
                      >
                        {telecallers.map((t) => (
                          <option key={t.employeeId} value={t.employeeId}>
                            {t.name} ({t.employeeId})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Option 2: Round Robin Distribute */}
                    <div
                      onClick={() => handleAssignmentModeChange('ROUND_ROBIN')}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        assignmentMode === 'ROUND_ROBIN'
                          ? 'border-brand-orange bg-white shadow-sm ring-2 ring-brand-orange'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shuffle size={16} className={assignmentMode === 'ROUND_ROBIN' ? 'text-brand-orange' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-800">Distribute Evenly</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 leading-tight">
                        Equally splits {validCount} leads across all {telecallers.length} active telecallers automatically.
                      </p>
                    </div>

                    {/* Option 3: Manual Assignment */}
                    <div
                      onClick={() => setAssignmentMode('MANUAL')}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        assignmentMode === 'MANUAL'
                          ? 'border-brand-orange bg-white shadow-sm ring-2 ring-brand-orange'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} className={assignmentMode === 'MANUAL' ? 'text-brand-orange' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-800">Custom Per-Lead</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 leading-tight">
                        Select specific telecaller individually from the table below for each lead.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Editable Preview Table */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Preview & Verification ({parsedRows.length} Leads)</span>
                    <span className="text-[11px] text-slate-500">You can edit category, phone, or assigned staff inline before importing.</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider backdrop-blur-xs">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Doctor / Hospital Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Phone Number</th>
                          <th className="py-2.5 px-3">City</th>
                          <th className="py-2.5 px-3">
                            {assignmentMode === 'POOL' ? 'Target Destination' : 'Assigned Telecaller'}
                          </th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row, idx) => {
                          const assignedUser = telecallers.find((t) => t.employeeId === row.assignedEmployeeId);
                          return (
                            <tr key={row.id} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                              <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                              
                              {/* Client / Doctor Name */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={row.clientName}
                                  onChange={(e) => handleUpdateRow(row.id, { clientName: e.target.value })}
                                  className="w-full rounded border border-transparent hover:border-slate-300 focus:border-brand-orange bg-transparent px-1.5 py-1 font-semibold text-slate-900 outline-none"
                                />
                                {row.doctorName && (
                                  <div className="flex items-center gap-1 mt-0.5 px-1.5">
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                                      👨‍⚕️ Dr: {row.doctorName}
                                    </span>
                                  </div>
                                )}
                                {row.notes && <p className="text-[10px] text-slate-400 truncate px-1.5">{row.notes}</p>}
                              </td>

                              {/* Category Toggle */}
                              <td className="py-2.5 px-3">
                                <select
                                  value={row.clientType}
                                  onChange={(e) => handleUpdateRow(row.id, { clientType: e.target.value as ClientType })}
                                  className={`rounded-lg border px-2 py-1 text-[11px] font-bold outline-none ${
                                    row.clientType === 'Clinic / Hospital'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : 'border-blue-200 bg-blue-50 text-blue-800'
                                  }`}
                                >
                                  <option value="Clinic / Hospital">Clinic / Hospital</option>
                                  <option value="School / Coaching">School / Coaching</option>
                                </select>
                              </td>

                              {/* Phone */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={row.phone}
                                    onChange={(e) => handleUpdateRow(row.id, { phone: e.target.value })}
                                    className={`w-28 rounded border px-2 py-1 font-mono font-bold text-xs outline-none ${
                                      row.isValid
                                        ? 'border-slate-300 bg-white text-slate-800 focus:border-brand-orange'
                                        : 'border-rose-400 bg-rose-50 text-rose-800'
                                    }`}
                                  />
                                  {row.isValid ? (
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                  ) : (
                                    <AlertCircle size={14} className="text-rose-500 shrink-0" />
                                  )}
                                </div>
                              </td>

                              {/* City */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={row.city}
                                  onChange={(e) => handleUpdateRow(row.id, { city: e.target.value })}
                                  className="w-20 rounded border border-transparent hover:border-slate-300 focus:border-brand-orange bg-transparent px-1.5 py-1 text-slate-700 outline-none"
                                />
                              </td>

                              {/* Telecaller / Destination */}
                              <td className="py-2.5 px-3">
                                {assignmentMode === 'POOL' ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                    Master Pool (Unassigned)
                                  </span>
                                ) : (
                                  <select
                                    value={row.assignedEmployeeId}
                                    onChange={(e) => handleUpdateRow(row.id, { assignedEmployeeId: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-brand-orange"
                                  >
                                    <option value="UNASSIGNED">⚪ Master Pool (Unassigned)</option>
                                    {telecallers.map((t) => (
                                      <option key={t.employeeId} value={t.employeeId}>
                                        {t.name} ({t.employeeId})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Delete row"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: SINGLE LEAD MANUAL ENTRY */}
        {activeTab === 'SINGLE' && (
          <form onSubmit={handleSingleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Hospital / Clinic / School Name *
                </label>
                <input
                  type="text"
                  required
                  value={singleForm.clientName}
                  onChange={(e) => setSingleForm({ ...singleForm, clientName: e.target.value })}
                  placeholder="e.g. City Care Hospital / Bright Public School"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Doctor / Contact Person Name
                </label>
                <input
                  type="text"
                  value={singleForm.doctorName}
                  onChange={(e) => setSingleForm({ ...singleForm, doctorName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma / Amit Agrawal"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Client Category</label>
                <select
                  value={singleForm.clientType}
                  onChange={(e) => setSingleForm({ ...singleForm, clientType: e.target.value as ClientType })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-brand-orange"
                >
                  <option value="Clinic / Hospital">Clinic / Hospital</option>
                  <option value="School / Coaching">School / Coaching</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Phone Number (10-Digit Mobile) *</label>
                <input
                  type="text"
                  required
                  value={singleForm.phone}
                  onChange={(e) => setSingleForm({ ...singleForm, phone: e.target.value })}
                  placeholder="9876543210"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">City / Area</label>
                <input
                  type="text"
                  value={singleForm.city}
                  onChange={(e) => setSingleForm({ ...singleForm, city: e.target.value })}
                  placeholder="e.g. Indore / Bhopal"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Allocation Target</label>
                <select
                  value={singleForm.assignedEmployeeId}
                  onChange={(e) => setSingleForm({ ...singleForm, assignedEmployeeId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-brand-orange"
                >
                  <option value="UNASSIGNED">⚪ Save to Master Pool (Unassigned)</option>
                  {telecallers.map((t) => (
                    <option key={t.employeeId} value={t.employeeId}>
                      {t.name} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600">Initial Notes / Specialization</label>
                <textarea
                  rows={2}
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                  placeholder="e.g. Orthopedic Surgeon, timing 4 PM..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-orange"
                />
              </div>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          {activeTab === 'BULK' ? (
            <button
              type="button"
              disabled={parsedRows.length === 0 || validCount === 0 || isSubmitting}
              onClick={handleBulkSubmit}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition ${
                parsedRows.length === 0 || validCount === 0 || isSubmitting
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-brand-orange hover:bg-brand-orangeHover shadow-md shadow-orange-500/20'
              }`}
            >
              {isSubmitting ? (
                assignmentMode === 'POOL' ? 'Saving to Master Pool...' : 'Importing & Assigning...'
              ) : (
                <>
                  <span>
                    {assignmentMode === 'POOL'
                      ? `Save ${validCount > 0 ? `${validCount} Leads ` : ''}to Master Pool`
                      : `Import & Assign ${validCount > 0 ? `${validCount} Leads` : ''}`}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSingleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-orangeHover shadow-md shadow-orange-500/20"
            >
              <span>
                {singleForm.assignedEmployeeId === 'UNASSIGNED'
                  ? 'Save to Master Pool'
                  : 'Add & Assign Single Lead'}
              </span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
