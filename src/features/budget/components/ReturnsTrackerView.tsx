import React, { useState } from 'react';
import { BorrowRecord } from '@/types';
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
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  X,
  Search,
  Filter,
  Users,
  Coins,
  Check,
  FileSpreadsheet,
  Banknote,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { DataImportModal, FieldDefinition } from '@/components/common/DataImportModal';
import { DistinctDropdownFilter, DistinctFilterOption } from '@/components/common/DistinctDropdownFilter';
import { FilterChipsBar, ActiveFilterChip } from '@/components/common/FilterChipsBar';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';

interface ReturnsTrackerViewProps {
  records: BorrowRecord[];
  currentMonth: string;
  onRefresh: (entryMonth?: string) => void;
}

const RETURNS_IMPORT_FIELDS: FieldDefinition[] = [
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
    synonyms: ['person', 'name', 'party', 'contact', 'friend'],
  },
  {
    key: 'amount',
    label: 'Amount Returned (₹)',
    required: true,
    type: 'number',
    synonyms: ['amount', 'amt', 'value', 'returned', 'repayment', 'total'],
  },
  {
    key: 'status',
    label: 'Status (SETTLED / PENDING)',
    required: false,
    type: 'string',
    synonyms: ['status', 'state'],
    defaultValue: 'SETTLED',
  },
  {
    key: 'reason',
    label: 'Reason / Purpose',
    required: false,
    type: 'string',
    synonyms: ['reason', 'purpose', 'for', 'description', 'notes'],
    defaultValue: 'Repayment of loan',
  },
  {
    key: 'type',
    label: 'Type',
    required: false,
    type: 'string',
    synonyms: ['type'],
    defaultValue: 'RETURN',
  },
];

const RETURNS_SAMPLE_TEMPLATE = [
  {
    'Date': '2026-10-10',
    'Person': 'Alex Sharma',
    'Amount': 2000,
    'Status': 'SETTLED',
    'Reason': 'Partial return of emergency cash',
    'Type': 'RETURN',
  },
];

