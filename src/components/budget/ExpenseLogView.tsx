import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, BorrowRecord } from '../../types';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  Filter,
  FileSpreadsheet,
  HandCoins,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DataImportModal, FieldDefinition } from '../common/DataImportModal';

interface ExpenseLogViewProps {
  expenses: Expense[];
  currentMonth: string;
  onRefresh: (newMonth?: string) => void;
  quickAddOpen?: boolean;
  onCloseQuickAdd?: () => void;
  quickPaybackOpen?: boolean;
  onCloseQuickPayback?: () => void;
}

const EXPENSE_IMPORT_FIELDS: FieldDefinition[] = [
  {
    key: 'date',
    label: 'Date (YYYY-MM-DD)',
    required: true,
    type: 'date',
    synonyms: ['date', 'txn date', 'transaction date', 'expense date', 'dt', 'day'],
  },
  {
    key: 'description',
    label: 'Description / Item',
    required: true,
    type: 'string',
    synonyms: ['description', 'particulars', 'narration', 'item', 'title', 'name', 'details'],
  },
  {
    key: 'amount',
    label: 'Amount (₹)',
    required: true,
    type: 'number',
    synonyms: ['amount', 'amt', 'cost', 'paid', 'debit', 'total', 'price', 'value'],
  },
  {
    key: 'category',
    label: 'Category (reg / ext)',
    required: false,
    type: 'string',
    synonyms: ['category', 'cat', 'type', 'group'],
    defaultValue: 'ext',
  },
  {
    key: 'tag',
    label: 'Tag / Subcategory',
    required: false,
    type: 'string',
    synonyms: ['tag', 'tags', 'head', 'label', 'department'],
    defaultValue: 'General',
  },
  {
    key: 'payment_method',
    label: 'Payment Method',
    required: false,
    type: 'string',
    synonyms: ['payment_method', 'payment method', 'mode', 'payment mode', 'paid via', 'account'],
    defaultValue: 'UPI / Bank',
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    type: 'string',
    synonyms: ['notes', 'note', 'memo', 'comment', 'remarks'],
    defaultValue: '',
  },
];

const EXPENSE_SAMPLE_TEMPLATE = [
  {
    'Date': '2026-10-15',
    'Category': 'reg',
    'Tag': 'Utilities',
    'Description': 'Office High-Speed Internet Bill',
    'Amount': 1199,
    'Payment Method': 'UPI / Bank',
    'Notes': 'Monthly broadband fiber',
  },
  {
    'Date': '2026-10-16',
    'Category': 'ext',
    'Tag': 'Food',
    'Description': 'Team meeting dinner',
    'Amount': 1450,
    'Payment Method': 'UPI / Bank',
    'Notes': 'Client quarterly discussion',
  },
  {
    'Date': '2026-10-17',
    'Category': 'reg',
    'Tag': 'Fuel',
    'Description': 'Vehicle Petrol refill',
    'Amount': 500,
    'Payment Method': 'UPI / Bank',
    'Notes': 'Site visit',
  },
];

const COMMON_TAGS = [
  'Food',
  'Travel',
  'Fuel',
  'Utilities',
  'Groceries',
  'Gadgets',
  'Accessories',
  'Services',
  'Drinks',
  'Medical',
  'Entertainment',
  'Shopping',
  'Family',
];

