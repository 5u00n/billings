import React, { useState } from 'react';
import { BorrowRecord, BorrowType } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  X,
  Search,
  Filter,
  FileSpreadsheet,
  Banknote,
  User,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { DataImportModal, FieldDefinition } from '@/components/common/DataImportModal';
import { DistinctDropdownFilter, DistinctFilterOption } from '@/components/common/DistinctDropdownFilter';
import { FilterChipsBar, ActiveFilterChip } from '@/components/common/FilterChipsBar';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';

interface BorrowReturnsViewProps {
  records: BorrowRecord[];
  onRefresh: (entryMonth?: string) => void;
}

const BORROW_IMPORT_FIELDS: FieldDefinition[] = [
  {
    key: 'date',
    label: 'Date (YYYY-MM-DD)',
    required: true,
    type: 'date',
    synonyms: ['date', 'txn date', 'record date', 'day', 'dt'],
  },
  {
    key: 'person',
    label: 'Person / Party',
    required: true,
    type: 'string',
    synonyms: ['person', 'name', 'party', 'borrower', 'lender', 'contact', 'friend'],
  },
  {
    key: 'amount',
    label: 'Amount (₹)',
    required: true,
    type: 'number',
    synonyms: ['amount', 'amt', 'value', 'loan amount', 'total'],
  },
  {
    key: 'type',
    label: 'Type (BORROW / LENT / RETURN)',
    required: false,
    type: 'string',
    synonyms: ['type', 'record type', 'kind'],
    defaultValue: 'BORROW',
  },
  {
    key: 'status',
    label: 'Status (PENDING / SETTLED)',
    required: false,
    type: 'string',
    synonyms: ['status', 'state'],
    defaultValue: 'PENDING',
  },
  {
    key: 'reason',
    label: 'Reason / Purpose',
    required: false,
    type: 'string',
    synonyms: ['reason', 'purpose', 'for', 'description', 'notes'],
    defaultValue: '',
  },
];

const BORROW_SAMPLE_TEMPLATE = [
  {
    'Date': '2026-10-10',
    'Person': 'Alex Sharma',
    'Amount': 5000,
    'Type': 'BORROW',
    'Status': 'PENDING',
    'Reason': 'Short-term emergency cash',
  },
  {
    'Date': '2026-10-12',
    'Person': 'Rahul Verma',
    'Amount': 3000,
    'Type': 'LENT',
    'Status': 'PENDING',
    'Reason': 'Trip advance shared',
  },
];

