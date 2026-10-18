import React, { useState, useEffect } from 'react';
import { BudgetAllocationRule } from '../../types';
import { BudgetAllocationView } from './BudgetAllocationView';
import { Layers, Calendar, ChevronDown } from 'lucide-react';

export const AllocationsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocationRule[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadAllocations(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/budget/months');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAvailableMonths(data);
        if (!data.includes(selectedMonth) && selectedMonth !== 'all') {
          setSelectedMonth(data[0]);
        }
      } else {
        const currentM = new Date().toISOString().substring(0, 7);
        setAvailableMonths([currentM]);
      }
    } catch (err) {
      console.error('Failed to fetch months:', err);
    }
  };

  const loadAllocations = async (m: string) => {
    try {
      setLoading(true);
      const [allocRes, sumRes] = await Promise.all([
        fetch(`/api/budget/allocations?month=${m}`),
        fetch(`/api/budget/summary?month=${m}`),
      ]);
      const allocData = await allocRes.json();
      const sumData = await sumRes.json();
      const list = Array.isArray(allocData) ? allocData : (allocData?.allocations || []);
      setAllocations(list);
      setTotalIncome(allocData?.total_income || sumData?.total_inflow || sumData?.total_income || 0);
    } catch (err) {
      console.error('Failed to load allocations:', err);
    } finally {
      setLoading(false);
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
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              100% Allocation Envelopes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Budget rules from your Excel template: 50% Essentials, 10% Emergency, 13% Family, 15% Business, 7% Big Assets, 5% Small Assets.
            </p>
          </div>
        </div>

        {/* Month Selector */}
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
        </div>
      </div>

      {/* Allocations View */}
      <BudgetAllocationView
        allocations={allocations}
        totalIncome={totalIncome}
        monthStr={selectedMonth}
      />
    </div>
  );
};