export const ExpenseLogView: React.FC<ExpenseLogViewProps> = ({
  expenses,
  currentMonth,
  onRefresh,
  quickAddOpen = false,
  onCloseQuickAdd,
  quickPaybackOpen = false,
  onCloseQuickPayback,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'reg' | 'ext'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(quickAddOpen || quickPaybackOpen);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [entryMode, setEntryMode] = useState<'EXPENSE' | 'PAYBACK'>('EXPENSE');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('reg');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / Bank');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Credit Card borrow options
  const [createCcBorrow, setCreateCcBorrow] = useState(true);
  const [borrowEntity, setBorrowEntity] = useState('Credit Card');

  // Payback options
  const [paybackSourceType, setPaybackSourceType] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [pendingBorrows, setPendingBorrows] = useState<BorrowRecord[]>([]);
  const [loadingBorrows, setLoadingBorrows] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState('');
  const [settleBorrow, setSettleBorrow] = useState(true);
  const [newPaybackPerson, setNewPaybackPerson] = useState('');

  // Handle external quick add trigger
  useEffect(() => {
    if (quickAddOpen) {
      resetForm();
      setEntryMode('EXPENSE');
      setIsModalOpen(true);
    }
  }, [quickAddOpen]);

  // Handle external quick payback trigger
  useEffect(() => {
    if (quickPaybackOpen) {
      resetForm();
      setEntryMode('PAYBACK');
      fetchPendingBorrows();
      setIsModalOpen(true);
    }
  }, [quickPaybackOpen]);

  const fetchPendingBorrows = async () => {
    try {
      setLoadingBorrows(true);
      const res = await fetch('/api/budget/borrow?month=all');
      if (res.ok) {
        const data: BorrowRecord[] = await res.json();
        const active = (Array.isArray(data) ? data : []).filter(
          (b) => b.type === 'BORROW' && b.status === 'PENDING'
        );
        setPendingBorrows(active);
      }
    } catch (err) {
      console.error('Failed to fetch pending borrows:', err);
    } finally {
      setLoadingBorrows(false);
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().substring(0, 10));
    setCategory('reg');
    setTag('');
    setDescription('');
    setAmount('');
    setPaymentMethod('UPI / Bank');
    setNotes('');
    setEditingExpense(null);
    setCreateCcBorrow(true);
    setBorrowEntity('Credit Card');
    setPaybackSourceType('EXISTING');
    setSelectedBorrowId('');
    setSettleBorrow(true);
    setNewPaybackPerson('');
  };

  const handleOpenNew = () => {
    resetForm();
    setEntryMode('EXPENSE');
    setIsModalOpen(true);
  };

  const handleOpenPayback = () => {
    resetForm();
    setEntryMode('PAYBACK');
    setCategory('reg');
    setTag('Debt Repayment');
    fetchPendingBorrows();
    setIsModalOpen(true);
  };

  const handleSelectBorrow = (borrowId: string) => {
    setSelectedBorrowId(borrowId);
    const b = pendingBorrows.find((x) => x.id === borrowId);
    if (b) {
      setAmount(b.amount);
      setDescription(`Payback: ${b.person}${b.reason ? ` (${b.reason})` : ''}`);
      setCategory('reg');
      setTag('Debt Repayment');
      setSettleBorrow(true);
    }
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setTag(exp.tag || '');
    setDescription(exp.description);
    setAmount(exp.amount);
    setPaymentMethod(exp.payment_method || 'UPI / Bank');
    setNotes(exp.notes || '');
    if (exp.tag?.toLowerCase().includes('debt') || exp.tag?.toLowerCase().includes('payback') || exp.linked_borrow_id) {
      setEntryMode('PAYBACK');
    } else {
      setEntryMode('EXPENSE');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    if (onCloseQuickAdd) onCloseQuickAdd();
    if (onCloseQuickPayback) onCloseQuickPayback();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entryMode === 'PAYBACK') {
      if (paybackSourceType === 'NEW' && !newPaybackPerson.trim()) {
        alert('Please enter the lender/person name being repaid.');
        return;
      }
      if (paybackSourceType === 'EXISTING' && !selectedBorrowId && pendingBorrows.length > 0) {
        alert('Please select the pending borrow record you are paying back, or choose "Log New Borrow Payback".');
        return;
      }
    }

    if (!description.trim() || !amount || Number(amount) <= 0) {
      alert('Please enter a valid description and positive amount.');
      return;
    }

    try {
      setSaving(true);
      const entryMonth = date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7);
      
      let payload: any = {
        date,
        month: entryMonth,
        category,
        tag: tag.trim() || (entryMode === 'PAYBACK' ? 'Debt Repayment' : undefined),
        description: description.trim(),
        amount: Number(amount),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      if (entryMode === 'PAYBACK') {
        payload.category = 'reg';
        payload.tag = 'Debt Repayment';
        if (paybackSourceType === 'EXISTING' && selectedBorrowId) {
          payload.linked_borrow_id = selectedBorrowId;
          payload.settle_borrow = settleBorrow;
        } else if (paybackSourceType === 'NEW') {
          payload.is_new_borrow_payback = true;
          payload.payback_person = newPaybackPerson.trim();
        }
      } else {
        if (paymentMethod === 'Credit Card') {
          payload.create_borrow = createCcBorrow;
          payload.borrow_entity = borrowEntity.trim() || 'Credit Card';
        }
      }

      if (editingExpense) {
        const res = await fetch(`/api/budget/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to update expense (${res.status})`);
        }
      } else {
        const res = await fetch('/api/budget/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to create expense (${res.status})`);
        }
      }

      handleCloseModal();
      onRefresh(entryMonth);
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      alert(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const res = await fetch(`/api/budget/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete expense (${res.status})`);
      }
      onRefresh();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      alert(err.message || 'Failed to delete expense.');
    }
  };

  // Filter expenses
  const filtered = expenses.filter((exp) => {
    if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
    if (selectedTag !== 'all' && exp.tag !== selectedTag) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = exp.description.toLowerCase().includes(q);
      const matchTag = exp.tag?.toLowerCase().includes(q);
      const matchNotes = exp.notes?.toLowerCase().includes(q);
      const matchPay = exp.payment_method?.toLowerCase().includes(q);
      if (!matchDesc && !matchTag && !matchNotes && !matchPay) return false;
    }
    return true;
  });

  const totalReg = filtered
    .filter((e) => e.category === 'reg')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExt = filtered
    .filter((e) => e.category === 'ext')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalDebtPaid = filtered
    .filter((e) => e.tag?.toLowerCase().includes('debt') || e.tag?.toLowerCase().includes('payback') || e.linked_borrow_id)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOverall = totalReg + totalExt;

  // Extract all unique tags present in current expenses
  const availableTags = Array.from(new Set(expenses.map((e) => e.tag).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      {/* Top Controls & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Regular Expenses</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">₹{formatINR(totalReg)}</span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full font-semibold">Fixed & Daily</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Extra Expenses</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{formatINR(totalExt)}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-semibold">Discretionary</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Debt Paybacks</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-teal-700 dark:text-teal-400">₹{formatINR(totalDebtPaid)}</span>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full font-semibold">Loans Repaid</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Month Outflow</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 dark:text-white">₹{formatINR(totalOverall)}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{filtered.length} entries</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 justify-center">
          <Button
            onClick={handleOpenNew}
            className="w-full h-8 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs flex items-center justify-center gap-1.5 rounded-lg text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Expense Entry
          </Button>
          <Button
            onClick={handleOpenPayback}
            variant="outline"
            className="w-full h-8 border-teal-300 dark:border-teal-800/80 bg-teal-50/70 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100/60 font-semibold shadow-2xs flex items-center justify-center gap-1.5 rounded-lg text-xs cursor-pointer transition-colors"
          >
            <HandCoins className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Payback / Repay Debt
          </Button>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="w-full h-8 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 font-medium shadow-2xs flex items-center justify-center gap-1.5 rounded-lg text-xs cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
            placeholder="Search description, tag, payment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                categoryFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('reg')}
              className={`px-3 py-1 rounded-md transition-colors ${
                categoryFilter === 'reg' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Regular
            </button>
            <button
              onClick={() => setCategoryFilter('ext')}
              className={`px-3 py-1 rounded-md transition-colors ${
                categoryFilter === 'ext' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Extra
            </button>
          </div>

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Tag</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No expense entries found for the selected month and filter.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3 px-4">
                      {exp.category === 'reg' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                          Regular
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800">
                          Extra
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {exp.tag ? (
                        exp.tag === 'Debt Repayment' || exp.tag?.toLowerCase().includes('payback') || exp.linked_borrow_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs">
                            <ArrowUpRight className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            Debt Payback
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {exp.tag}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                      {exp.description}
                      {exp.notes && (
                        <span className="block text-[10px] text-slate-400 truncate">{exp.notes}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {exp.payment_method === 'Credit Card' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <CreditCard className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Credit Card
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {exp.payment_method || 'UPI'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                      ₹{formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Expense"
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          title="Delete Expense"
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded transition-colors"
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

      {/* Add / Edit Expense & Payback Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingExpense
                    ? 'Edit Expense Record'
                    : entryMode === 'PAYBACK'
                    ? 'Record Debt Payback'
                    : 'Log New Expense'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {entryMode === 'PAYBACK'
                    ? 'Record a loan repayment or credit card bill payment towards liabilities.'
                    : 'Track cash outflow for daily living or extra expenditures.'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Selector (When creating new entry) */}
            {!editingExpense && (
              <div className="px-6 pt-4 pb-1">
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryMode('EXPENSE');
                      setTag('');
                    }}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      entryMode === 'EXPENSE'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Standard Expense</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryMode('PAYBACK');
                      setCategory('reg');
                      setTag('Debt Repayment');
                      fetchPendingBorrows();
                    }}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      entryMode === 'PAYBACK'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400'
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>Payback / Repay Debt</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {entryMode === 'PAYBACK' ? (
                <>
                  {/* Payback Type Switcher */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Repayment Target
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaybackSourceType('EXISTING');
                          fetchPendingBorrows();
                        }}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          paybackSourceType === 'EXISTING'
                            ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>Select Existing Borrow</span>
                        <span className="text-[10px] font-normal text-slate-500">Pick from pending loans</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaybackSourceType('NEW')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          paybackSourceType === 'NEW'
                            ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>Log New Borrow Payback</span>
                        <span className="text-[10px] font-normal text-slate-500">Enter lender & repay</span>
                      </button>
                    </div>
                  </div>

                  {/* Existing Borrow Selector */}
                  {paybackSourceType === 'EXISTING' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Select Pending Debt / Borrow
                        </label>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                          {pendingBorrows.length} pending
                        </span>
                      </div>
                      {loadingBorrows ? (
                        <div className="py-2 text-xs text-slate-400">Loading active debts...</div>
                      ) : pendingBorrows.length === 0 ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                          No pending borrow records found. Switch to <strong>Log New Borrow Payback</strong> above to record a new debt payment.
                        </div>
                      ) : (
                        <select
                          value={selectedBorrowId}
                          onChange={(e) => handleSelectBorrow(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                        >
                          <option value="">-- Choose Borrow Record to Settle --</option>
                          {pendingBorrows.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.person} — ₹{formatINR(b.amount)} ({b.date}{b.reason ? ` • ${b.reason}` : ''})
                            </option>
                          ))}
                        </select>
                      )}

                      {selectedBorrowId && (
                        <div className="mt-2 flex items-center justify-between p-2.5 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900 rounded-lg">
                          <label className="flex items-center gap-2 text-xs font-semibold text-teal-900 dark:text-teal-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settleBorrow}
                              onChange={(e) => setSettleBorrow(e.target.checked)}
                              className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Mark this borrow record as Settled / Paid</span>
                          </label>
                          <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Payback To (Lender / Person / Card Name)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC Credit Card Bill, SBI Card, Alex Sharma"
                        value={newPaybackPerson}
                        onChange={(e) => {
                          setNewPaybackPerson(e.target.value);
                          if (!description || description.startsWith('Payback')) {
                            setDescription(`Payback: ${e.target.value}`);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        This debt will also be registered and marked as Settled under Loans & Debts.
                      </p>
                    </div>
                  )}

                  {/* Date & Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Repayment Date
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Amount Paid (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Expense Description
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paid credit card bill / Alex loan settlement"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Paid Via
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="UPI / Bank">UPI / Google Pay / PhonePe</option>
                      <option value="Cash">Cash</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Debit Card">Debit Card</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Category selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Expense Classification
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCategory('reg')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          category === 'reg'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>Regular (reg)</span>
                        <span className="text-[10px] font-normal text-slate-500">Fixed & Routine</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory('ext')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          category === 'ext'
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>Extra (ext)</span>
                        <span className="text-[10px] font-normal text-slate-500">Travel, Trips & Discretionary</span>
                      </button>
                    </div>
                  </div>

                  {/* Date & Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Item Description
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mobile recharge, Hotel in Sikkim, Train ticket"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Tag / Category Preset */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tag / Subcategory
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Food, Travel, Fuel, Utilities, Gadgets"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COMMON_TAGS.slice(0, 8).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTag(t)}
                          className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition-colors cursor-pointer"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="UPI / Bank">UPI / Google Pay / PhonePe</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>

                  {/* Credit Card Liability Automation Banner */}
                  {paymentMethod === 'Credit Card' && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                      <div className="flex items-start gap-2">
                        <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
                          <span className="font-bold">Credit Card Liability:</span> Since this expense is paid via Credit Card, it will automatically be recorded as an active liability under <strong>Loans & Debts (Borrow)</strong> so you can track paying it back.
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createCcBorrow}
                            onChange={(e) => setCreateCcBorrow(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>Auto-record as Borrow</span>
                        </label>
                        <input
                          type="text"
                          value={borrowEntity}
                          onChange={(e) => setBorrowEntity(e.target.value)}
                          placeholder="Card entity name"
                          className="px-2 py-0.5 text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-amber-300 dark:border-amber-800 rounded w-36 focus:outline-none"
                          title="Card / Lender Entity Name"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional context or remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className={`text-white font-semibold cursor-pointer ${
                    entryMode === 'PAYBACK'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving
                    ? 'Saving...'
                    : editingExpense
                    ? 'Save Changes'
                    : entryMode === 'PAYBACK'
                    ? 'Record Debt Payback'
                    : 'Add Expense'}
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
        title="Import Expenses from Excel / CSV"
        description="Bulk import daily or monthly expense records from spreadsheets"
        entityName="Expenses"
        targetFields={EXPENSE_IMPORT_FIELDS}
        sampleData={EXPENSE_SAMPLE_TEMPLATE}
        apiEndpoint="/api/budget/expenses/batch"
        onSuccess={(count) => {
          alert(`Successfully imported ${count} expenses!`);
          onRefresh();
        }}
      />
    </div>
  );
};
