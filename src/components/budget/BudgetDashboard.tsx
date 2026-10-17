import React, { useState, useEffect } from 'react';
import {
  MonthlyBudgetSummary,
  Expense,
  IncomeEntry,
  BorrowRecord,
  FinancialGoal,
  BudgetAllocationRule,
  UserProfile,
} from '../../types';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExpenseLogView } from './ExpenseLogView';
import { BudgetAllocationView } from './BudgetAllocationView';
import { GoalsTrackerView } from './GoalsTrackerView';
import { BorrowReturnsView } from './BorrowReturnsView';
import { IncomeView } from './IncomeView';
import { PrintableMonthlyReport } from './PrintableMonthlyReport';
import { MonthlyBreakdownTableView } from './MonthlyBreakdownTableView';
import { ReturnsTrackerView } from './ReturnsTrackerView';
import { useRouter } from '../../context/RouterContext';
import {
  Calendar,
  Printer,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Landmark,
  Layers,
  Receipt,
  Target,
  ArrowLeftRight,
  HandCoins,
  Settings2,
  Check,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';

interface BudgetDashboardProps {
  profile: UserProfile;
}

type BudgetSubTab = 'allocations' | 'expenses' | 'income' | 'returns' | 'borrow' | 'goals' | 'monthly-table';

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ profile }) => {
  const { route, navigate } = useRouter();

  // Normalize subtab from route if on /budget/...
  const getSubTabFromRoute = (sub?: string): BudgetSubTab => {
    switch (sub) {
      case 'spreadsheet':
      case 'monthly-table':
        return 'monthly-table';
      case 'income':
        return 'income';
      case 'returns':
        return 'returns';
      case 'expenses':
        return 'expenses';
      case 'borrow':
      case 'loans':
      case 'debts':
        return 'borrow';
      case 'goals':
        return 'goals';
      case 'allocations':
      default:
        return 'allocations';
    }
  };

  const activeSubTab: BudgetSubTab = route.tab === 'budget' && route.subTab ? getSubTabFromRoute(route.subTab) : 'allocations';

  const handleSelectSubTab = (tab: BudgetSubTab) => {
    const subSlug = tab === 'monthly-table' ? 'spreadsheet' : tab === 'borrow' ? 'loans' : tab;
    navigate(`/budget/${subSlug}`);
  };

  const isStage1Active = activeSubTab === 'income' || activeSubTab === 'returns';
  const isStage2Active = activeSubTab === 'expenses' || activeSubTab === 'allocations';
  const isStage3Active = activeSubTab === 'borrow';
  const isStage4Active = activeSubTab === 'monthly-table' || activeSubTab === 'goals';

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [loading, setLoading] = useState(true);

  // Core Data State
  const [summary, setSummary] = useState<MonthlyBudgetSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocationRule[]>([]);
  const [totalIncomeBase, setTotalIncomeBase] = useState<number>(0);

  // Modal / Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQuickAddExpenseOpen, setIsQuickAddExpenseOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  // Debt & Parameters Form
  const [startingDebt, setStartingDebt] = useState<number>(0);
  const [deptPayment, setDeptPayment] = useState<number>(0);
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const [prevRemaining, setPrevRemaining] = useState<number>(0);
  const [regSavings, setRegSavings] = useState<number>(0);
  const [extSavings, setExtSavings] = useState<number>(0);
  const [savingParams, setSavingParams] = useState(false);

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadMonthData(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/budget/months');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAvailableMonths(data);
        if (!data.includes(selectedMonth)) {
          setSelectedMonth(data[0]);
        }
      } else {
        const currentM = new Date().toISOString().substring(0, 7);
        setAvailableMonths([currentM]);
        setSelectedMonth(currentM);
      }
    } catch (err) {
      console.error('Failed to fetch budget months:', err);
    }
  };

  const loadMonthData = async (m: string) => {
    try {
      setLoading(true);
      const [sumRes, expRes, incRes, brRes, goalRes, allocRes] = await Promise.all([
        fetch(`/api/budget/summary?month=${m}`),
        fetch(`/api/budget/expenses?month=${m}`),
        fetch(`/api/budget/income?month=${m}`),
        fetch(`/api/budget/borrow?month=${m}`),
        fetch('/api/budget/goals'),
        fetch(`/api/budget/allocations?month=${m}`),
      ]);

      const [sumData, expData, incData, brData, goalData, allocData] = await Promise.all([
        sumRes.json(),
        expRes.json(),
        incRes.json(),
        brRes.json(),
        goalRes.json(),
        allocRes.json(),
      ]);

      setSummary(sumData);
      setExpenses(expData || []);
      setIncomes(incData || []);
      setBorrows(brData || []);
      setGoals(goalData || []);
      setAllocations(allocData?.allocations || []);
      setTotalIncomeBase(allocData?.total_income || 0);

      // Populate form fields
      if (sumData) {
        setStartingDebt(sumData.starting_debt || 0);
        setDeptPayment(sumData.dept_payment || 0);
        setBorrowAmount(sumData.borrow_amount || 0);
        setPrevRemaining(sumData.previous_remaining || 0);
        setRegSavings(sumData.reg_savings || 0);
        setExtSavings(sumData.ext_savings || 0);
      }
    } catch (err) {
      console.error('Failed to load month data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudgetParams = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingParams(true);
      await fetch(`/api/budget/summary/${selectedMonth}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starting_debt: Number(startingDebt),
          previous_remaining: Number(prevRemaining),
          dept_payment: Number(deptPayment),
          borrow_amount: Number(borrowAmount),
          reg_savings: Number(regSavings),
          ext_savings: Number(extSavings),
        }),
      });
      setIsDebtModalOpen(false);
      loadMonthData(selectedMonth);
    } catch (err) {
      console.error('Failed to update budget parameters:', err);
      alert('Failed to update parameters.');
    } finally {
      setSavingParams(false);
    }
  };

  const formatMonthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length === 2) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return m;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Personal Budget & Expense Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Integrated from your Complete Budget System template with cashflow, envelopes, and reports.
            </p>
          </div>
        </div>

        {/* Month Selector & Report Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector Dropdown */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Edit Month Parameters */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDebtModalOpen(true)}
            className="gap-1.5 text-xs text-slate-700 dark:text-slate-300 h-9 rounded-xl border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Edit starting debt, debt payments, and carryover"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            Debt & Carryover
          </Button>

          {/* Print Monthly Statement */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-xl shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report / PDF
          </Button>
        </div>
      </div>

      {/* 4-Stage Visual Financial Flow (Interactive Primary Stage Tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stage 1: Money In */}
        <div
          onClick={() => handleSelectSubTab('income')}
          className={`rounded-2xl p-5 border transition-all cursor-pointer group flex flex-col justify-between ${
            isStage1Active
              ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-emerald-500/50'
          }`}
          title="Click to view Money In, Incomes, and Returns"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <TrendingUp className="w-4 h-4" />
                1. Money In (Total Available)
              </span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md">
                Inflow
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              ₹{formatINR(summary?.total_inflow || summary?.total_income || 0)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Freelance & Invoices</span>
              <span className="font-semibold text-slate-900 dark:text-white">₹{formatINR(summary?.freelance || 0)}</span>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSubTab('returns');
              }}
              className="flex justify-between items-center hover:bg-emerald-50 dark:hover:bg-emerald-950/40 p-1 -mx-1 rounded-md transition-colors cursor-pointer group/ret"
              title="Click to view dedicated Money Returned to Me"
            >
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                Returned to Me (Repaid) →
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">+₹{formatINR(summary?.returns || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Extra & Developer Salary</span>
              <span className="font-semibold text-slate-900 dark:text-white">₹{formatINR((summary?.salary || 0) + (summary?.ext_income || 0))}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Carried from Last Month</span>
              <span>₹{formatINR(summary?.previous_remaining || 0)}</span>
            </div>
          </div>
        </div>

        {/* Stage 2: Money Out */}
        <div
          onClick={() => handleSelectSubTab('expenses')}
          className={`rounded-2xl p-5 border transition-all cursor-pointer group flex flex-col justify-between ${
            isStage2Active
              ? 'bg-white dark:bg-slate-900 border-rose-500 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-rose-500/50'
          }`}
          title="Click to view Living Expenses & Envelopes"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                <TrendingDown className="w-4 h-4" />
                2. Money Out (Living Expenses)
              </span>
              <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-md">
                Spent
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              ₹{formatINR(summary?.total_expense || 0)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Living Essentials (Food, Rent, Fuel)</span>
              <span className="font-semibold text-slate-900 dark:text-white">₹{formatINR(summary?.reg_expense || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>One-off & Extra Expenses</span>
              <span className="font-semibold text-slate-900 dark:text-white">₹{formatINR(summary?.ext_expense || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
              <span>Active Expense Entries</span>
              <span>{expenses.length} transactions</span>
            </div>
          </div>
        </div>

        {/* Stage 3: Debt & Borrowing */}
        <div
          onClick={() => handleSelectSubTab('borrow')}
          className={`rounded-2xl p-5 border transition-all cursor-pointer group flex flex-col justify-between ${
            isStage3Active
              ? 'bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-amber-500/50'
          }`}
          title="Click to view Loans, Borrowing, and Debt repayments"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <Landmark className="w-4 h-4" />
                3. Loans & Debts (Balance)
              </span>
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-md">
                Liability
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              ₹{formatINR(summary?.ending_debt || 0)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Debt Paid this Month</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">-₹{formatINR(summary?.dept_payment || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-700 dark:text-amber-400">New Borrowed this Month</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">+₹{formatINR(summary?.borrow_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Starting Debt from Previous</span>
              <span>₹{formatINR(summary?.starting_debt || 0)}</span>
            </div>
          </div>
        </div>

        {/* Stage 4: Net Surplus & 50/50 Split */}
        <div
          onClick={() => handleSelectSubTab('monthly-table')}
          className={`rounded-2xl p-5 border transition-all cursor-pointer group flex flex-col justify-between ${
            isStage4Active
              ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-indigo-500/50'
          }`}
          title="Click to view Multi-Month Ledger & Carryover"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                <Wallet className="w-4 h-4" />
                4. Cash Surplus & 50/50 Split
              </span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md">
                Surplus
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
              ₹{formatINR(summary?.overhead || 0)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span className="text-blue-700 dark:text-blue-400 font-medium">50% Stashed to Savings</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">₹{formatINR(summary?.overhead_savings || summary?.total_savings || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-indigo-700 dark:text-indigo-400 font-medium">50% Carried to Next Month</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">₹{formatINR(summary?.remaining || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
              <span>Target Formula</span>
              <span>Overhead ÷ 2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Sub-view Switcher Bar (Eliminates Duplicate Buttons) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1.5">
          {isStage1Active && (
            <>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Stage 1 Views:</span>
              <button
                onClick={() => handleSelectSubTab('income')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Personal Income Streams & Current Account ({incomes.length})
              </button>
              <button
                onClick={() => handleSelectSubTab('returns')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'returns'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                Returns (Money Repaid to Me) ({borrows.filter((b) => b.type === 'RETURN').length})
              </button>
            </>
          )}

          {isStage2Active && (
            <>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Stage 2 Views:</span>
              <button
                onClick={() => handleSelectSubTab('expenses')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'expenses'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Itemized Living Expense Ledger ({expenses.length})
              </button>
              <button
                onClick={() => handleSelectSubTab('allocations')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'allocations'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                100% Allocation Envelopes
              </button>
            </>
          )}

          {isStage3Active && (
            <>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Stage 3 Views:</span>
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 text-white shadow-xs">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Active Loans, Borrowed Funds & Debt Repayments ({borrows.filter((b) => b.type !== 'RETURN').length})
              </span>
            </>
          )}

          {isStage4Active && (
            <>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Stage 4 Views:</span>
              <button
                onClick={() => handleSelectSubTab('monthly-table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'monthly-table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Multi-Month Spreadsheet (Excel View)
              </button>
              <button
                onClick={() => handleSelectSubTab('goals')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeSubTab === 'goals'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Savings Goals Portfolio ({goals.length})
              </button>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-400 hidden sm:block">
          Select any of the 4 cards above to switch financial stages
        </div>
      </div>

      {/* Subtab Contents */}
      <div>
        {activeSubTab === 'allocations' && (
          <BudgetAllocationView
            allocations={allocations}
            totalIncome={totalIncomeBase}
            monthStr={selectedMonth}
          />
        )}

        {activeSubTab === 'expenses' && (
          <ExpenseLogView
            expenses={expenses}
            currentMonth={selectedMonth}
            onRefresh={() => loadMonthData(selectedMonth)}
            quickAddOpen={isQuickAddExpenseOpen}
            onCloseQuickAdd={() => setIsQuickAddExpenseOpen(false)}
          />
        )}

        {activeSubTab === 'income' && (
          <IncomeView
            incomes={incomes}
            currentMonth={selectedMonth}
            onRefresh={() => loadMonthData(selectedMonth)}
          />
        )}

        {activeSubTab === 'returns' && (
          <ReturnsTrackerView
            records={borrows}
            currentMonth={selectedMonth}
            onRefresh={() => loadMonthData(selectedMonth)}
          />
        )}

        {activeSubTab === 'borrow' && (
          <BorrowReturnsView
            records={borrows}
            onRefresh={() => loadMonthData(selectedMonth)}
          />
        )}

        {activeSubTab === 'goals' && (
          <GoalsTrackerView
            goals={goals}
            onRefresh={() => loadMonthData(selectedMonth)}
          />
        )}

        {activeSubTab === 'monthly-table' && (
          <MonthlyBreakdownTableView
            selectedMonth={selectedMonth}
            onSelectMonth={(m) => {
              setSelectedMonth(m);
              loadMonthData(m);
            }}
            onOpenEditModal={(m) => {
              setSelectedMonth(m);
              setIsDebtModalOpen(true);
            }}
            onRefreshParent={() => loadMonthData(selectedMonth)}
          />
        )}
      </div>

      {/* Edit Month Parameters & Debt Modal */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Month Parameters & Debt Tracker
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure starting liabilities and carryover for {formatMonthLabel(selectedMonth)}
                </p>
              </div>
              <button
                onClick={() => setIsDebtModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudgetParams} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Starting Debt (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={startingDebt}
                    onChange={(e) => setStartingDebt(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">Total liability at start</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Previous Remaining (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prevRemaining}
                    onChange={(e) => setPrevRemaining(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold text-emerald-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">Carried from last month</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Debt Payment Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deptPayment}
                    onChange={(e) => setDeptPayment(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">Repayment to debt balance</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Month Borrowed (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold text-rose-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">New loans taken this month</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Regular Savings Stashed (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={regSavings}
                    onChange={(e) => setRegSavings(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold text-blue-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">Fixed monthly savings transfer</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Extra Savings Stashed (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extSavings}
                    onChange={(e) => setExtSavings(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold text-blue-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">Bonus/ad-hoc savings stashed</span>
                </div>
              </div>

              {/* Formula explanation */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">Automatic Formula Calculation:</span>
                <p>Ending Debt = Starting Debt - Dept Payment + Borrow Amount + Deficit (if Overhead &lt; 0)</p>
                <p>Overhead = (Total Inflow) - (Total Outflow) - (Savings Stashed)</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDebtModalOpen(false)}
                  disabled={savingParams}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingParams}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {savingParams ? 'Saving...' : 'Update Parameters'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Report Modal */}
      {isPrintModalOpen && summary && (
        <PrintableMonthlyReport
          summary={summary}
          expenses={expenses}
          incomes={incomes}
          borrows={borrows}
          allocations={allocations}
          profile={profile}
          monthStr={selectedMonth}
          availableMonths={availableMonths}
          onSelectMonth={(m) => setSelectedMonth(m)}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
