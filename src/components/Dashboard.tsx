import React, { useState, useEffect } from 'react';
import {
  Invoice,
  Organization,
  UserProfile,
  MonthlyBudgetSummary,
  BudgetAllocationRule,
  Expense,
  FinancialGoal,
} from '../types';
import { formatINR } from '../utils/numberToWords';
import {
  Receipt,
  Building2,
  AlertCircle,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Landmark,
  Target,
  Tag,
  ChevronRight,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from './ui/chart';
import { useTheme } from '../context/ThemeContext';
import { NavTab } from './Sidebar';

interface DashboardProps {
  invoices: Invoice[];
  organizations: Organization[];
  profile: UserProfile;
  onNewInvoice: () => void;
  onViewInvoices: () => void;
  onViewOrganizations: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onSelectOrg?: (orgId: string) => void;
  onNavigate?: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  organizations,
  profile,
  onNewInvoice,
  onViewInvoices,
  onViewOrganizations,
  onSelectInvoice,
  onSelectOrg,
  onNavigate,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // State for Personal Budget Data on Dashboard
  const [budgetSummary, setBudgetSummary] = useState<MonthlyBudgetSummary | null>(null);
  const [allocations, setAllocations] = useState<BudgetAllocationRule[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [expenseChartMode, setExpenseChartMode] = useState<'tag' | 'category'>('tag');

  const currentMonth = new Date().toISOString().substring(0, 7);

  useEffect(() => {
    fetchDashboardBudgetData();
  }, []);

  const fetchDashboardBudgetData = async () => {
    try {
      setLoadingBudget(true);
      const [sumRes, allocRes, expRes, goalRes] = await Promise.all([
        fetch(`/api/budget/summary?month=${currentMonth}`),
        fetch(`/api/budget/allocations?month=${currentMonth}`),
        fetch(`/api/budget/expenses?month=${currentMonth}`),
        fetch('/api/budget/goals'),
      ]);

      const [sumData, allocData, expData, goalData] = await Promise.all([
        sumRes.json(),
        allocRes.json(),
        expRes.json(),
        goalRes.json(),
      ]);

      setBudgetSummary(sumData);
      setAllocations(allocData?.allocations || []);
      setMonthExpenses(Array.isArray(expData) ? expData : []);
      setRecentExpenses(Array.isArray(expData) ? expData.slice(0, 5) : []);
      setGoals(goalData ? goalData.slice(0, 3) : []);
    } catch (err) {
      console.error('Failed to load budget snapshot for dashboard:', err);
    } finally {
      setLoadingBudget(false);
    }
  };

  // Billing Metrics
  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0);
  const totalReceivables = invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);
  const pendingInvoices = invoices.filter((i) => i.balance_due > 0);
  const paidInvoices = invoices.filter((i) => i.balance_due === 0);
  const recentInvoices = invoices.slice(0, 5);

  // Group invoices by month for trend chart
  const monthlyDataMap: { [month: string]: { month: string; billed: number; collected: number } } = {};
  invoices.forEach((inv) => {
    let m = 'Current';
    if (inv.invoice_date) {
      const parts = inv.invoice_date.split('/');
      if (parts.length === 3) {
        m = `${parts[2]}-${parts[1]}`;
      } else if (inv.invoice_date.includes('-')) {
        m = inv.invoice_date.substring(0, 7);
      }
    }
    if (!monthlyDataMap[m]) {
      monthlyDataMap[m] = { month: m, billed: 0, collected: 0 };
    }
    monthlyDataMap[m].billed += inv.total || 0;
    monthlyDataMap[m].collected += inv.amount_paid || 0;
  });

  const chartData = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));
  if (chartData.length === 0) {
    chartData.push({ month: currentMonth, billed: totalBilled, collected: totalPaid });
  }

  // Cashflow comparison data for the bar chart
  const cashflowBarData = [
    {
      name: 'Cashflow Flow',
      Inflow: (budgetSummary?.total_income || 0) + (budgetSummary?.previous_remaining || 0),
      Outflow: budgetSummary?.total_expense || 0,
      Savings: budgetSummary?.total_savings || 0,
    },
  ];

  // 1. Expense Breakdown by Tag & Category
  const tagColorPalette = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#64748b', // slate
  ];

  const expensesByTagMap: { [tag: string]: number } = {};
  monthExpenses.forEach((exp) => {
    const t = exp.tag || 'General';
    expensesByTagMap[t] = (expensesByTagMap[t] || 0) + (exp.amount || 0);
  });

  const expenseTagData = Object.entries(expensesByTagMap)
    .map(([name, value], idx) => ({
      name,
      value,
      fill: tagColorPalette[idx % tagColorPalette.length],
    }))
    .sort((a, b) => b.value - a.value);

  const regExpense = budgetSummary?.reg_expense || 0;
  const extExpense = budgetSummary?.ext_expense || 0;
  const expenseCategoryData = [
    { name: 'Regular (Fixed)', value: regExpense, fill: '#3b82f6' },
    { name: 'Extra (Discretionary)', value: extExpense, fill: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const activeExpensePieData = expenseChartMode === 'tag' ? expenseTagData : expenseCategoryData;
  const totalExpenseInChart = activeExpensePieData.reduce((acc, curr) => acc + curr.value, 0);

  // 2. 100% Budget Envelopes: Planned Allocation vs Actual Spend
  const envelopeBarData = allocations.map((alloc) => {
    const planned = alloc.planned_amount || Math.round((budgetSummary?.total_income || 0) * alloc.percentage);
    const actual = alloc.actual_spent || 0;
    return {
      name: alloc.category.replace(' Fund', '').replace(' Assets', ''),
      fullName: alloc.category,
      Planned: planned,
      Actual: actual,
      pct: Math.round(alloc.percentage * 100),
    };
  });

  // 3. Income Streams Distribution
  const incomeStreamsData = [
    { name: 'Freelancing', value: budgetSummary?.freelance || 0, fill: '#3b82f6' },
    { name: 'Returns / Reimb.', value: budgetSummary?.returns || 0, fill: '#10b981' },
    { name: 'External Income', value: budgetSummary?.ext_income || 0, fill: '#8b5cf6' },
    { name: 'Carryover Surplus', value: budgetSummary?.previous_remaining || 0, fill: '#06b6d4' },
    { name: 'Salary', value: budgetSummary?.salary || 0, fill: '#f59e0b' },
  ].filter((d) => d.value > 0);
  const totalIncomeInChart = incomeStreamsData.reduce((acc, curr) => acc + curr.value, 0);

  // 4. Debt Reduction & Amortization
  const debtMovementData = [
    {
      stage: 'Starting Debt',
      amount: budgetSummary?.starting_debt || 0,
      fill: isDark ? '#475569' : '#64748b',
    },
    {
      stage: 'Paid Down',
      amount: budgetSummary?.dept_payment || 0,
      fill: '#10b981',
    },
    {
      stage: 'New Borrowing',
      amount: budgetSummary?.borrow_amount || 0,
      fill: '#f59e0b',
    },
    {
      stage: 'Ending Debt',
      amount: budgetSummary?.ending_debt || 0,
      fill: '#ef4444',
    },
  ];

  const expenseChartConfig: ChartConfig = {
    value: { label: 'Amount' },
    ...activeExpensePieData.reduce(
      (acc, item) => ({ ...acc, [item.name]: { label: item.name, color: item.fill } }),
      {}
    ),
  };

  const envelopeChartConfig: ChartConfig = {
    Planned: { label: 'Planned Limit', color: '#3b82f6' },
    Actual: { label: 'Actual Spent', color: '#f43f5e' },
  };

  const incomeChartConfig: ChartConfig = {
    value: { label: 'Inflow' },
    ...incomeStreamsData.reduce(
      (acc, item) => ({ ...acc, [item.name]: { label: item.name, color: item.fill } }),
      {}
    ),
  };

  const debtChartConfig: ChartConfig = {
    amount: { label: 'Balance' },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Overview Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Overview & Summary
              </span>
              {profile.udyamNumber && (
                <span className="text-[11px] text-slate-400 font-mono">
                  • Udyam: {profile.udyamNumber}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
              Hello, {profile.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Your unified dashboard combining client business billing with personal cashflow, living expense ledgers, and budget allocations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => onNavigate?.('tax')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 h-9"
            >
              <Landmark className="w-3.5 h-3.5 text-slate-500" />
              <span>Tax & Current A/C</span>
            </Button>
            <Button
              onClick={() => onNavigate?.('expenses')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 h-9"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>Log Expense</span>
            </Button>
            <Button
              onClick={onNewInvoice}
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Bill</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Unified KPI Metrics: Business Billing + Personal Finance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Client Receivables (Business) */}
        <Card
          onClick={() => onNavigate?.('invoices')}
          className="hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Client Receivables
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              ₹{formatINR(totalReceivables)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 text-blue-500" />
              <span>{pendingInvoices.length} outstanding bills</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Inflow (Personal) */}
        <Card
          onClick={() => onNavigate?.('income')}
          className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Month Inflow
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₹{formatINR((budgetSummary?.total_income || 0) + (budgetSummary?.previous_remaining || 0))}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Income + carryover
            </p>
          </CardContent>
        </Card>

        {/* Total Outflow (Personal) */}
        <Card
          onClick={() => onNavigate?.('expenses')}
          className="hover:border-rose-300 dark:hover:border-rose-700 transition-all shadow-2xs cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Month Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              ₹{formatINR(budgetSummary?.total_expense || 0)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Fixed & extra spending
            </p>
          </CardContent>
        </Card>

        {/* Net Safe-to-Spend / Overhead */}
        <Card
          onClick={() => onNavigate?.('budget')}
          className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overhead Surplus
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold font-mono ${
                (budgetSummary?.overhead || 0) < 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'
              }`}
            >
              ₹{formatINR(budgetSummary?.remaining || 0)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Carried to next month
            </p>
          </CardContent>
        </Card>

        {/* Ending Debt / Liabilities */}
        <Card
          onClick={() => onNavigate?.('borrow')}
          className="hover:border-red-300 dark:hover:border-red-700 transition-all shadow-2xs cursor-pointer group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Liabilities
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
              ₹{formatINR(budgetSummary?.ending_debt || 0)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Active loan balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoicing & Collections Trend Chart */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm">Invoicing & Collections Trend</CardTitle>
              </div>
              <CardDescription className="text-[11px]">
                Business billing performance across months
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewInvoices}
              className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Invoices
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>

          <CardContent>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                  <XAxis
                    dataKey="month"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={11}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`₹${formatINR(Number(val))}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="billed"
                    name="Invoiced"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBilled)"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPaid)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Billed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Collected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Cashflow Flow Chart */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-sm">Personal Cash Flow Breakdown</CardTitle>
              </div>
              <CardDescription className="text-[11px]">
                Inflow vs Outflow vs Savings for current month
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('budget')}
              className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Budget
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>

          <CardContent>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                  <YAxis
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={11}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`₹${formatINR(Number(val))}`, '']}
                  />
                  <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Total Inflow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Outflow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Savings</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Analytics & Intelligence Suite (shadcn charts) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Financial Analytics & Intelligence
              </h2>
              <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                Interactive Suite
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deep dive into living expenses, 100% budget envelope limits, income streams, and debt amortization.
            </p>
          </div>
        </div>

        {/* 4-Chart Grid (Responsive 1 -> 2 -> 4 cols for ultra-wide) */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-5">
          {/* Chart 1: Expense Breakdown by Tag & Category */}
          <Card className="shadow-2xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-rose-500" />
                  <CardTitle className="text-sm">Expense Breakdown</CardTitle>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    onClick={() => setExpenseChartMode('tag')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      expenseChartMode === 'tag'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    By Tag
                  </button>
                  <button
                    onClick={() => setExpenseChartMode('category')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      expenseChartMode === 'category'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Reg vs Extra
                  </button>
                </div>
              </div>
              <CardDescription className="text-[11px]">
                {expenseChartMode === 'tag'
                  ? 'Spending categorized by merchant tags'
                  : 'Fixed living (Regular) vs Discretionary (Extra)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col justify-between">
              {activeExpensePieData.length > 0 ? (
                <>
                  <div className="relative h-48 w-full flex items-center justify-center">
                    <ChartContainer config={expenseChartConfig} className="h-full w-full">
                      <PieChart>
                        <ChartTooltip
                          content={<ChartTooltipContent hideLabel indicator="dot" />}
                        />
                        <Pie
                          data={activeExpensePieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={2}
                        >
                          {activeExpensePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    {/* Centered Total Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        ₹{formatINR(totalExpenseInChart)}
                      </span>
                    </div>
                  </div>
                  {/* Legend Chips */}
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2 max-h-20 overflow-y-auto pt-1">
                    {activeExpensePieData.map((item) => (
                      <span
                        key={item.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name}: ₹{formatINR(item.value)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No expense records logged this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: 100% Budget Envelopes: Planned vs Actual */}
          <Card className="shadow-2xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-sm">Envelopes: Planned vs Actual</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('budget')}
                  className="h-6 px-1.5 text-[11px] text-blue-600 dark:text-blue-400"
                >
                  Adjust <ArrowRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
              <CardDescription className="text-[11px]">
                Enforced 100% rule limits vs actual spent
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col justify-between">
              {envelopeBarData.length > 0 ? (
                <>
                  <div className="h-48 w-full">
                    <ChartContainer config={envelopeChartConfig} className="h-full w-full">
                      <BarChart data={envelopeBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                        <XAxis
                          dataKey="name"
                          stroke={isDark ? '#64748b' : '#94a3b8'}
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis
                          stroke={isDark ? '#64748b' : '#94a3b8'}
                          fontSize={10}
                          tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                          tickLine={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="Planned" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Actual" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400 text-[11px]">Planned Target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                      <span className="text-slate-600 dark:text-slate-400 text-[11px]">Actual Spent</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No budget envelopes configured
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 3: Income Streams Distribution */}
          <Card className="shadow-2xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <CardTitle className="text-sm">Income Streams</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('income')}
                  className="h-6 px-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
                >
                  Streams <ArrowRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
              <CardDescription className="text-[11px]">
                Distribution of monthly inflows & earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col justify-between">
              {incomeStreamsData.length > 0 ? (
                <>
                  <div className="relative h-48 w-full flex items-center justify-center">
                    <ChartContainer config={incomeChartConfig} className="h-full w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
                        <Pie
                          data={incomeStreamsData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={2}
                        >
                          {incomeStreamsData.map((entry, index) => (
                            <Cell key={`income-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Inflow</span>
                      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{formatINR(totalIncomeInChart)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2 max-h-20 overflow-y-auto pt-1">
                    {incomeStreamsData.map((item) => (
                      <span
                        key={item.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name}: ₹{formatINR(item.value)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No income entries recorded
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 4: Debt Payoff & Liability Amortization */}
          <Card className="shadow-2xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-sm">Debt Trajectory & Payoff</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('borrow')}
                  className="h-6 px-1.5 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  Ledger <ArrowRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
              <CardDescription className="text-[11px]">
                Principal balance, repayments & new obligations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col justify-between">
              <div className="h-48 w-full">
                <ChartContainer config={debtChartConfig} className="h-full w-full">
                  <BarChart data={debtMovementData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                    <XAxis
                      dataKey="stage"
                      stroke={isDark ? '#64748b' : '#94a3b8'}
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={isDark ? '#64748b' : '#94a3b8'}
                      fontSize={10}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {debtMovementData.map((entry, index) => (
                        <Cell key={`debt-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>
                    -₹{formatINR(budgetSummary?.dept_payment || 0)} Paid
                  </span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-medium font-mono">
                  Ending: ₹{formatINR(budgetSummary?.ending_debt || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two-Column Split Command Grid: Client Billing vs Personal Finance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMN 1: Client Billing & Receivables */}
        <div className="space-y-6">
          {/* Client Receivables Card */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Client Outstanding Balances</CardTitle>
                <CardDescription className="text-[11px]">Receivables per client organization</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewOrganizations}
                className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                All Clients
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {organizations.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No organizations recorded yet.</p>
              ) : (
                organizations.map((org) => {
                  const billed = org.total_invoiced || 0;
                  const due = org.balance_due || 0;
                  const percentPaid = billed > 0 ? Math.round(((billed - due) / billed) * 100) : 100;

                  return (
                    <div
                      key={org.id}
                      onClick={() => onSelectOrg?.(org.id)}
                      className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all duration-150 space-y-2 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {org.name}
                        </span>
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400">₹{formatINR(due)}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200/80 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{org.invoices_count || 0} bills</span>
                        <span>Total ₹{formatINR(billed)} ({percentPaid}% paid)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices Card */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Recent Issued Bills</CardTitle>
                <CardDescription className="text-[11px]">Latest invoices generated</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewInvoices}
                className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => onSelectInvoice(inv)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          {inv.status === 'paid' ? (
                            <Badge variant="success" className="text-[9px] px-1.5 py-0">Paid</Badge>
                          ) : (
                            <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Issued</Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[120px]">
                          {inv.organization?.name || 'Unknown'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹{formatINR(inv.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMN 2: Personal Finance & Living Expenses */}
        <div className="space-y-6">
          {/* Budget Envelopes Health */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">100% Budget Envelopes Health</CardTitle>
                <CardDescription className="text-[11px]">Spending limits & targets from template</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('budget')}
                className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                All Envelopes
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {allocations.slice(0, 4).map((alloc) => {
                const planned = alloc.planned_amount || 0;
                const actual = alloc.actual_spent || 0;
                const pct = planned > 0 ? Math.min(Math.round((actual / planned) * 100), 100) : 0;
                return (
                  <div key={alloc.id || alloc.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {alloc.category} ({Math.round(alloc.percentage * 100)}%)
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        ₹{formatINR(actual)} / ₹{formatINR(planned)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct > 80 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Expenses Feed */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Recent Living Expenses</CardTitle>
                <CardDescription className="text-[11px]">Latest daily logs</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('expenses')}
                className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Expense Log
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {recentExpenses.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No expenses logged this month.</p>
                ) : (
                  recentExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      onClick={() => onNavigate?.('expenses')}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            exp.category === 'reg'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {exp.category === 'reg' ? 'Reg' : 'Ext'}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {exp.description}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {exp.date} {exp.tag && `• ${exp.tag}`}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                        ₹{formatINR(exp.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Asset Goals Progress Widget */}
          {goals.length > 0 && (
            <Card
              onClick={() => onNavigate?.('goals')}
              className="hover:border-cyan-300 dark:hover:border-cyan-700 transition-all shadow-2xs cursor-pointer group"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-500" />
                  <CardTitle className="text-sm">Priority Goal: {goals[0].name}</CardTitle>
                </div>
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                  {Math.round((goals[0].saved_amount / goals[0].target_amount) * 100)}%
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        Math.round((goals[0].saved_amount / goals[0].target_amount) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Saved: ₹{formatINR(goals[0].saved_amount)}</span>
                  <span>Target: ₹{formatINR(goals[0].target_amount)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
