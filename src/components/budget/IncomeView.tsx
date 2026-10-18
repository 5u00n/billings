import React, { useState, useEffect } from 'react';
import { IncomeEntry, IncomeCategory, CurrentAccountStatus } from '../../types';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
import {
  Briefcase,
  Wallet,
  Gift,
  Coins,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  Building,
  PiggyBank,
  Landmark,
  ArrowDownRight,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import { DataImportModal, FieldDefinition } from '../common/DataImportModal';

interface IncomeViewProps {
  incomes: IncomeEntry[];
  currentMonth: string;
  onRefresh: () => void;
}

const INCOME_IMPORT_FIELDS: FieldDefinition[] = [
  {
    key: 'date',
    label: 'Date (YYYY-MM-DD)',
    required: true,
    type: 'date',
    synonyms: ['date', 'txn date', 'income date', 'payment date', 'received date', 'dt', 'day'],
  },
  {
    key: 'source',
    label: 'Income Source / Client',
    required: true,
    type: 'string',
    synonyms: ['source', 'client', 'payer', 'party', 'customer', 'company', 'name', 'particulars'],
  },
  {
    key: 'amount',
    label: 'Amount (₹)',
    required: true,
    type: 'number',
    synonyms: ['amount', 'amt', 'received', 'credit', 'total', 'fees', 'invoice amount', 'value'],
  },
  {
    key: 'category',
    label: 'Category (fl / sal / ext / saving)',
    required: false,
    type: 'string',
    synonyms: ['category', 'type', 'cat'],
    defaultValue: 'fl',
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    type: 'string',
    synonyms: ['notes', 'note', 'memo', 'comment', 'description'],
    defaultValue: '',
  },
];

const INCOME_SAMPLE_TEMPLATE = [
  {
    'Date': '2026-10-01',
    'Source': 'Acme Corp Monthly Retainer',
    'Amount': 85000,
    'Category': 'fl',
    'Notes': 'Web App Development Retainer',
  },
  {
    'Date': '2026-10-05',
    'Source': 'Software Engineering Monthly Salary',
    'Amount': 110000,
    'Category': 'sal',
    'Notes': 'Direct bank deposit',
  },
  {
    'Date': '2026-10-10',
    'Source': 'Consulting Call',
    'Amount': 15000,
    'Category': 'fl',
    'Notes': 'Architecture advisory',
  },
];

export const IncomeView: React.FC<IncomeViewProps> = ({
  incomes,
  currentMonth,
  onRefresh,
}) => {
  // Current Account state
  const [currentAccount, setCurrentAccount] = useState<CurrentAccountStatus | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [showLedgerDetails, setShowLedgerDetails] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);

  // Form State for regular income
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState<IncomeCategory>('fl');
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State for Current Account Withdrawal (Owner Draw)
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().substring(0, 10));
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [withdrawSource, setWithdrawSource] = useState('Current Account (Owner Draw)');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Load Current Account record
  const fetchCurrentAccount = async () => {
    try {
      setLoadingAccount(true);
      const res = await fetch('/api/budget/current-account');
      if (res.ok) {
        const data = await res.json();
        setCurrentAccount(data);
      }
    } catch (err) {
      console.error('Failed to load current account status:', err);
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    fetchCurrentAccount();
  }, [currentMonth]);

  const resetForm = () => {
    setDate(new Date().toISOString().substring(0, 10));
    setCategory('fl');
    setSource('');
    setAmount('');
    setNotes('');
  };

  const handleOpenNew = () => {
    setEditingIncome(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inc: IncomeEntry) => {
    setEditingIncome(inc);
    setDate(inc.date);
    setCategory(inc.category);
    setSource(inc.source);
    setAmount(inc.amount);
    setNotes(inc.notes || '');
    setIsModalOpen(true);
  };

  const handleOpenWithdraw = () => {
    setWithdrawDate(new Date().toISOString().substring(0, 10));
    setWithdrawAmount('');
    setWithdrawSource('Current Account (Owner Draw)');
    setWithdrawNotes('Freelance income draw from SBI Current Account');
    setWithdrawError(null);
    setIsWithdrawModalOpen(true);
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !amount || Number(amount) <= 0) {
      alert('Please fill in income source and a valid amount.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date,
        month: date.substring(0, 7),
        category,
        source: source.trim(),
        amount: Number(amount),
        notes: notes.trim() || undefined,
      };

      if (editingIncome) {
        await fetch(`/api/budget/income/${editingIncome.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/budget/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setEditingIncome(null);
      resetForm();
      onRefresh();
      fetchCurrentAccount();
    } catch (err) {
      console.error('Failed to save income:', err);
      alert('Failed to save income record.');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(withdrawAmount);
    const available = availableBalance;

    if (!numAmount || numAmount <= 0) {
      setWithdrawError('Withdrawal amount must be greater than ₹0.');
      return;
    }

    if (numAmount > available) {
      setWithdrawError(
        `Cannot withdraw ₹${formatINR(numAmount)}. Your available Current Account balance is ₹${formatINR(
          available
        )}. Unpaid/pending invoices cannot be withdrawn until paid by the client.`
      );
      return;
    }

    try {
      setWithdrawing(true);
      setWithdrawError(null);

      const res = await fetch('/api/budget/current-account/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: withdrawDate,
          amount: numAmount,
          source: withdrawSource,
          notes: withdrawNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWithdrawError(data.error || 'Failed to complete withdrawal.');
        return;
      }

      setIsWithdrawModalOpen(false);
      onRefresh();
      fetchCurrentAccount();
    } catch (err: any) {
      console.error('Withdrawal failed:', err);
      setWithdrawError(err.message || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income entry? If it came from a Current Account withdrawal, the funds will be restored to your Current Account balance.')) return;
    try {
      await fetch(`/api/budget/income/${id}`, { method: 'DELETE' });
      onRefresh();
      fetchCurrentAccount();
    } catch (err) {
      console.error('Failed to delete income:', err);
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    if (!confirm('Are you sure you want to cancel this withdrawal? The withdrawn funds will be returned to your Current Account available balance and removed from personal freelance income.')) return;
    try {
      const res = await fetch(`/api/budget/current-account/withdraw/${withdrawalId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
        fetchCurrentAccount();
      }
    } catch (err) {
      console.error('Failed to delete withdrawal:', err);
    }
  };

  // Group sums by category with safe array fallbacks
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const paidInvoices = Array.isArray(currentAccount?.paid_invoices) ? currentAccount.paid_invoices : [];
  const unpaidInvoices = Array.isArray(currentAccount?.unpaid_invoices) ? currentAccount.unpaid_invoices : [];
  const withdrawals = Array.isArray(currentAccount?.withdrawals) ? currentAccount.withdrawals : [];

  const freelanceTotal = safeIncomes
    .filter((i) => i.category === 'fl')
    .reduce((sum, i) => sum + i.amount, 0);

  const salaryTotal = safeIncomes
    .filter((i) => i.category === 'sal')
    .reduce((sum, i) => sum + i.amount, 0);

  const extraTotal = safeIncomes
    .filter((i) => i.category === 'ext')
    .reduce((sum, i) => sum + i.amount, 0);

  const savingsTotal = safeIncomes
    .filter((i) => i.category === 'saving')
    .reduce((sum, i) => sum + i.amount, 0);

  const getCategoryLabel = (cat: IncomeCategory) => {
    switch (cat) {
      case 'fl':
        return { label: 'Freelance (fl)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300' };
      case 'sal':
        return { label: 'Salary (sal)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' };
      case 'ext':
        return { label: 'Allowance / Ext', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' };
      case 'saving':
        return { label: 'Savings Withdrawal', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' };
      case 'rt':
        return { label: 'Returned to Me', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' };
      default:
        return { label: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const availableBalance = currentAccount?.available_balance ?? (currentAccount as any)?.currentBalance ?? 0;
  const totalRevenuePaid = currentAccount?.total_revenue_paid ?? (currentAccount as any)?.totalIncome ?? 0;
  const totalWithdrawn = currentAccount?.total_withdrawn ?? (currentAccount as any)?.totalWithdrawals ?? 0;
  const unpaidReceivables = currentAccount?.unpaid_receivables ?? 0;

  return (
    <div className="space-y-6">
      {/* ----------------- CURRENT ACCOUNT HERO BANNER & WITHDRAWAL SYSTEM ----------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs relative">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  State Bank of India — Current Account
                </h3>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-mono font-medium">
                  A/C 45661497562
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Business Billings & Client Revenue • Funds stay in Current Account until you withdraw to personal income
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenWithdraw}
              disabled={availableBalance <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={
                availableBalance > 0
                  ? 'Withdraw available money into personal Freelance Income'
                  : 'No available funds to withdraw. Wait for client invoice payments.'
              }
            >
              <ArrowDownRight className="w-4 h-4" />
              Withdraw to Personal Income
            </Button>

            <button
              onClick={() => {
                fetchCurrentAccount();
                onRefresh();
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Refresh Current Account Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAccount ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Financial Position Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Tile 1: Available Balance */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                <span>Available to Withdraw</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                ₹{formatINR(availableBalance)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Maximum possible owner's draw available right now.
            </p>
          </div>

          {/* Tile 2: Total Paid Billings */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                <span>Total Client Revenue Paid</span>
                <span className="text-[10px] bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                  Collections
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                ₹{formatINR(totalRevenuePaid)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              From {paidInvoices.length} paid client invoice(s).
            </p>
          </div>

          {/* Tile 3: Total Withdrawn */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                <span>Withdrawn to Personal</span>
                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-semibold">
                  Owner Draws
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                ₹{formatINR(totalWithdrawn)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Recorded in your Personal Freelance Income ledger.
            </p>
          </div>

          {/* Tile 4: Unpaid / Locked Invoices */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                <span>Unpaid Locked Invoices</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md font-semibold">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                ₹{formatINR(unpaidReceivables)}
              </div>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Cannot withdraw until client payment is received.
            </p>
          </div>
        </div>

        {/* Expandable Current Account Breakdown Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setShowLedgerDetails(!showLedgerDetails)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {showLedgerDetails ? (
              <>
                <ChevronUp className="w-4 h-4" /> Hide Current Account Invoices & Withdrawal Records
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Show Current Account Invoices & Withdrawal Records
              </>
            )}
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Current Account Balance = Total Paid Revenue (₹{formatINR(totalRevenuePaid)}) − Total Withdrawn (₹{formatINR(totalWithdrawn)})
          </span>
        </div>

        {/* Expanded Details Section */}
        {showLedgerDetails && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Left: Invoices Status */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Client Billing Invoices ({paidInvoices.length} Paid, {unpaidInvoices.length} Pending)
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {paidInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">#{inv.invoice_number}</span>
                        <span className="text-slate-500 dark:text-slate-400">• {inv.org_name}</span>
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                          PAID
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Date: {inv.date}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+₹{formatINR(inv.amount_paid)}</span>
                      <div className="text-[10px] text-slate-400">In Current A/C</div>
                    </div>
                  </div>
                ))}

                {unpaidInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 text-slate-800 dark:text-slate-200"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">#{inv.invoice_number}</span>
                        <span className="text-slate-500 dark:text-slate-400">• {inv.org_name}</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded font-semibold">
                          <Lock className="w-2.5 h-2.5" /> LOCKED
                        </span>
                      </div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Payment Pending — Cannot Withdraw</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600 dark:text-rose-400">₹{formatINR(inv.balance_due)}</span>
                      <div className="text-[10px] text-slate-400">Awaiting Client</div>
                    </div>
                  </div>
                ))}

                {(!paidInvoices.length && !unpaidInvoices.length) && (
                  <p className="text-slate-400 italic text-center py-4">No billing invoices found.</p>
                )}
              </div>
            </div>

            {/* Right: Withdrawals History */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Current Account Owner's Draws ({withdrawals.length})
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{w.date}</span>
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                          DRAW
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{w.notes || 'Owner draw to freelance income'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-600 dark:text-amber-400">-₹{formatINR(w.amount)}</span>
                      <button
                        onClick={() => handleDeleteWithdrawal(w.id)}
                        title="Cancel withdrawal & refund back to Current Account"
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {!withdrawals.length && (
                  <p className="text-slate-400 italic text-center py-4">No withdrawals recorded yet. Click "Withdraw to Personal Income" above when needed.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- PERSONAL INFLOW SUMMARY CARDS ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Freelance Draws</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">₹{formatINR(freelanceTotal)}</span>
            <span className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full font-semibold">Withdrawn (fl)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Developer Salary</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">₹{formatINR(salaryTotal)}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-semibold">Software Job</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Extra & Savings Inflow</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{formatINR(extraTotal + savingsTotal)}</span>
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-semibold">Dad / Bank</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 justify-center">
          <Button
            onClick={handleOpenNew}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs flex items-center justify-center gap-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Direct Income Stream
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

      {/* ----------------- PERSONAL INCOME LEDGER TABLE ----------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Personal Income Streams for {currentMonth}
            </h4>
            <p className="text-[11px] text-slate-500">
              Recorded personal cash flow (Withdrawals from Current Account, Developer Salary, Allowance, Savings)
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
            Total Inflow: ₹{formatINR(safeIncomes.reduce((s, i) => s + i.amount, 0))}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Stream / Category</th>
                <th className="py-3 px-4">Source / Entity</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {safeIncomes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <PiggyBank className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No income streams logged for this month yet.
                  </td>
                </tr>
              ) : (
                safeIncomes.map((inc) => {
                  const meta = getCategoryLabel(inc.category);
                  const isCurrentAccountDraw = inc.source.includes('Current Account') || (inc.notes && inc.notes.includes('Current Account'));

                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {inc.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isCurrentAccountDraw && <Landmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                          <span>{inc.source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {inc.notes || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                        +₹{formatINR(inc.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(inc)}
                            title="Edit Income"
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            title="Delete Income (refunds to Current Account if it was a withdrawal)"
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- MODAL: WITHDRAW FROM CURRENT ACCOUNT ----------------- */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Withdraw from Current Account</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Record an Owner's Draw into your Personal Freelance Income
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteWithdrawal} className="p-6 space-y-4">
              {/* Available Balance Callout */}
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-900 block">Available Current Account Balance</span>
                  <span className="text-xs text-indigo-700">From verified paid client billings</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-700">₹{formatINR(availableBalance)}</span>
                </div>
              </div>

              {withdrawError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={withdrawDate}
                    onChange={(e) => setWithdrawDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">Withdraw Amount (₹)</label>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(availableBalance)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Max (₹{formatINR(availableBalance)})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={availableBalance}
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setWithdrawAmount(val);
                      if (typeof val === 'number' && val > availableBalance) {
                        setWithdrawError(`Amount exceeds available balance of ₹${formatINR(availableBalance)}`);
                      } else {
                        setWithdrawError(null);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Income Source Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Current Account (Owner Draw) or Irvine Adventist School"
                  value={withdrawSource}
                  onChange={(e) => setWithdrawSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Living expenses draw from October client billings"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Accounting Rule:</strong> Unpaid / pending client invoices (₹{formatINR(unpaidReceivables)}) cannot be withdrawn until marked as paid.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={withdrawing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > availableBalance}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  {withdrawing ? 'Processing Draw...' : 'Confirm Withdrawal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: DIRECT INCOME STREAM ----------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingIncome ? 'Edit Income Stream' : 'Add Direct Income Stream'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Income Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('fl')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${
                      category === 'fl'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Freelance (fl)</span>
                    <span className="text-[10px] font-normal text-slate-500">Direct Freelance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('sal')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${
                      category === 'sal'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Salary (sal)</span>
                    <span className="text-[10px] font-normal text-slate-500">Monthly Compensation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('ext')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${
                      category === 'ext'
                        ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Extra (ext)</span>
                    <span className="text-[10px] font-normal text-slate-500">Dad / Allowance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('saving')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${
                      category === 'saving'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Savings (saving)</span>
                    <span className="text-[10px] font-normal text-slate-500">Bank Withdrawal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('rt')}
                    className={`col-span-2 sm:col-span-1 py-2 px-3 text-xs font-semibold rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${
                      category === 'rt'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Returned (rt)</span>
                    <span className="text-[10px] font-normal text-slate-500">Money Returned</span>
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
                  Source / Client Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meker Project, Dad, Company Salary"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly stipend, direct cash transfer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
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
                  {saving ? 'Saving...' : editingIncome ? 'Save Changes' : 'Add Income'}
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
        title="Import Income Records from Excel / CSV"
        description="Bulk import client fees, salary, or personal inflow records"
        entityName="Income"
        targetFields={INCOME_IMPORT_FIELDS}
        sampleData={INCOME_SAMPLE_TEMPLATE}
        apiEndpoint="/api/budget/income/batch"
        onSuccess={(count) => {
          alert(`Successfully imported ${count} income entries!`);
          onRefresh();
        }}
      />
    </div>
  );
};
