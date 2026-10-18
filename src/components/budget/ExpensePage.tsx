import React, { useState, useEffect } from 'react';
import { Expense } from '../../types';
import { ExpenseLogView } from './ExpenseLogView';
import { Receipt, Calendar, ChevronDown, Plus, HandCoins } from 'lucide-react';
import { Button } from '../ui/button';

export const ExpensePage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isQuickPaybackOpen, setIsQuickPaybackOpen] = useState(false);

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadExpenses(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/budget/months');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAvailableMonths(data);
        if (selectedMonth !== 'all' && !data.includes(selectedMonth)) {
          setSelectedMonth(data[0]);
        }
      } else {
        const currentM = new Date().toISOString().substring(0, 7);
        setAvailableMonths([currentM]);
        if (selectedMonth !== 'all') {
          setSelectedMonth(currentM);
        }
      }
    } catch (err) {
      console.error('Failed to fetch months:', err);
    }
  };

  const loadExpenses = async (m: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/budget/expenses?month=${m}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (entryMonth?: string) => {
    await fetchMonths();
    if (entryMonth && entryMonth !== selectedMonth && selectedMonth !== 'all') {
      setSelectedMonth(entryMonth);
    } else {
      loadExpenses(selectedMonth);
    }
  };

  const formatMonthLabel = (m: string) => {
    if (m === 'all') return 'All Months (Lifetime)';
    const parts = m.split('-');
    if (parts.length === 2) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return m;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Expense Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track daily expenses with Regular (fixed) vs Extra (discretionary) tags, credit card liabilities & debt paybacks.
            </p>
          </div>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              <option value="all">All Months (Lifetime)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button
            onClick={() => setIsQuickPaybackOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 border-teal-300 dark:border-teal-800/80 bg-teal-50/70 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 font-semibold text-xs h-9 rounded-xl shadow-2xs cursor-pointer"
          >
            <HandCoins className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Payback /</span> Repay Debt
          </Button>

          <Button
            onClick={() => setIsQuickAddOpen(true)}
            size="sm"
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Expense Log View */}
      <ExpenseLogView
        expenses={expenses}
        currentMonth={selectedMonth}
        onRefresh={handleRefresh}
        quickAddOpen={isQuickAddOpen}
        onCloseQuickAdd={() => setIsQuickAddOpen(false)}
        quickPaybackOpen={isQuickPaybackOpen}
        onCloseQuickPayback={() => setIsQuickPaybackOpen(false)}
      />
    </div>
  );
};
