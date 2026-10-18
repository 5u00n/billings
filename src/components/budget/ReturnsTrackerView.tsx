import React, { useState } from 'react';
import { BorrowRecord } from '../../types';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
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
} from 'lucide-react';
import { DataImportModal, FieldDefinition } from '../common/DataImportModal';

interface ReturnsTrackerViewProps {
  records: BorrowRecord[];
  currentMonth: string;
  onRefresh: () => void;
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
    if (!person.trim() || !amount || Number(amount) <= 0) {
      alert('Please fill in contact person and a valid amount.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date,
        month: date.substring(0, 7),
        type: 'RETURN', // Always RETURN
        person: person.trim(),
        reason: reason.trim() || undefined,
        amount: Number(amount),
        status,
      };

      if (editingRecord) {
        await fetch(`/api/budget/borrow/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/budget/borrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setEditingRecord(null);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error('Failed to save return record:', err);
      alert('Failed to save return record.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (record: BorrowRecord) => {
    try {
      const nextStatus = record.status === 'SETTLED' ? 'PENDING' : 'SETTLED';
      await fetch(`/api/budget/borrow/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          status: nextStatus,
        }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this return record?')) return;
    try {
      await fetch(`/api/budget/borrow/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Failed to delete return record:', err);
    }
  };

  const filtered = returnRecords.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPerson = r.person.toLowerCase().includes(q);
      const matchReason = r.reason?.toLowerCase().includes(q);
      if (!matchPerson && !matchReason) return false;
    }
    return true;
  });

  const totalSettled = returnRecords
    .filter((r) => r.status === 'SETTLED')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPending = returnRecords
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search person or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'SETTLED'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Received (Settled)
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Person (Who Repaid)</th>
                <th className="py-3 px-4">Notes / Settlement Reason</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-right">Cash Received</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      <button
                        onClick={() => handleToggleStatus(rec)}
                        title="Click to toggle status between Received and Pending"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
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
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      +₹{formatINR(rec.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          title="Edit Record"
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          title="Delete Record"
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingRecord ? 'Edit Money Returned to Me' : 'Record Money Returned to Me'}
                </h3>
                <span className="text-[10px] text-emerald-600 font-semibold">+ Inflow (Cash collected back)</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 text-xs font-bold text-emerald-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact / Person Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Soso, Iban Mian, Friend"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Settlement Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Loan repaid, Hotel expense advance settled"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                >
                  <option value="SETTLED">Received & Cleared (Settled Inflow)</option>
                  <option value="PENDING">Pending (Promised repayment)</option>
                </select>
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
          </div>
        </div>
      )}

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
