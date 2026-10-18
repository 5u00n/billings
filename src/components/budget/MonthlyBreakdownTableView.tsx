import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart3,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Maximize2,
  Eye,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

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

interface ColumnMetricDef {
  key: keyof Omit<MonthlyBreakdownRow, 'month' | 'notes'>;
  label: string;
  shortLabel: string;
  category: 'INFLOW' | 'OUTFLOW' | 'DEBT' | 'RESERVE';
  color: string;
  strokeColor: string;
  gradientId: string;
  description: string;
}

const COLUMN_DEFINITIONS: ColumnMetricDef[] = [
  // Inflows
  {
    key: 'previous_remaining',
    label: 'Previous Remaining (Pre.Rem)',
    shortLabel: 'Pre.Rem',
    category: 'INFLOW',
    color: '#6366f1',
    strokeColor: '#4f46e5',
    gradientId: 'grad-prerem',
    description: 'Cash carried over from prior month',
  },
  {
    key: 'salary',
    label: 'Fixed Salary',
    shortLabel: 'Salary',
    category: 'INFLOW',
    color: '#10b981',
    strokeColor: '#059669',
    gradientId: 'grad-sal',
    description: 'Direct salary credited',
  },
  {
    key: 'freelance',
    label: 'Freelance & Invoices',
    shortLabel: 'Freelance',
    category: 'INFLOW',
    color: '#06b6d4',
    strokeColor: '#0891b2',
    gradientId: 'grad-fl',
    description: 'Client billings & project income',
  },
  {
    key: 'returns',
    label: 'Returns (Repaid to Me)',
    shortLabel: 'Returns',
    category: 'INFLOW',
    color: '#14b8a6',
    strokeColor: '#0d9488',
    gradientId: 'grad-rt',
    description: 'Money returned to you by contacts',
  },
  {
    key: 'ext_income',
    label: 'Extra / Other Income',
    shortLabel: 'Ext. Income',
    category: 'INFLOW',
    color: '#84cc16',
    strokeColor: '#65a30d',
    gradientId: 'grad-extinc',
    description: 'Miscellaneous or bonus cashflows',
  },
  {
    key: 'total_income',
    label: 'Total Inflow (Cash Available)',
    shortLabel: 'Total Inflow',
    category: 'INFLOW',
    color: '#22c55e',
    strokeColor: '#16a34a',
    gradientId: 'grad-totinc',
    description: 'Cumulative cashflow inflow this month',
  },

  // Outflows
  {
    key: 'reg_expense',
    label: 'Regular Expenses',
    shortLabel: 'Reg. Exp',
    category: 'OUTFLOW',
    color: '#f97316',
    strokeColor: '#ea580c',
    gradientId: 'grad-regexp',
    description: 'Monthly necessities and fixed lifestyle',
  },
  {
    key: 'ext_expense',
    label: 'Extra / Irregular Expenses',
    shortLabel: 'Ext. Exp',
    category: 'OUTFLOW',
    color: '#fb7185',
    strokeColor: '#e11d48',
    gradientId: 'grad-extexp',
    description: 'Discretionary, shopping, and emergencies',
  },
  {
    key: 'total_expense',
    label: 'Total Outflow (Expenses)',
    shortLabel: 'Total Outflow',
    category: 'OUTFLOW',
    color: '#ef4444',
    strokeColor: '#dc2626',
    gradientId: 'grad-totexp',
    description: 'Total spending across all categories',
  },

  // Debts
  {
    key: 'starting_debt',
    label: 'Starting Debt',
    shortLabel: 'Start Debt',
    category: 'DEBT',
    color: '#a855f7',
    strokeColor: '#9333ea',
    gradientId: 'grad-startdebt',
    description: 'Liabilities brought in at start of month',
  },
  {
    key: 'dept_payment',
    label: 'Debt Repayments Made',
    shortLabel: 'Debt Paid',
    category: 'DEBT',
    color: '#3b82f6',
    strokeColor: '#2563eb',
    gradientId: 'grad-deptpay',
    description: 'Total debt cleared this month',
  },
  {
    key: 'borrow_amount',
    label: 'New Borrow / Debt Incurred',
    shortLabel: 'New Borrow',
    category: 'DEBT',
    color: '#f59e0b',
    strokeColor: '#d97706',
    gradientId: 'grad-borrow',
    description: 'New loans taken or money borrowed',
  },
  {
    key: 'ending_debt',
    label: 'Ending Debt (Carry forward)',
    shortLabel: 'Ending Debt',
    category: 'DEBT',
    color: '#dc2626',
    strokeColor: '#b91c1c',
    gradientId: 'grad-enddebt',
    description: 'Closing debt carried forward to next month',
  },

  // Reserves & Surplus
  {
    key: 'overhead',
    label: 'Monthly Overhead (Cash Margin)',
    shortLabel: 'Overhead',
    category: 'RESERVE',
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    gradientId: 'grad-ovh',
    description: 'Inflows + Borrow minus Outflows + Debt Paid',
  },
  {
    key: 'total_savings',
    label: 'Total Savings Stashed',
    shortLabel: 'Savings',
    category: 'RESERVE',
    color: '#2563eb',
    strokeColor: '#1d4ed8',
    gradientId: 'grad-totsav',
    description: '50% of surplus + manual savings',
  },
  {
    key: 'remaining',
    label: 'Net Remaining (Next Pre.Rem)',
    shortLabel: 'Remaining',
    category: 'RESERVE',
    color: '#10b981',
    strokeColor: '#047857',
    gradientId: 'grad-rem',
    description: 'Surplus cash carried into next month',
  },
];

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
  const [activeTab, setActiveTab] = useState<'ALL' | 'INFLOW' | 'OUTFLOW' | 'DEBT' | 'RESERVE' | 'COMPARE'>('ALL');
  const [spotlightMetric, setSpotlightMetric] = useState<ColumnMetricDef | null>(null);

  useEffect(() => {
    fetchBreakdown();
  }, []);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/budget/monthly-breakdown');
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setRows(data);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error('Failed to load monthly breakdown:', err);
      setRows([]);
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
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error ${res.status}`);
      }
      setNewMonthInput('');
      await fetchBreakdown();
      onRefreshParent();
    } catch (err: any) {
      console.error('Failed to add month:', err);
      alert(`Could not add month: ${err.message || 'Please try again'}`);
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

  // Chart Formatted Data
  const chartData = useMemo(() => {
    return rows.map((r) => {
      const parts = r.month.split('-');
      let label = r.month;
      if (parts.length === 2) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      return {
        ...r,
        displayMonth: label,
      };
    });
  }, [rows]);

  // Filtered metrics based on active tab
  const displayedMetrics = useMemo(() => {
    if (activeTab === 'ALL' || activeTab === 'COMPARE') return COLUMN_DEFINITIONS;
    return COLUMN_DEFINITIONS.filter((m) => m.category === activeTab);
  }, [activeTab]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-2.5 rounded-xl border border-slate-700/80 shadow-xl text-xs backdrop-blur-xs">
          <p className="font-bold text-slate-300 text-[11px] mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3 font-semibold">
              <span style={{ color: p.color || p.stroke }}>{p.name}:</span>
              <span className="tabular-nums">₹{formatINR(Number(p.value) || 0)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
                className="text-xs h-8 gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Month
              </Button>
            </form>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchBreakdown}
              className="text-xs h-8 gap-1 cursor-pointer"
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
                  <td colSpan={18} className="py-12 text-center text-slate-400">
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

      {/* ============================================================== */}
      {/* COLUMN TRENDS & ANALYTICS VISUALIZER (UNDER THE TABLE)         */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-5">
        {/* Hub Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Column Visual Trends & Charts
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {COLUMN_DEFINITIONS.length} Metrics Analyzed
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Month-by-month trajectory and growth graphs for each ledger column. Click any card to expand inspection.
              </p>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Columns ({COLUMN_DEFINITIONS.length})
            </button>
            <button
              onClick={() => setActiveTab('INFLOW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'INFLOW'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              Inflows
            </button>
            <button
              onClick={() => setActiveTab('OUTFLOW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'OUTFLOW'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              Outflows
            </button>
            <button
              onClick={() => setActiveTab('DEBT')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'DEBT'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
              }`}
            >
              Debt & Loans
            </button>
            <button
              onClick={() => setActiveTab('RESERVE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'RESERVE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
              }`}
            >
              Surplus & Savings
            </button>
            <button
              onClick={() => setActiveTab('COMPARE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'COMPARE'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              Comparison Overlay
            </button>
          </div>
        </div>

        {/* COMPARISON OVERVIEW CHART (Shown when on COMPARE or when rows exist) */}
        {activeTab === 'COMPARE' && (
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Comprehensive Cashflow & Debt Overlay
                </h5>
                <p className="text-[11px] text-slate-500">
                  Total Inflow vs Total Outflow vs Net Remaining vs Ending Debt across all recorded months
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No monthly data to render chart
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="comp-inflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="comp-outflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="comp-rem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="comp-debt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="displayMonth" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="total_income"
                      name="Total Inflow"
                      stroke="#10b981"
                      fill="url(#comp-inflow)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_expense"
                      name="Total Outflow"
                      stroke="#f43f5e"
                      fill="url(#comp-outflow)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="remaining"
                      name="Net Remaining"
                      stroke="#06b6d4"
                      fill="url(#comp-rem)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="ending_debt"
                      name="Ending Debt"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* SPOTLIGHT INSPECTOR (When a user clicks on any card to examine) */}
        {spotlightMetric && (
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spotlightMetric.color }} />
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                  Spotlight Inspector: {spotlightMetric.label}
                </h5>
                <Badge variant="outline" className="text-[10px]">
                  {spotlightMetric.category}
                </Badge>
              </div>
              <button
                onClick={() => setSpotlightMetric(null)}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
              >
                Close Inspector ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="space-y-2 text-xs">
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {spotlightMetric.description}
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-950/60 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Timeline Average:</span>
                    <span className="font-bold tabular-nums">
                      ₹{formatINR(Math.round(chartData.reduce((s, r) => s + (Number(r[spotlightMetric.key]) || 0), 0) / (chartData.length || 1)))}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Peak Month:</span>
                    <span className="font-bold tabular-nums text-emerald-600">
                      ₹{formatINR(Math.max(...chartData.map((r) => Number(r[spotlightMetric.key]) || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Lowest Month:</span>
                    <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                      ₹{formatINR(Math.min(...chartData.map((r) => Number(r[spotlightMetric.key]) || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="displayMonth" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey={spotlightMetric.key}
                      name={spotlightMetric.label}
                      fill={spotlightMetric.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 16 COLUMN MINI-CHARTS GRID */}
        {activeTab !== 'COMPARE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {displayedMetrics.map((col) => {
              const values = chartData.map((r) => Number(r[col.key]) || 0);
              const latestVal = values.length > 0 ? values[values.length - 1] : 0;
              const prevVal = values.length > 1 ? values[values.length - 2] : latestVal;
              const diff = latestVal - prevVal;
              const isSelected = spotlightMetric?.key === col.key;

              return (
                <div
                  key={col.key}
                  onClick={() => setSpotlightMetric(isSelected ? null : col)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={col.label}>
                        {col.shortLabel}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider"
                        style={{
                          backgroundColor: `${col.color}15`,
                          color: col.strokeColor,
                        }}
                      >
                        {col.category}
                      </span>
                    </div>

                    {/* Latest Value & Trend */}
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                        ₹{formatINR(latestVal)}
                      </span>
                      {values.length > 1 && (
                        <span
                          className={`text-[10px] font-bold flex items-center gap-0.5 tabular-nums ${
                            diff > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : diff < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {diff > 0 ? (
                            <>
                              <ArrowUpRight className="w-2.5 h-2.5" />
                              +₹{formatINR(diff)}
                            </>
                          ) : diff < 0 ? (
                            <>
                              <ArrowDownLeft className="w-2.5 h-2.5" />
                              -₹{formatINR(Math.abs(diff))}
                            </>
                          ) : (
                            '0'
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sparkline Area Chart */}
                  <div className="h-16 w-full pt-1">
                    {chartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                        No data
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                          <defs>
                            <linearGradient id={col.gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={col.color} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={col.color} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="displayMonth" hide />
                          <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey={col.key}
                            name={col.label}
                            stroke={col.strokeColor}
                            fill={`url(#${col.gradientId})`}
                            strokeWidth={1.8}
                            dot={{ r: 2.5, fill: col.strokeColor }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">{col.description}</span>
                    <Eye className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
