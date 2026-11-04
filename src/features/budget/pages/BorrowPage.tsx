import { BorrowingAccountsView } from '../components/BorrowingAccountsView';
import { getCurrentBudgetMonth, includeCurrentBudgetMonth, useBudgetMonth } from '@/lib/budgetMonth';
import React, { useState, useEffect } from 'react';
import { BorrowRecord } from '@/types';
import { BorrowReturnsView } from '../components/BorrowReturnsView';
import { ArrowLeftRight, Calendar, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const BorrowPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useBudgetMonth();
  const [availableMonths, setAvailableMonths] = useState<string[]>(() => [getCurrentBudgetMonth()]);
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    setAvailableMonths((months) => includeCurrentBudgetMonth(months));
    if (selectedMonth) {
      loadBorrows(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchMonths = async (): Promise<string[]> => {
    try {
      const res = await fetch('/api/budget/months');
      if (!res.ok) return [];
      const data = includeCurrentBudgetMonth(await res.json());
      if (Array.isArray(data) && data.length > 0) {
        setAvailableMonths(data);
        if (!data.includes(selectedMonth) && selectedMonth !== 'all') {
          setSelectedMonth(data[0]);
        }
        return data;
      } else {
        const currentM = getCurrentBudgetMonth();
        setAvailableMonths([currentM]);
        if (selectedMonth !== 'all') {
          setSelectedMonth(currentM);
        }
        return [currentM];
      }
    } catch (err) {
      console.error('Failed to fetch months:', err);
      return [];
    }
  };

  const loadBorrows = async (m: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/budget/borrow?month=${m}`);
      if (!res.ok) {
        setRecords([]);
        return;
      }
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load borrow records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (entryMonth?: string) => {
    await fetchMonths();
    if (entryMonth && entryMonth !== selectedMonth && selectedMonth !== 'all') {
      setSelectedMonth(entryMonth);
    } else {
      await loadBorrows(selectedMonth);
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
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Loans & Debts
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track active loan liabilities, borrowed amounts, and debt repayments from your spreadsheet.
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2.5">
          <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
            <SelectTrigger className="w-[200px] h-9 text-xs font-bold bg-slate-50 dark:bg-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months (Lifetime)</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthLabel(m)} ({m})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Borrow Returns View */}
      <BorrowingAccountsView onRefresh={() => handleRefresh()} />
      <details className="border rounded-xl p-4"><summary className="font-semibold cursor-pointer">Legacy loans and lending records</summary>
      <BorrowReturnsView
        records={records}
        onRefresh={handleRefresh}
      />
      </details>
    </div>
  );
};
