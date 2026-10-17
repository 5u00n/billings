import React, { useState, useEffect } from 'react';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  TableProperties,
  Calendar,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Settings2,
  RefreshCw,
  Landmark,
  Wallet,
  PiggyBank,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export interface MonthlyBreakdownRow {
  month: string;
  starting_debt: number;
  previous_remaining: number;
  salary: number;
  freelance: number;
  returns: number;
  ext_income: number;
  total_income: number;
  reg_savings: number;
  ext_savings: number;
  total_savings: number;
  reg_expense: number;
  ext_expense: number;
  total_expense: number;
  dept_payment: number;
  borrow_amount: number;
  overhead: number;
  ovh_savings: number;
  remaining: number;
  ending_debt: number;
  notes?: string;
}

interface MonthlyBreakdownTableViewProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenEditModal: (month: string) => void;
  onRefreshParent: () => void;
}

export const MonthlyBreakdownTableView: React.FC<MonthlyBreakdownTableViewProps> = ({
  selectedMonth,
  onSelectMonth,
  onOpenEditModal,
  onRefreshParent,
}) => {
  const [rows, setRows] = useState<MonthlyBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMonthInput, setNewMonthInput] = useState('');
  const [addingMonth, setAddingMonth] = useState(false);

  useEffect(() => {
    fetchBreakdown();
  }, []);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/budget/monthly-breakdown');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRows(data);
      }
    } catch (err) {
      console.error('Failed to load monthly breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthInput || !/^\d{4}-\d{2}$/.test(newMonthInput)) {
      alert('Please enter a valid month in YYYY-MM format (e.g. 2026-11)');
      return;
    }
    try {
      setAddingMonth(true);
      const res = await fetch('/api/budget/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: newMonthInput }),
      });
      if (res.ok) {
        setNewMonthInput('');
        await fetchBreakdown();
        onRefreshParent();
      }
    } catch (err) {
      console.error('Failed to add month:', err);
    } finally {
      setAddingMonth(false);
    }
  };

  const formatMonthName = (m: string) => {
    const parts = m.split('-');
    if (parts.length === 2) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return m;
  };

  // Aggregates across all months
  const totalInflowAll = rows.reduce((sum, r) => sum + r.total_income, 0);
  const totalOutflowAll = rows.reduce((sum, r) => sum + r.total_expense, 0);
  const totalDebtPaidAll = rows.reduce((sum, r) => sum + r.dept_payment, 0);
  const totalSavingsAll = rows.reduce((sum, r) => sum + r.total_savings, 0);
  const latestDebt = rows.length > 0 ? rows[rows.length - 1].ending_debt : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Multi-Month Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Monthly Breakdown Ledger (Excel Income Tracker)
                </h3>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  Sequential Carryovers Active
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exact month-by-month cashflow calculation from your Complete Budget System template. Ending Debt & Remaining automatically carry over!
              </p>
            </div>
          </div>

          {/* Quick Month Adder & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleAddMonth} className="flex items-center gap-1.5">
              <input
                type="month"
                value={newMonthInput}
                onChange={(e) => setNewMonthInput(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="YYYY-MM"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={addingMonth || !newMonthInput}
                className="text-xs h-8 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Month
              </Button>
            </form>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchBreakdown}
              className="text-xs h-8 gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Aggregated Totals Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inflow Logged</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹{formatINR(totalInflowAll)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outflow Logged</span>
            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
              ₹{formatINR(totalOutflowAll)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debt Cleared</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
              ₹{formatINR(totalDebtPaidAll)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Stashed Savings</span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
              ₹{formatINR(totalSavingsAll)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latest Outstanding Debt</span>
            <span className="text-base font-extrabold text-red-600 dark:text-red-400 tabular-nums">
              ₹{formatINR(latestDebt)}
            </span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <th className="py-3 px-3.5 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800">Month</th>
                <th className="py-3 px-3 text-right">Starting Debt</th>
                <th className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">Pre.Rem</th>
                <th className="py-3 px-3 text-right">Salary</th>
                <th className="py-3 px-3 text-right text-blue-600 dark:text-blue-400">Freelance</th>
                <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Returns (Inflow)</th>
                <th className="py-3 px-3 text-right">Ext. Income</th>
                <th className="py-3 px-3 text-right font-black bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">Total Inflow</th>
                <th className="py-3 px-3 text-right">Reg. Exp</th>
                <th className="py-3 px-3 text-right">Ext. Exp</th>
                <th className="py-3 px-3 text-right font-black bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">Total Outflow</th>
                <th className="py-3 px-3 text-right text-blue-600">Debt Paid</th>
                <th className="py-3 px-3 text-right text-amber-600">New Borrow</th>
                <th className="py-3 px-3 text-right font-bold">Overhead</th>
                <th className="py-3 px-3 text-right text-indigo-600">Total Savings</th>
                <th className="py-3 px-3 text-right font-black text-emerald-600">Net Remaining</th>
                <th className="py-3 px-3 text-right font-black bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-400">Ending Debt</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-8 text-center text-slate-400">
                    {loading ? 'Calculating multi-month sequential ledger...' : 'No monthly records found.'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isSelected = r.month === selectedMonth;
                  const isSurplus = r.overhead >= 0;

                  return (
                    <tr
                      key={r.month}
                      className={`transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 font-medium'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Month Column (Sticky) */}
                      <td className={`py-3 px-3.5 sticky left-0 z-10 font-bold flex items-center gap-2 ${
                        isSelected ? 'bg-blue-50/90 dark:bg-slate-900 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                      }`}>
                        <span>{formatMonthName(r.month)}</span>
                        {isSelected && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-600 text-white border-transparent">
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Starting Debt */}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        ₹{formatINR(r.starting_debt)}
                      </td>

                      {/* Previous Remaining */}
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                        ₹{formatINR(r.previous_remaining)}
                      </td>

                      {/* Salary */}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        ₹{formatINR(r.salary)}
                      </td>

                      {/* Freelance */}
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                        ₹{formatINR(r.freelance)}
                      </td>

                      {/* Returns (Inflow) */}
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{formatINR(r.returns)}
                      </td>

                      {/* Extra Income */}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        ₹{formatINR(r.ext_income)}
                      </td>

                      {/* Total Inflow */}
                      <td className="py-3 px-3 text-right tabular-nums font-bold bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                        ₹{formatINR(r.total_income)}
                      </td>

                      {/* Reg Expense */}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        ₹{formatINR(r.reg_expense)}
                      </td>

                      {/* Ext Expense */}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        ₹{formatINR(r.ext_expense)}
                      </td>

                      {/* Total Outflow */}
                      <td className="py-3 px-3 text-right tabular-nums font-bold bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
                        ₹{formatINR(r.total_expense)}
                      </td>

                      {/* Debt Paid */}
                      <td className="py-3 px-3 text-right tabular-nums font-medium text-blue-600 dark:text-blue-400">
                        ₹{formatINR(r.dept_payment)}
                      </td>

                      {/* New Borrow */}
                      <td className="py-3 px-3 text-right tabular-nums font-medium text-amber-600 dark:text-amber-400">
                        ₹{formatINR(r.borrow_amount)}
                      </td>

                      {/* Overhead */}
                      <td className={`py-3 px-3 text-right tabular-nums font-semibold ${
                        isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        ₹{formatINR(r.overhead)}
                      </td>

                      {/* Total Savings */}
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                        ₹{formatINR(r.total_savings)}
                      </td>

                      {/* Net Remaining (Carry forward) */}
                      <td className="py-3 px-3 text-right tabular-nums font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{formatINR(r.remaining)}
                      </td>

                      {/* Ending Debt */}
                      <td className="py-3 px-3 text-right tabular-nums font-extrabold bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-400">
                        ₹{formatINR(r.ending_debt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectMonth(r.month)}
                            title="Switch dashboard to this month"
                            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onOpenEditModal(r.month)}
                            title="Edit starting debt, debt payments, and carryover"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
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

      {/* Visual Explanation of the Excel Formula */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-2">
        <h5 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-500" />
          Excel Template Cashflow Logic & Carryover Rules:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-500/10">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">1. Total Inflow</span>
            Pre.Rem (from prev month) + Salary + Freelance (Client Bills) + Returns (Money paid back to you) + Extra Income.
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-500/10">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">2. Overhead & Savings</span>
            Overhead = (Total Inflow + Borrow) - (Total Outflow + Debt Paid). 50% of positive overhead is auto-stashed into savings, remaining 50% carries forward!
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-500/10">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">3. Ending Debt Trajectory</span>
            Ending Debt = (Starting Debt - Debt Paid) + New Borrow + Deficit. Automatically becomes next month's Starting Debt!
          </div>
        </div>
      </div>
    </div>
  );
};
