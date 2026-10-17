import React, { useState } from 'react';
import { BorrowRecord, BorrowType } from '../../types';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
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
} from 'lucide-react';

interface BorrowReturnsViewProps {
  records: BorrowRecord[];
  onRefresh: () => void;
}

export const BorrowReturnsView: React.FC<BorrowReturnsViewProps> = ({
  records,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | BorrowType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    if (!person.trim() || !amount || Number(amount) <= 0) {
      alert('Please fill in person and a valid amount.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date,
        month: date.substring(0, 7),
        type,
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
      console.error('Failed to save borrow record:', err);
      alert('Failed to save record.');
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
    if (!confirm('Are you sure you want to delete this borrow/return record?')) return;
    try {
      await fetch(`/api/budget/borrow/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  // Separate loans/borrowed debts from returns (returns are now in their own tab)
  const borrowRecords = records.filter((r) => r.type !== 'RETURN');

  const filtered = borrowRecords.filter((r) => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPerson = r.person.toLowerCase().includes(q);
      const matchReason = r.reason?.toLowerCase().includes(q);
      if (!matchPerson && !matchReason) return false;
    }
    return true;
  });

  const totalBorrowedPending = borrowRecords
    .filter((r) => r.type === 'BORROW' && r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalBorrowedSettled = borrowRecords
    .filter((r) => r.type === 'BORROW' && r.status === 'SETTLED')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalLentPending = borrowRecords
    .filter((r) => r.type === 'LENT' && r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Borrowed (My Debt)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-red-600 dark:text-red-400">₹{formatINR(totalBorrowedPending)}</span>
            <span className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full font-semibold">Liabilities</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Active loans taken by you from people or banks</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Settled / Repaid Debts</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{formatINR(totalBorrowedSettled)}</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-semibold">Cleared</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Loans you have completely paid back</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lent to Others (Receivable)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{formatINR(totalLentPending)}</span>
            <span className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full font-semibold">Active Loans</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Money you gave to others to be returned</p>
        </div>

        <div className="flex items-center">
          <Button
            onClick={handleOpenNew}
            className="w-full h-full min-h-[58px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs flex items-center justify-center gap-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Loan / Borrow
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
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type filters */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Loans
            </button>
            <button
              onClick={() => setFilterType('BORROW')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === 'BORROW' ? 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 shadow-2xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Borrowed (Debt)
            </button>
            <button
              onClick={() => setFilterType('LENT')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === 'LENT' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lent Out
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Only</option>
            <option value="SETTLED">Settled Only</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Person / Entity</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      <button
                        onClick={() => handleToggleStatus(rec)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
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
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      ₹{formatINR(rec.amount)}
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRecord ? 'Edit Loan / Return Record' : 'Add Loan / Borrow Record'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('BORROW')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      type === 'BORROW'
                        ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>I Borrowed (Debt)</span>
                    <span className="text-[9px] font-normal text-slate-500">Loan taken from bank / person</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('LENT')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      type === 'LENT'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>I Lent Out (Receivable)</span>
                    <span className="text-[9px] font-normal text-slate-500">Money given to someone</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Person / Entity Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Soso, Iban Mian, Friend, Bank"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Settlement return, Hotel advance, Emergency funds"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="PENDING">Pending (Still Open / Unpaid)</option>
                  <option value="SETTLED">Settled (Fully Cleared)</option>
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
          </div>
        </div>
      )}
    </div>
  );
};