export const BorrowReturnsView: React.FC<BorrowReturnsViewProps> = ({
  records,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | BorrowType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [selectedAmountBand, setSelectedAmountBand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BorrowRecord | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [type, setType] = useState<BorrowType>('BORROW');
  const [person, setPerson] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<'PENDING' | 'SETTLED'>('PENDING');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setDate(new Date().toISOString().substring(0, 10));
    setType('BORROW');
    setPerson('');
    setReason('');
    setAmount('');
    setStatus('PENDING');
  };

  const handleOpenNew = () => {
    setEditingRecord(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: BorrowRecord) => {
    setEditingRecord(rec);
    setDate(rec.date);
    setType(rec.type);
    setPerson(rec.person);
    setReason(rec.reason || '');
    setAmount(rec.amount);
    setStatus(rec.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPerson = person.trim();
    const numAmount = Number(amount);
    if (!cleanPerson || !amount || isNaN(numAmount) || numAmount <= 0) {
      alert('Please fill in person and a valid amount greater than 0.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date,
        month: date.substring(0, 7),
        type,
        person: cleanPerson,
        reason: reason.trim() || undefined,
        amount: numAmount,
        status,
      };

      let res: Response;
      if (editingRecord) {
        res = await fetch(`/api/budget/borrow/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/budget/borrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        let errorMsg = `Server error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }

      setIsModalOpen(false);
      setEditingRecord(null);
      resetForm();
      onRefresh(payload.month);
    } catch (err: any) {
      console.error('Failed to save borrow record:', err);
      alert(`Could not save record: ${err.message || 'Please check your connection and login.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (record: BorrowRecord) => {
    try {
      const nextStatus = record.status === 'SETTLED' ? 'PENDING' : 'SETTLED';
      const res = await fetch(`/api/budget/borrow/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          status: nextStatus,
        }),
      });
      if (!res.ok) {
        let errorMsg = `Server error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }
      onRefresh(record.month);
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      alert(`Could not update status: ${err.message || 'Please try again.'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this borrow/return record?')) return;
    try {
      const res = await fetch(`/api/budget/borrow/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        let errorMsg = `Server error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }
      onRefresh();
    } catch (err: any) {
      console.error('Failed to delete record:', err);
      alert(`Could not delete record: ${err.message || 'Please try again.'}`);
    }
  };

  // Separate loans/borrowed debts from returns (returns are now in their own tab)
  const borrowRecords = records.filter((r) => r.type !== 'RETURN' && !r.migrated_account_id);

  // Dynamic distinct person options with record counts
  const personCounts = borrowRecords.reduce((acc, r) => {
    if (r.person) acc[r.person] = (acc[r.person] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const personOptions: DistinctFilterOption[] = Object.entries(personCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([p, count]) => ({ value: p, label: p, count }));

  // Dynamic distinct loan type options
  const typeCounts = borrowRecords.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeOptions: DistinctFilterOption[] = [
    { value: 'BORROW', label: 'Borrow (Inflow)', count: typeCounts['BORROW'] || 0 },
    { value: 'LENT', label: 'Lent (Outflow)', count: typeCounts['LENT'] || 0 },
  ];

  // Dynamic distinct status options
  const statusCounts = borrowRecords.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusOptions: DistinctFilterOption[] = [
    { value: 'PENDING', label: 'Active Debt (Pending)', count: statusCounts['PENDING'] || 0 },
    { value: 'SETTLED', label: 'Settled / Paid', count: statusCounts['SETTLED'] || 0 },
  ];

  // Amount band options with counts
  const amountBandOptions: DistinctFilterOption[] = [
    { value: 'under_2k', label: 'Under ₹2,000', count: borrowRecords.filter((r) => r.amount < 2000).length },
    { value: '2k_10k', label: '₹2,000 – ₹10,000', count: borrowRecords.filter((r) => r.amount >= 2000 && r.amount <= 10000).length },
    { value: 'above_10k', label: 'Above ₹10,000', count: borrowRecords.filter((r) => r.amount > 10000).length },
  ];

  const sortOptions: DistinctFilterOption[] = [
    { value: 'date_desc', label: 'Date: Newest First' },
    { value: 'date_asc', label: 'Date: Oldest First' },
    { value: 'amount_desc', label: 'Amount: High to Low' },
    { value: 'amount_asc', label: 'Amount: Low to High' },
  ];

  const filtered = borrowRecords
    .filter((r) => {
      if (filterType !== 'ALL' && r.type !== filterType) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (selectedPerson !== 'all' && r.person !== selectedPerson) return false;

      // Amount band
      if (selectedAmountBand === 'under_2k' && r.amount >= 2000) return false;
      if (selectedAmountBand === '2k_10k' && (r.amount < 2000 || r.amount > 10000)) return false;
      if (selectedAmountBand === 'above_10k' && r.amount <= 10000) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPerson = r.person.toLowerCase().includes(q);
        const matchReason = r.reason?.toLowerCase().includes(q);
        if (!matchPerson && !matchReason) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return b.date.localeCompare(a.date);
    });

  const totalBorrowedPending = filtered
    .filter((r) => r.type === 'BORROW' && r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalBorrowedSettled = filtered
    .filter((r) => r.type === 'BORROW' && r.status === 'SETTLED')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalLentPending = filtered
    .filter((r) => r.type === 'LENT' && r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

  // Active filter chips
  const activeChips: ActiveFilterChip[] = [];
  if (filterType !== 'ALL') {
    activeChips.push({
      key: 'type',
      label: 'Type',
      valueDisplay: filterType === 'BORROW' ? 'Borrow' : 'Lent',
      onRemove: () => setFilterType('ALL'),
    });
  }
  if (statusFilter !== 'ALL') {
    activeChips.push({
      key: 'status',
      label: 'Status',
      valueDisplay: statusFilter === 'PENDING' ? 'Active Debt' : 'Settled',
      onRemove: () => setStatusFilter('ALL'),
    });
  }
  if (selectedPerson !== 'all') {
    activeChips.push({
      key: 'person',
      label: 'Person',
      valueDisplay: selectedPerson,
      onRemove: () => setSelectedPerson('all'),
    });
  }
  if (selectedAmountBand !== 'all') {
    const opt = amountBandOptions.find((o) => o.value === selectedAmountBand);
    activeChips.push({
      key: 'amount',
      label: 'Amount',
      valueDisplay: opt ? opt.label : selectedAmountBand,
      onRemove: () => setSelectedAmountBand('all'),
    });
  }
  if (search.trim()) {
    activeChips.push({
      key: 'search',
      label: 'Search',
      valueDisplay: `"${search.trim()}"`,
      onRemove: () => setSearch(''),
    });
  }

  const handleClearAllFilters = () => {
    setFilterType('ALL');
    setStatusFilter('ALL');
    setSelectedPerson('all');
    setSelectedAmountBand('all');
    setSearch('');
  };

  const borrowExportColumns: ExportColumn<BorrowRecord>[] = [
    { header: 'Date', key: 'date', width: 12, align: 'center' },
    { header: 'Person / Contact', key: 'person', width: 22, align: 'left' },
    {
      header: 'Type',
      key: 'type',
      width: 14,
      align: 'center',
      format: (val) => (val === 'BORROW' ? 'Borrow (Inflow)' : 'Lent (Outflow)'),
    },
    {
      header: 'Amount',
      key: 'amount',
      width: 15,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Status',
      key: 'status',
      width: 14,
      align: 'center',
      format: (val) => (val === 'PENDING' ? 'Active Debt' : 'Settled / Paid'),
    },
    {
      header: 'Settled Date',
      key: 'settled_date',
      width: 14,
      align: 'center',
      format: (val) => val || '-',
    },
    {
      header: 'Reason / Notes',
      key: 'reason',
      width: 24,
      align: 'left',
      format: (val) => val || '',
    },
  ];

  const borrowExportOptions = {
    filename: `Borrow_Debts_Ledger_${new Date().toISOString().slice(0, 10)}`,
    title: 'Borrow & Debt Records Report',
    subtitle: `Exported ${filtered.length} borrow / lending entries matching applied filters`,
    sheetName: 'Debts',
    columns: borrowExportColumns,
    data: filtered,
    summaryMetrics: [
      { label: 'Active Borrowed Debt', value: formatCurrencyForPdf(totalBorrowedPending) },
      { label: 'Settled Debt', value: formatCurrencyForPdf(totalBorrowedSettled) },
      { label: 'Lent Out (Pending)', value: formatCurrencyForPdf(totalLentPending) },
      { label: 'Records Exported', value: `${filtered.length} of ${borrowRecords.length}` },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Clean Single Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <Input
              type="text"
              placeholder="Search lender or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
              <Button
                type="button"
                variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
                className="h-7 text-xs font-semibold"
              >
                All
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'PENDING' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('PENDING')}
                className="h-7 text-xs font-semibold"
              >
                Active Debt
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'SETTLED' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('SETTLED')}
                className="h-7 text-xs font-semibold"
              >
                Settled / Paid
              </Button>
            </div>

            {/* Distinct Person Filter */}
            {personOptions.length > 0 && (
              <DistinctDropdownFilter
                label="Person"
                icon={User}
                value={selectedPerson}
                onChange={setSelectedPerson}
                options={personOptions}
                allLabel="All Contacts"
              />
            )}

            {/* Loan Type Filter */}
            <DistinctDropdownFilter
              label="Type"
              icon={Layers}
              value={filterType}
              onChange={(val) => setFilterType(val as any)}
              options={typeOptions}
              allLabel="All Types"
            />

            {/* Amount Band Filter */}
            <DistinctDropdownFilter
              label="Amount"
              icon={Banknote}
              value={selectedAmountBand}
              onChange={setSelectedAmountBand}
              options={amountBandOptions}
              allLabel="Any Amount"
            />

            {/* Sort Filter */}
            <DistinctDropdownFilter
              label="Sort"
              icon={ArrowUpDown}
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              allLabel="Date: Newest"
              align="right"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Active Debt Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs">
                <span className="text-slate-500 dark:text-slate-400">Active Debt:</span>
                <span className="font-bold text-red-700 dark:text-red-400">₹{formatINR(totalBorrowedPending)}</span>
              </div>

              {/* Export Actions (Excel & PDF) */}
              <ExportActions exportOptions={borrowExportOptions} />

              {/* Add Loan Button */}
              <Button
                onClick={handleOpenNew}
                className="h-8 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs flex items-center gap-1.5 rounded-lg text-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Loan
              </Button>

              {/* Import Excel / CSV Button */}
              <Button
                onClick={() => setIsImportModalOpen(true)}
                variant="outline"
                className="h-8 px-2.5 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 font-medium shadow-2xs flex items-center gap-1.5 rounded-lg text-xs cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Import
              </Button>
            </div>
          </div>
        </div>

        {/* Active Chips & Counter */}
        <FilterChipsBar
          chips={activeChips}
          onClearAll={handleClearAllFilters}
          filteredCount={filtered.length}
          totalCount={borrowRecords.length}
          itemNoun="debt records"
        />
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <TableHead className="py-3 px-4">Date</TableHead>
                <TableHead className="py-3 px-4">Type</TableHead>
                <TableHead className="py-3 px-4">Person / Entity</TableHead>
                <TableHead className="py-3 px-4">Reason / Notes</TableHead>
                <TableHead className="py-3 px-4 text-center">Status</TableHead>
                <TableHead className="py-3 px-4 text-right">Amount</TableHead>
                <TableHead className="py-3 px-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <HandCoins className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No borrow or return records found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {rec.type === 'BORROW' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <ArrowDownLeft className="w-3 h-3 text-red-500" />
                          I Borrowed (Debt)
                        </span>
                      )}
                      {rec.type === 'RETURN' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          Returned to Me (+Inflow)
                        </span>
                      )}
                      {rec.type === 'LENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <ArrowUpRight className="w-3 h-3 text-blue-500" />
                          Lent Out (Receivable)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {rec.person}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {rec.reason || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(rec)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'SETTLED'
                            ? 'bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100/70 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {rec.status === 'SETTLED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Settled
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending
                          </>
                        )}
                      </Button>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      ₹{formatINR(rec.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(rec)}
                          title="Edit Record"
                          className="h-7 w-7 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rec.id)}
                          title="Delete Record"
                          className="h-7 w-7 text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
              {editingRecord ? 'Edit Loan / Debt Record' : 'Record New Loan / Debt'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Track borrowed liabilities or money lent to contacts.
            </DialogDescription>
          </DialogHeader>

            <form onSubmit={handleSave} className="p-6 space-y-4 bg-white dark:bg-slate-900">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={type === 'BORROW' ? 'destructive' : 'outline'}
                    onClick={() => setType('BORROW')}
                    className="h-auto py-2 px-3 text-xs flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="font-semibold">I Borrowed (Debt)</span>
                    <span className="text-[9px] font-normal opacity-80">Loan taken from bank / person</span>
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'LENT' ? 'default' : 'outline'}
                    onClick={() => setType('LENT')}
                    className="h-auto py-2 px-3 text-xs flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="font-semibold">I Lent Out (Receivable)</span>
                    <span className="text-[9px] font-normal opacity-80">Money given to someone</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Person / Entity Name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Soso, Iban Mian, Friend, Bank"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Purpose
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Settlement return, Hotel advance, Emergency funds"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                  <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending (Still Open / Unpaid)</SelectItem>
                    <SelectItem value="SETTLED">Settled (Fully Cleared)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  {saving
                    ? 'Saving...'
                    : editingRecord
                    ? 'Save Changes'
                    : type === 'RETURN'
                    ? 'Record Return Inflow'
                    : 'Add Record'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Excel / CSV Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Borrow / Return Records from Excel / CSV"
        description="Bulk import loans, borrowed amounts, or returns from spreadsheets"
        entityName="Loans_and_Borrows"
        targetFields={BORROW_IMPORT_FIELDS}
        sampleData={BORROW_SAMPLE_TEMPLATE}
        apiEndpoint="/api/budget/borrow/batch"
        onSuccess={(count) => {
          alert(`Successfully imported ${count} loan/borrow records!`);
          onRefresh();
        }}
      />
    </div>
  );
};
