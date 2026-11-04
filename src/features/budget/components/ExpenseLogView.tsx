import { BorrowingAccountSelector, AccountPaymentDialog, AccountCorrectionDialog, borrowingRequest, announceBorrowingChange } from './BorrowingAccountsView';
import type { BorrowingTransaction } from '@/lib/borrowing';
import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, BorrowRecord } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Layers,
  Banknote,
  ArrowUpDown,
  SlidersHorizontal,
  Building,
} from 'lucide-react';
import { DataImportModal, FieldDefinition } from '@/components/common/DataImportModal';
import { DistinctDropdownFilter, DistinctFilterOption } from '@/components/common/DistinctDropdownFilter';
import { FilterChipsBar, ActiveFilterChip } from '@/components/common/FilterChipsBar';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';
import { BudgetPacingBar } from './BudgetPacingBar';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedLiabilityType, setSelectedLiabilityType] = useState<string>('all');
  const [selectedTaxClassification, setSelectedTaxClassification] = useState<string>('all');
  const [selectedAmountBand, setSelectedAmountBand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

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
  const [borrowingAccountId, setBorrowingAccountId] = useState('');
  const [accountCorrection, setAccountCorrection] = useState<{accountId:string;transaction:BorrowingTransaction}|null>(null);
  const [expenseRequestKey, setExpenseRequestKey] = useState(() => crypto.randomUUID());

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
    setBorrowingAccountId('');
    setExpenseRequestKey(crypto.randomUUID());
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

  const handleOpenEdit = async (exp: Expense) => {
    if (exp.borrowing_account_id && exp.borrowing_transaction_id) {
      try {
        const account = await borrowingRequest('/' + exp.borrowing_account_id);
        const transaction = account.transactions.find((t: BorrowingTransaction) => t.id === exp.borrowing_transaction_id);
        if (!transaction) throw new Error('Account transaction not found');
        setAccountCorrection({accountId: account.id, transaction});
      } catch (e: any) { alert(e.message); }
      return;
    }
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
      }

      if (editingExpense && (paymentMethod === 'Borrowing account' || ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(paymentMethod)) !== ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(editingExpense.payment_method || '')) {
        throw new Error('Changing the funding source of a legacy expense requires reconciliation. Convert the record through borrowing accounts first.');
      }
      if (!editingExpense && entryMode === 'EXPENSE' && paymentMethod === 'Borrowing account') {
        if (!borrowingAccountId) throw new Error('Select or create a borrowing account for this credit purchase.');
        await borrowingRequest(`/${borrowingAccountId}/transactions`, {kind:'CREDIT_PURCHASE', amount_paise:Math.round(Number(amount)*100), date, description:description.trim(), notes:notes.trim(), category, tag:tag.trim()}, expenseRequestKey);
        announceBorrowingChange();
      } else if (editingExpense) {
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
      const expense = expenses.find(e => e.id === id);
      if (expense?.borrowing_account_id && expense.borrowing_transaction_id) {
        const account = await borrowingRequest('/' + expense.borrowing_account_id);
        await borrowingRequest(`/${account.id}/transactions/${expense.borrowing_transaction_id}`, {reverse_only:true,reason:'Expense removed by owner',expected_version:account.version});
        announceBorrowingChange();onRefresh();return;
      }
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

  // Dynamic distinct tag options
  const distinctTagCounts = expenses.reduce((acc, e) => {
    if (e.tag) acc[e.tag] = (acc[e.tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tagOptions: DistinctFilterOption[] = Object.entries(distinctTagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, count]) => ({ value: t, label: t, count }));

  // Dynamic distinct payment method options
  const distinctPaymentCounts = expenses.reduce((acc, e) => {
    const pm = e.payment_method || 'UPI / Bank';
    acc[pm] = (acc[pm] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const paymentOptions: DistinctFilterOption[] = Object.entries(distinctPaymentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pm, count]) => ({ value: pm, label: pm, count }));

  // Dynamic distinct tax classification options
  const distinctTaxCounts = expenses.reduce((acc, e) => {
    if (e.tax_classification) acc[e.tax_classification] = (acc[e.tax_classification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const taxOptions: DistinctFilterOption[] = Object.entries(distinctTaxCounts)
    .map(([tc, count]) => ({
      value: tc,
      label: tc.replace(/_/g, ' '),
      count,
    }));

  // Liability / type options with counts
  const directCount = expenses.filter((e) => {
    const isPayback = e.tag?.toLowerCase().includes('debt') || e.tag?.toLowerCase().includes('payback') || !!e.linked_borrow_id;
    const isBorrowAcc = !!e.borrowing_account_id || ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(e.payment_method || '');
    return !isPayback && !isBorrowAcc;
  }).length;
  const borrowAccCount = expenses.filter((e) => !!e.borrowing_account_id || ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(e.payment_method || '')).length;
  const debtPaybackCount = expenses.filter((e) => e.tag?.toLowerCase().includes('debt') || e.tag?.toLowerCase().includes('payback') || !!e.linked_borrow_id).length;

  const liabilityOptions: DistinctFilterOption[] = [
    { value: 'direct', label: 'Direct Cash/Bank', count: directCount },
    { value: 'borrowing_account', label: 'Credit Card / Borrowing', count: borrowAccCount },
    { value: 'debt_payback', label: 'Debt Repayment', count: debtPaybackCount },
  ];

  // Amount band options with counts
  const amountBandOptions: DistinctFilterOption[] = [
    { value: 'under_500', label: 'Under ₹500', count: expenses.filter((e) => e.amount < 500).length },
    { value: '500_2000', label: '₹500 – ₹2,000', count: expenses.filter((e) => e.amount >= 500 && e.amount <= 2000).length },
    { value: '2000_10000', label: '₹2,000 – ₹10,000', count: expenses.filter((e) => e.amount > 2000 && e.amount <= 10000).length },
    { value: 'above_10000', label: 'Above ₹10,000', count: expenses.filter((e) => e.amount > 10000).length },
  ];

  const sortOptions: DistinctFilterOption[] = [
    { value: 'date_desc', label: 'Date: Newest First' },
    { value: 'date_asc', label: 'Date: Oldest First' },
    { value: 'amount_desc', label: 'Amount: High to Low' },
    { value: 'amount_asc', label: 'Amount: Low to High' },
  ];

  // Filter expenses
  const filtered = expenses
    .filter((exp) => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (selectedTag !== 'all' && exp.tag !== selectedTag) return false;
      if (selectedPaymentMethod !== 'all' && (exp.payment_method || 'UPI / Bank') !== selectedPaymentMethod) return false;

      // Liability / Transaction type
      if (selectedLiabilityType === 'direct') {
        const isPayback = exp.tag?.toLowerCase().includes('debt') || exp.tag?.toLowerCase().includes('payback') || !!exp.linked_borrow_id;
        const isBorrowAcc = !!exp.borrowing_account_id || ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(exp.payment_method || '');
        if (isPayback || isBorrowAcc) return false;
      } else if (selectedLiabilityType === 'borrowing_account') {
        const isBorrowAcc = !!exp.borrowing_account_id || ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(exp.payment_method || '');
        if (!isBorrowAcc) return false;
      } else if (selectedLiabilityType === 'debt_payback') {
        const isPayback = exp.tag?.toLowerCase().includes('debt') || exp.tag?.toLowerCase().includes('payback') || !!exp.linked_borrow_id;
        if (!isPayback) return false;
      }

      if (selectedTaxClassification !== 'all' && exp.tax_classification !== selectedTaxClassification) return false;

      // Amount bands
      if (selectedAmountBand === 'under_500' && exp.amount >= 500) return false;
      if (selectedAmountBand === '500_2000' && (exp.amount < 500 || exp.amount > 2000)) return false;
      if (selectedAmountBand === '2000_10000' && (exp.amount < 2000 || exp.amount > 10000)) return false;
      if (selectedAmountBand === 'above_10000' && exp.amount <= 10000) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchTag = exp.tag?.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        const matchPay = exp.payment_method?.toLowerCase().includes(q);
        if (!matchDesc && !matchTag && !matchNotes && !matchPay) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return b.date.localeCompare(a.date);
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

  const exportColumns: ExportColumn<Expense>[] = [
    { header: 'Date', key: 'date', width: 12, align: 'center' },
    { header: 'Description', key: 'description', width: 28, align: 'left' },
    {
      header: 'Category',
      key: 'category',
      width: 14,
      align: 'center',
      format: (val) => (val === 'reg' ? 'Regular' : 'Extra'),
    },
    { header: 'Tag', key: 'tag', width: 14, align: 'left' },
    {
      header: 'Payment Method',
      key: 'payment_method',
      width: 18,
      align: 'left',
      format: (val) => val || 'UPI / Bank',
    },
    {
      header: 'Amount',
      key: 'amount',
      width: 14,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Tax Deductible',
      key: 'tax_classification',
      width: 14,
      align: 'center',
      format: (val) => (val === 'deductible' ? 'Yes' : 'No'),
    },
    {
      header: 'Notes',
      key: 'notes',
      width: 22,
      align: 'left',
      format: (val) => val || '',
    },
  ];

  const exportOptions = {
    filename: `Expense_Ledger_${currentMonth || 'all'}_${new Date().toISOString().slice(0, 10)}`,
    title: `Expense Ledger Report - ${currentMonth || 'All Time'}`,
    subtitle: `Exported ${filtered.length} entries matching applied filters`,
    sheetName: 'Expenses',
    columns: exportColumns,
    data: filtered,
    summaryMetrics: [
      { label: 'Total Regular', value: formatCurrencyForPdf(totalReg) },
      { label: 'Total Extra', value: formatCurrencyForPdf(totalExt) },
      { label: 'Debt Paybacks', value: formatCurrencyForPdf(totalDebtPaid) },
      { label: 'Total Outflow', value: formatCurrencyForPdf(totalOverall) },
      { label: 'Entries Exported', value: `${filtered.length} of ${expenses.length}` },
    ],
  };

  // Active filter chips
  const activeChips: ActiveFilterChip[] = [];
  if (categoryFilter !== 'all') {
    activeChips.push({
      key: 'category',
      label: 'Category',
      valueDisplay: categoryFilter === 'reg' ? 'Regular' : 'Extra',
      onRemove: () => setCategoryFilter('all'),
    });
  }
  if (selectedTag !== 'all') {
    activeChips.push({
      key: 'tag',
      label: 'Tag',
      valueDisplay: selectedTag,
      onRemove: () => setSelectedTag('all'),
    });
  }
  if (selectedPaymentMethod !== 'all') {
    activeChips.push({
      key: 'payment',
      label: 'Payment',
      valueDisplay: selectedPaymentMethod,
      onRemove: () => setSelectedPaymentMethod('all'),
    });
  }
  if (selectedLiabilityType !== 'all') {
    const opt = liabilityOptions.find((o) => o.value === selectedLiabilityType);
    activeChips.push({
      key: 'liability',
      label: 'Type',
      valueDisplay: opt ? opt.label : selectedLiabilityType,
      onRemove: () => setSelectedLiabilityType('all'),
    });
  }
  if (selectedTaxClassification !== 'all') {
    activeChips.push({
      key: 'tax',
      label: 'Tax',
      valueDisplay: selectedTaxClassification.replace(/_/g, ' '),
      onRemove: () => setSelectedTaxClassification('all'),
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
    setCategoryFilter('all');
    setSelectedTag('all');
    setSelectedPaymentMethod('all');
    setSelectedLiabilityType('all');
    setSelectedTaxClassification('all');
    setSelectedAmountBand('all');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Monthly Budget Target & Pacing Bar */}
      <BudgetPacingBar
        currentMonth={currentMonth}
        totalSpent={totalOverall}
        regSpent={totalReg}
        extSpent={totalExt}
        onRefresh={() => onRefresh()}
      />

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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <Input
              type="text"
              placeholder="Search description, tag, payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white"
            />
          </div>

          {/* Category Tabs & Distinct Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
              <Button
                type="button"
                variant={categoryFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter('all')}
                className="h-7 text-xs font-semibold"
              >
                All
              </Button>
              <Button
                type="button"
                variant={categoryFilter === 'reg' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter('reg')}
                className="h-7 text-xs font-semibold"
              >
                Regular
              </Button>
              <Button
                type="button"
                variant={categoryFilter === 'ext' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter('ext')}
                className="h-7 text-xs font-semibold"
              >
                Extra
              </Button>
            </div>

            {/* Distinct Tag Dropdown */}
            {tagOptions.length > 0 && (
              <DistinctDropdownFilter
                label="Tag"
                icon={Tag}
                value={selectedTag}
                onChange={setSelectedTag}
                options={tagOptions}
                allLabel="All Tags"
              />
            )}

            {/* Distinct Payment Method Dropdown */}
            {paymentOptions.length > 0 && (
              <DistinctDropdownFilter
                label="Payment"
                icon={CreditCard}
                value={selectedPaymentMethod}
                onChange={setSelectedPaymentMethod}
                options={paymentOptions}
                allLabel="All Modes"
              />
            )}

            {/* Outflow / Liability Type Dropdown */}
            <DistinctDropdownFilter
              label="Type"
              icon={Layers}
              value={selectedLiabilityType}
              onChange={setSelectedLiabilityType}
              options={liabilityOptions}
              allLabel="All Types"
            />

            {/* Amount Band Dropdown */}
            <DistinctDropdownFilter
              label="Amount"
              icon={Banknote}
              value={selectedAmountBand}
              onChange={setSelectedAmountBand}
              options={amountBandOptions}
              allLabel="Any Amount"
            />

            {/* Tax Classification Dropdown if present */}
            {taxOptions.length > 0 && (
              <DistinctDropdownFilter
                label="Tax"
                icon={Building}
                value={selectedTaxClassification}
                onChange={setSelectedTaxClassification}
                options={taxOptions}
                allLabel="All Tax Classes"
              />
            )}

            {/* Sort Dropdown */}
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
            <ExportActions exportOptions={exportOptions} />
          </div>
        </div>

        {/* Active Filter Chips & Counter */}
        <FilterChipsBar
          chips={activeChips}
          onClearAll={handleClearAllFilters}
          filteredCount={filtered.length}
          totalCount={expenses.length}
          itemNoun="expenses"
        />
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <TableHead className="py-3 px-4">Date</TableHead>
                <TableHead className="py-3 px-4">Category</TableHead>
                <TableHead className="py-3 px-4">Tag</TableHead>
                <TableHead className="py-3 px-4">Description</TableHead>
                <TableHead className="py-3 px-4">Payment</TableHead>
                <TableHead className="py-3 px-4 text-right">Amount</TableHead>
                <TableHead className="py-3 px-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      ) : exp.payment_method === 'Slice Borrow' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <CreditCard className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          Slice Borrow
                        </span>
                      ) : exp.payment_method === 'Amazon Borrow' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                          <CreditCard className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                          Amazon Borrow
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Expense"
                          className="h-7 w-7 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(exp.id)}
                          title="Delete Expense"
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

      {/* Add / Edit Expense & Payback Modal */}
      {isModalOpen && entryMode === 'PAYBACK' && <AccountPaymentDialog onClose={handleCloseModal} onSaved={() => onRefresh()} />}
      {accountCorrection && <AccountCorrectionDialog accountId={accountCorrection.accountId} transaction={accountCorrection.transaction} onClose={() => setAccountCorrection(null)} onSaved={() => onRefresh()} />}
      <Dialog
        open={isModalOpen && !['PAYBACK'].includes(entryMode)}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
              {editingExpense
                ? 'Edit Expense Record'
                : entryMode === 'PAYBACK'
                ? 'Record Debt Payback'
                : 'Log New Expense'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400">
              {entryMode === 'PAYBACK'
                ? 'Record a loan repayment or credit card bill payment towards liabilities.'
                : 'Track cash outflow for daily living or extra expenditures.'}
            </DialogDescription>
          </DialogHeader>

            {/* Mode Selector (When creating new entry) */}
            {!editingExpense && (
              <div className="px-6 pt-4 pb-1">
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold gap-1">
                  <Button
                    type="button"
                    variant={entryMode === 'EXPENSE' ? 'default' : 'ghost'}
                    onClick={() => {
                      setEntryMode('EXPENSE');
                      setTag('');
                    }}
                    className="h-8 flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Standard Expense</span>
                  </Button>
                  <Button
                    type="button"
                    variant={entryMode === 'PAYBACK' ? 'default' : 'ghost'}
                    onClick={() => {
                      setEntryMode('PAYBACK');
                      setCategory('reg');
                      setTag('Debt Repayment');
                      fetchPendingBorrows();
                    }}
                    className={`h-8 flex items-center justify-center gap-1.5 ${
                      entryMode === 'PAYBACK' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>Payback / Repay Debt</span>
                  </Button>
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
                      <Button
                        type="button"
                        variant={paybackSourceType === 'EXISTING' ? 'default' : 'outline'}
                        onClick={() => {
                          setPaybackSourceType('EXISTING');
                          fetchPendingBorrows();
                        }}
                        className={`h-auto py-2 px-3 text-xs flex flex-col items-center justify-center gap-0.5 ${
                          paybackSourceType === 'EXISTING' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''
                        }`}
                      >
                        <span className="font-semibold">Select Existing Borrow</span>
                        <span className="text-[10px] font-normal opacity-80">Pick from pending loans</span>
                      </Button>
                      <Button
                        type="button"
                        variant={paybackSourceType === 'NEW' ? 'default' : 'outline'}
                        onClick={() => setPaybackSourceType('NEW')}
                        className={`h-auto py-2 px-3 text-xs flex flex-col items-center justify-center gap-0.5 ${
                          paybackSourceType === 'NEW' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''
                        }`}
                      >
                        <span className="font-semibold">Log New Borrow Payback</span>
                        <span className="text-[10px] font-normal opacity-80">Enter lender & repay</span>
                      </Button>
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
                        <Select value={selectedBorrowId} onValueChange={(val) => handleSelectBorrow(val)}>
                          <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-slate-800">
                            <SelectValue placeholder="-- Choose Borrow Record to Settle --" />
                          </SelectTrigger>
                          <SelectContent>
                            {pendingBorrows.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.person} — ₹{formatINR(b.amount)} ({b.date}{b.reason ? ` • ${b.reason}` : ''})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Input
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
                        className="h-8 text-xs"
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
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10" />
                        <Input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="pl-8 pr-2.5 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Amount Paid (₹)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="h-8 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Expense Description
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Paid credit card bill / Alex loan settlement"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Paid Via
                    </label>
                    <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                      <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-slate-800">
                        <SelectValue placeholder="Paid Via" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI / Bank">UPI / Google Pay / PhonePe</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Net Banking">Net Banking</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Button
                        type="button"
                        variant={category === 'reg' ? 'default' : 'outline'}
                        onClick={() => setCategory('reg')}
                        className={`h-auto py-2 px-3 text-xs flex flex-col items-center justify-center gap-0.5 ${
                          category === 'reg' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                        }`}
                      >
                        <span className="font-semibold">Regular (reg)</span>
                        <span className="text-[10px] font-normal opacity-80">Fixed & Routine</span>
                      </Button>
                      <Button
                        type="button"
                        variant={category === 'ext' ? 'default' : 'outline'}
                        onClick={() => setCategory('ext')}
                        className={`h-auto py-2 px-3 text-xs flex flex-col items-center justify-center gap-0.5 ${
                          category === 'ext' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                        }`}
                      >
                        <span className="font-semibold">Extra (ext)</span>
                        <span className="text-[10px] font-normal opacity-80">Travel, Trips & Discretionary</span>
                      </Button>
                    </div>
                  </div>

                  {/* Date & Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10" />
                        <Input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="pl-8 pr-2.5 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="h-8 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Item Description
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Mobile recharge, Hotel in Sikkim, Train ticket"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Tag / Category Preset */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tag / Subcategory
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Food, Travel, Fuel, Utilities, Gadgets"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COMMON_TAGS.slice(0, 8).map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTag(t)}
                          className="text-[10px] h-5 px-1.5 py-0 rounded"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                      <SelectTrigger className="w-full h-8 text-xs bg-white dark:bg-slate-800">
                        <SelectValue placeholder="Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI / Bank">UPI / Google Pay / PhonePe</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        {!editingExpense && <SelectItem value="Borrowing account">Borrowing account</SelectItem>}
                        {editingExpense && ['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(editingExpense.payment_method || '') && (
                          <SelectItem value={editingExpense.payment_method!}>{editingExpense.payment_method} (legacy)</SelectItem>
                        )}
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Net Banking">Net Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!editingExpense && paymentMethod === 'Borrowing account' && (
                    <BorrowingAccountSelector value={borrowingAccountId} onChange={setBorrowingAccountId} />
                  )}
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
                <Input
                  type="text"
                  placeholder="Additional context or remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
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
        </DialogContent>
      </Dialog>

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