export const ReturnsTrackerView: React.FC<ReturnsTrackerViewProps> = ({
  records,
  currentMonth,
  onRefresh,
}) => {
  // Only records of type 'RETURN' (money people paid back to the user)
  const returnRecords = records.filter((r) => r.type === 'RETURN');

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
  const [person, setPerson] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<'PENDING' | 'SETTLED'>('SETTLED');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setDate(new Date().toISOString().substring(0, 10));
    setPerson('');
    setReason('');
    setAmount('');
    setStatus('SETTLED');
  };

  const handleOpenNew = () => {
    setEditingRecord(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: BorrowRecord) => {
    setEditingRecord(rec);
    setDate(rec.date);
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
      alert('Please fill in contact person and a valid amount greater than 0.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date,
        month: date.substring(0, 7),
        type: 'RETURN', // Always RETURN
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
      console.error('Failed to save return record:', err);
      alert(`Could not save return record: ${err.message || 'Please check your connection and login.'}`);
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
    if (!confirm('Are you sure you want to delete this return record?')) return;
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
      console.error('Failed to delete return record:', err);
      alert(`Could not delete record: ${err.message || 'Please try again.'}`);
    }
  };

  // Dynamic distinct person options with record counts
  const personCounts = returnRecords.reduce((acc, r) => {
    if (r.person) acc[r.person] = (acc[r.person] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const personOptions: DistinctFilterOption[] = Object.entries(personCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([p, count]) => ({ value: p, label: p, count }));

  // Amount band options with counts
  const amountBandOptions: DistinctFilterOption[] = [
    { value: 'under_2k', label: 'Under ₹2,000', count: returnRecords.filter((r) => r.amount < 2000).length },
    { value: '2k_10k', label: '₹2,000 – ₹10,000', count: returnRecords.filter((r) => r.amount >= 2000 && r.amount <= 10000).length },
    { value: 'above_10k', label: 'Above ₹10,000', count: returnRecords.filter((r) => r.amount > 10000).length },
  ];

  const sortOptions: DistinctFilterOption[] = [
    { value: 'date_desc', label: 'Date: Newest First' },
    { value: 'date_asc', label: 'Date: Oldest First' },
    { value: 'amount_desc', label: 'Amount: High to Low' },
    { value: 'amount_asc', label: 'Amount: Low to High' },
  ];

  const filtered = returnRecords
    .filter((r) => {
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

  const totalSettled = filtered
    .filter((r) => r.status === 'SETTLED')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPending = filtered
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

  // Active filter chips
  const activeChips: ActiveFilterChip[] = [];
  if (statusFilter !== 'ALL') {
    activeChips.push({
      key: 'status',
      label: 'Status',
      valueDisplay: statusFilter === 'SETTLED' ? 'Received (Settled)' : 'Pending',
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
    setStatusFilter('ALL');
    setSelectedPerson('all');
    setSelectedAmountBand('all');
    setSearch('');
  };

  const returnsExportColumns: ExportColumn<BorrowRecord>[] = [
    { header: 'Date', key: 'date', width: 12, align: 'center' },
    { header: 'Person (Who Repaid)', key: 'person', width: 22, align: 'left' },
    {
      header: 'Amount Returned',
      key: 'amount',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Status',
      key: 'status',
      width: 14,
      align: 'center',
      format: (val) => (val === 'SETTLED' ? 'Received (Settled)' : 'Pending'),
    },
    {
      header: 'Settled Date',
      key: 'settled_date',
      width: 14,
      align: 'center',
      format: (val) => val || '-',
    },
    {
      header: 'Notes / Settlement Reason',
      key: 'reason',
      width: 26,
      align: 'left',
      format: (val) => val || '',
    },
  ];

  const returnsExportOptions = {
    filename: `Returns_Tracker_${new Date().toISOString().slice(0, 10)}`,
    title: 'Returns & Repayments Tracker Report',
    subtitle: `Exported ${filtered.length} repayment entries matching applied filters`,
    sheetName: 'Returns',
    columns: returnsExportColumns,
    data: filtered,
    summaryMetrics: [
      { label: 'Total Received (Inflow)', value: formatCurrencyForPdf(totalSettled) },
      { label: 'Pending Refunds', value: formatCurrencyForPdf(totalPending) },
      { label: 'Records Exported', value: `${filtered.length} of ${returnRecords.length}` },
    ],
  };

  // Group by person to see who repaid how much
  const personTotals = returnRecords.reduce((acc, r) => {
    if (!acc[r.person]) acc[r.person] = { settled: 0, pending: 0 };
    if (r.status === 'SETTLED') acc[r.person].settled += r.amount;
    else acc[r.person].pending += r.amount;
    return acc;
  }, {} as Record<string, { settled: number; pending: number }>);

  return (
    <div className="space-y-6">
      {/* KPI Cards: Returns Dedicated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Settled Inflow */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Returned to Me (Inflow)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{formatINR(totalSettled)}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-semibold">
              +Cash Inflow
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
            Cash collected back from loans given to people
          </p>
        </div>

        {/* Pending Returns Owed to Me */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Repayments (Owed to Me)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              ₹{formatINR(totalPending)}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-semibold">
              Pending
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Unsettled balances people haven't paid back yet
          </p>
        </div>

        {/* People Summary */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Repayment Contacts
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {Object.keys(personTotals).length} Contacts
            </span>
            <span className="text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full font-semibold">
              {returnRecords.length} Entries
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {Object.keys(personTotals).join(', ') || 'None'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 justify-center">
          <Button
            onClick={handleOpenNew}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs flex items-center justify-center gap-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Money Returned to Me
          </Button>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="w-full py-2 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 font-medium shadow-2xs flex items-center justify-center gap-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Import Excel / CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <Input
              type="text"
              placeholder="Search person or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
              <Button
                type="button"
                variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
                className="h-7 text-xs font-bold"
              >
                All Status
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'SETTLED' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('SETTLED')}
                className="h-7 text-xs font-bold"
              >
                Received
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'PENDING' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('PENDING')}
                className="h-7 text-xs font-bold"
              >
                Pending
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

            {/* Export Actions (Excel & PDF) */}
            <ExportActions exportOptions={returnsExportOptions} />
          </div>
        </div>

        {/* Active Chips & Counter */}
        <FilterChipsBar
          chips={activeChips}
          onClearAll={handleClearAllFilters}
          filteredCount={filtered.length}
          totalCount={returnRecords.length}
          itemNoun="return records"
        />
      </div>

      {/* Returns Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <TableHead className="py-3 px-4">Date</TableHead>
                <TableHead className="py-3 px-4">Person (Who Repaid)</TableHead>
                <TableHead className="py-3 px-4">Notes / Settlement Reason</TableHead>
                <TableHead className="py-3 px-4 text-center">Payment Status</TableHead>
                <TableHead className="py-3 px-4 text-right">Cash Received</TableHead>
                <TableHead className="py-3 px-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No return records found. Click "+ Record Money Returned to Me" to add one.
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                          {rec.person.substring(0, 1).toUpperCase()}
                        </span>
                        {rec.person}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {rec.reason || <span className="text-slate-400 italic">Loan repayment</span>}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(rec)}
                        title="Click to toggle status between Received and Pending"
                        className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'SETTLED'
                            ? 'bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100/70 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {rec.status === 'SETTLED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Received (Settled)
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Payment
                          </>
                        )}
                      </Button>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      +₹{formatINR(rec.amount)}
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

      {/* Add / Edit Return Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                {editingRecord ? 'Edit Money Returned to Me' : 'Record Money Returned to Me'}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-emerald-600 font-semibold">
                + Inflow (Cash collected back)
              </DialogDescription>
            </div>
          </DialogHeader>

            <form onSubmit={handleSave} className="p-6 space-y-4">
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact / Person Name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Soso, Iban Mian, Friend"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Reason / Notes
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Loan repaid, Hotel expense advance settled"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                  <SelectTrigger className="w-full text-xs h-9 bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SETTLED">Received & Cleared (Settled Inflow)</SelectItem>
                    <SelectItem value="PENDING">Pending (Promised repayment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  {saving
                    ? 'Saving...'
                    : editingRecord
                    ? 'Save Changes'
                    : 'Record Return Inflow'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Excel / CSV Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Returned Money Records from Excel / CSV"
        description="Bulk import repayments of money lent to contacts or friends"
        entityName="Returns"
        targetFields={RETURNS_IMPORT_FIELDS}
        sampleData={RETURNS_SAMPLE_TEMPLATE}
        apiEndpoint="/api/budget/borrow/batch"
        onSuccess={(count) => {
          alert(`Successfully imported ${count} return records!`);
          onRefresh();
        }}
      />
    </div>
  );
};
