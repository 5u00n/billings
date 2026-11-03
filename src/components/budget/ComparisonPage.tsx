import React, { useState, useEffect, useMemo } from 'react';
import { formatINR } from '../../utils/numberToWords';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Layers,
  Target,
  FileSpreadsheet,
  RefreshCw,
  Wallet,
  Receipt,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ExportActions } from '../common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '../../utils/dataExport';
import { MonthlyBreakdownRow } from './MonthlyBreakdownTableView';

interface CategoryComparisonItem {
  category: string;
  amountA: number;
  amountB: number;
  diff: number;
  pctChange: number;
}

export const ComparisonPage: React.FC = () => {
  const [months, setMonths] = useState<string[]>([]);
  const [monthA, setMonthA] = useState<string>('');
  const [monthB, setMonthB] = useState<string>('');
  const [breakdown, setBreakdown] = useState<MonthlyBreakdownRow[]>([]);
  const [expensesA, setExpensesA] = useState<any[]>([]);
  const [expensesB, setExpensesB] = useState<any[]>([]);
  const [mode, setMode] = useState<'MOM' | 'BVA'>('MOM'); // Month-over-Month or Budget vs Actual
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [mRes, bRes] = await Promise.all([
        fetch('/api/budget/months'),
        fetch('/api/budget/monthly-breakdown'),
      ]);

      const mData: string[] = await mRes.json();
      const bData: MonthlyBreakdownRow[] = await bRes.json();

      setBreakdown(bData || []);

      if (Array.isArray(mData) && mData.length > 0) {
        setMonths(mData);
        if (mData.length >= 2) {
          setMonthA(mData[1]); // Previous month
          setMonthB(mData[0]); // Most recent month
        } else {
          setMonthA(mData[0]);
          setMonthB(mData[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (monthA && monthB) {
      fetchMonthExpenses();
    }
  }, [monthA, monthB]);

  const fetchMonthExpenses = async () => {
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/budget/expenses?month=${monthA}`),
        fetch(`/api/budget/expenses?month=${monthB}`),
      ]);
      const dataA = await resA.json();
      const dataB = await resB.json();
      setExpensesA(Array.isArray(dataA) ? dataA : []);
      setExpensesB(Array.isArray(dataB) ? dataB : []);
    } catch (err) {
      console.error('Failed to fetch month expenses:', err);
    }
  };

  const rowA = useMemo(() => {
    return breakdown.find((r) => r.month === monthA) || {
      month: monthA,
      total_income: 0,
      total_expense: 0,
      reg_expense: 0,
      ext_expense: 0,
      dept_payment: 0,
      borrow_amount: 0,
      overhead: 0,
      starting_debt: 0,
      previous_remaining: 0,
      salary: 0,
      freelance: 0,
      returns: 0,
      ext_income: 0,
      reg_savings: 0,
      ext_savings: 0,
      total_savings: 0,
      ovh_savings: 0,
      remaining: 0,
      ending_debt: 0,
    };
  }, [breakdown, monthA]);

  const rowB = useMemo(() => {
    return breakdown.find((r) => r.month === monthB) || {
      month: monthB,
      total_income: 0,
      total_expense: 0,
      reg_expense: 0,
      ext_expense: 0,
      dept_payment: 0,
      borrow_amount: 0,
      overhead: 0,
      starting_debt: 0,
      previous_remaining: 0,
      salary: 0,
      freelance: 0,
      returns: 0,
      ext_income: 0,
      reg_savings: 0,
      ext_savings: 0,
      total_savings: 0,
      ovh_savings: 0,
      remaining: 0,
      ending_debt: 0,
    };
  }, [breakdown, monthB]);

  // Deltas
  const calcDelta = (valA: number, valB: number) => {
    const diff = valB - valA;
    const pct = valA > 0 ? Math.round((diff / valA) * 100) : diff !== 0 ? 100 : 0;
    return { diff, pct };
  };

  const deltaInflow = calcDelta(rowA.total_income, rowB.total_income);
  const deltaOutflow = calcDelta(rowA.total_expense, rowB.total_expense);
  const deltaReg = calcDelta(rowA.reg_expense, rowB.reg_expense);
  const deltaExt = calcDelta(rowA.ext_expense, rowB.ext_expense);
  const deltaOverhead = calcDelta(rowA.overhead, rowB.overhead);
  const deltaDebt = calcDelta(rowA.dept_payment, rowB.dept_payment);

  // Category comparison
  const categoryComparison: CategoryComparisonItem[] = useMemo(() => {
    const cats = new Set<string>();
    const mapA: Record<string, number> = {};
    const mapB: Record<string, number> = {};

    expensesA.forEach((e) => {
      const tag = e.tag || 'General';
      cats.add(tag);
      mapA[tag] = (mapA[tag] || 0) + (e.amount || 0);
    });

    expensesB.forEach((e) => {
      const tag = e.tag || 'General';
      cats.add(tag);
      mapB[tag] = (mapB[tag] || 0) + (e.amount || 0);
    });

    return Array.from(cats)
      .map((cat) => {
        const amountA = mapA[cat] || 0;
        const amountB = mapB[cat] || 0;
        const diff = amountB - amountA;
        const pctChange = amountA > 0 ? Math.round((diff / amountA) * 100) : diff > 0 ? 100 : 0;
        return { category: cat, amountA, amountB, diff, pctChange };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [expensesA, expensesB]);

  // Chart data
  const chartData = useMemo(() => {
    return [
      { metric: 'Total Inflow', [monthA || 'Month A']: rowA.total_income, [monthB || 'Month B']: rowB.total_income },
      { metric: 'Regular Expenses', [monthA || 'Month A']: rowA.reg_expense, [monthB || 'Month B']: rowB.reg_expense },
      { metric: 'Extra Expenses', [monthA || 'Month A']: rowA.ext_expense, [monthB || 'Month B']: rowB.ext_expense },
      { metric: 'Total Outflow', [monthA || 'Month A']: rowA.total_expense, [monthB || 'Month B']: rowB.total_expense },
      { metric: 'Debt Repaid', [monthA || 'Month A']: rowA.dept_payment, [monthB || 'Month B']: rowB.dept_payment },
      { metric: 'Free Overhead', [monthA || 'Month A']: rowA.overhead, [monthB || 'Month B']: rowB.overhead },
    ];
  }, [rowA, rowB, monthA, monthB]);

  // Export Columns for Comparison Table
  const exportColumns: ExportColumn<CategoryComparisonItem>[] = [
    { header: 'Category / Tag', key: 'category', width: 22, align: 'left' },
    {
      header: `${monthA} (Month A)`,
      key: 'amountA',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: `${monthB} (Month B)`,
      key: 'amountB',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Difference (B - A)',
      key: 'diff',
      width: 16,
      align: 'right',
      isNumeric: true,
      format: (val) => (val > 0 ? `+${val}` : val),
      formatPdf: (val) => (val > 0 ? `+${formatCurrencyForPdf(val)}` : formatCurrencyForPdf(val)),
    },
    {
      header: '% Change',
      key: 'pctChange',
      width: 14,
      align: 'center',
      format: (val) => `${val > 0 ? '+' : ''}${val}%`,
    },
  ];

  const exportOptions = {
    filename: `Monthly_Comparison_${monthA}_vs_${monthB}`,
    title: `Financial Comparison: ${monthA} vs ${monthB}`,
    subtitle: `Comparative analysis of income, expenses, and category variances`,
    sheetName: 'Comparison',
    columns: exportColumns,
    data: categoryComparison,
    summaryMetrics: [
      { label: `Inflow Delta`, value: `${deltaInflow.diff >= 0 ? '+' : ''}${formatCurrencyForPdf(deltaInflow.diff)} (${deltaInflow.pct}%)` },
      { label: `Outflow Delta`, value: `${deltaOutflow.diff >= 0 ? '+' : ''}${formatCurrencyForPdf(deltaOutflow.diff)} (${deltaOutflow.pct}%)` },
      { label: `Overhead Delta`, value: `${deltaOverhead.diff >= 0 ? '+' : ''}${formatCurrencyForPdf(deltaOverhead.diff)}` },
      { label: `Categories Compared`, value: categoryComparison.length },
    ],
  };

  const renderTrendBadge = (diff: number, pct: number, invert = false) => {
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </span>
      );
    }

    const isGood = invert ? diff > 0 : diff < 0; // For expense: decrease is good. For income: increase is good.

    if (isGood) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
          <TrendingDown className="w-3 h-3" />
          <span>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" />
        <span>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Financial Comparison & Analytics Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compare cashflow trends, spending variances, and category budget shifts between any two periods.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => setMode('MOM')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  mode === 'MOM'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Month vs Month
              </button>
              <button
                type="button"
                onClick={() => setMode('BVA')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  mode === 'BVA'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Budget vs Actual
              </button>
            </div>

            {/* Export Actions */}
            <ExportActions exportOptions={exportOptions} size="default" />

            <Button
              size="sm"
              variant="outline"
              onClick={fetchInitialData}
              className="text-xs h-9 gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Dual Period Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 items-center">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Period A (Baseline)
            </label>
            <select
              value={monthA}
              onChange={(e) => setMonthA(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {months.map((m) => (
                <option key={`a-${m}`} value={m}>
                  {m} {m === months[0] ? '(Latest)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Period B (Comparison)
            </label>
            <select
              value={monthB}
              onChange={(e) => setMonthB(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {months.map((m) => (
                <option key={`b-${m}`} value={m}>
                  {m} {m === months[0] ? '(Latest)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-2 sm:pt-4">
            <span className="text-xs text-slate-400">Quick Presets:</span>
            {months.length >= 2 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2.5 rounded-lg"
                onClick={() => {
                  setMonthA(months[1]);
                  setMonthB(months[0]);
                }}
              >
                Previous vs Current
              </Button>
            )}
            {months.length >= 3 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2.5 rounded-lg"
                onClick={() => {
                  setMonthA(months[2]);
                  setMonthB(months[0]);
                }}
              >
                2 Months Ago vs Current
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Delta Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow Delta */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Inflow
            </span>
            {renderTrendBadge(deltaInflow.diff, deltaInflow.pct, true)}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 block">{monthB}</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ₹{formatINR(rowB.total_income)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">{monthA}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                ₹{formatINR(rowA.total_income)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Net Change: <strong className={deltaInflow.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {deltaInflow.diff >= 0 ? '+' : ''}₹{formatINR(deltaInflow.diff)}
            </strong>
          </div>
        </div>

        {/* Total Outflow Delta */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Outflow
            </span>
            {renderTrendBadge(deltaOutflow.diff, deltaOutflow.pct, false)}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 block">{monthB}</span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                ₹{formatINR(rowB.total_expense)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">{monthA}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                ₹{formatINR(rowA.total_expense)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Net Change: <strong className={deltaOutflow.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {deltaOutflow.diff >= 0 ? '+' : ''}₹{formatINR(deltaOutflow.diff)}
            </strong>
          </div>
        </div>

        {/* Regular vs Extra Split */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Spending Types Shift
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Regular (Fixed):</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span>₹{formatINR(rowB.reg_expense)}</span>
                <span className="text-[10px] text-slate-400">({deltaReg.diff >= 0 ? '+' : ''}₹{formatINR(deltaReg.diff)})</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Extra (Discretionary):</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span>₹{formatINR(rowB.ext_expense)}</span>
                <span className="text-[10px] text-slate-400">({deltaExt.diff >= 0 ? '+' : ''}₹{formatINR(deltaExt.diff)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Free Cash / Overhead Delta */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Free Cash / Overhead
            </span>
            {renderTrendBadge(deltaOverhead.diff, deltaOverhead.pct, true)}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 block">{monthB}</span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                ₹{formatINR(rowB.overhead)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">{monthA}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                ₹{formatINR(rowA.overhead)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Net Change: <strong className={deltaOverhead.diff >= 0 ? 'text-blue-600' : 'text-amber-600'}>
              {deltaOverhead.diff >= 0 ? '+' : ''}₹{formatINR(deltaOverhead.diff)}
            </strong>
          </div>
        </div>
      </div>

      {/* Visual Chart Comparison */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Cashflow Performance Comparison ({monthA} vs {monthB})
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Side-by-side grouped metrics comparison showing growth and reduction patterns.
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(val) => `₹${val / 1000}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: any) => [`₹${formatINR(Number(val))}`, '']} />
              <Legend />
              <Bar dataKey={monthA || 'Month A'} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey={monthB || 'Month B'} fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category-by-Category Detailed Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Category Spending Variance Table
            </h3>
            <p className="text-xs text-slate-500">
              Detailed line-item comparison by tag between {monthA} and {monthB}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {categoryComparison.length} categories active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Category / Tag</th>
                <th className="py-3 px-4 text-right">{monthA}</th>
                <th className="py-3 px-4 text-right">{monthB}</th>
                <th className="py-3 px-4 text-right">Net Difference</th>
                <th className="py-3 px-4 text-center">% Change</th>
                <th className="py-3 px-4 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categoryComparison.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No expense category records found for these selected months.
                  </td>
                </tr>
              ) : (
                categoryComparison.map((item) => (
                  <tr key={item.category} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      ₹{formatINR(item.amountA)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                      ₹{formatINR(item.amountB)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">
                      <span className={item.diff > 0 ? 'text-rose-600 dark:text-rose-400' : item.diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        {item.diff > 0 ? '+' : ''}₹{formatINR(item.diff)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums font-semibold">
                      {item.pctChange > 0 ? `+${item.pctChange}%` : `${item.pctChange}%`}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderTrendBadge(item.diff, item.pctChange, false)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

