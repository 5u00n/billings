import React from 'react';
import { Invoice, MonthlyBudgetSummary } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import {
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Landmark,
} from 'lucide-react';
import { NavTab } from '@/components/layout/Sidebar';
import { KpiMetricCard } from './kpi-metric-card';

export interface KpiMetricsCardsProps {
  totalReceivables?: number;
  pendingInvoicesCount?: number;
  invoices?: Invoice[];
  budgetSummary: MonthlyBudgetSummary | null;
  onNavigate?: (tab: NavTab) => void;
  className?: string;
}

export const KpiMetricsCards: React.FC<KpiMetricsCardsProps> = ({
  totalReceivables,
  pendingInvoicesCount,
  invoices,
  budgetSummary,
  onNavigate,
  className = '',
}) => {
  const calculatedReceivables =
    totalReceivables !== undefined
      ? totalReceivables
      : (invoices || []).reduce((acc, inv) => acc + (inv.balance_due || 0), 0);

  const calculatedPendingCount =
    pendingInvoicesCount !== undefined
      ? pendingInvoicesCount
      : (invoices || []).filter((i) => (i.balance_due || 0) > 0).length;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {/* Client Receivables (Business) */}
      <KpiMetricCard
        title="Client Receivables"
        value={`₹${formatINR(calculatedReceivables)}`}
        valueClassName="text-blue-600 dark:text-blue-400"
        icon={<Clock className="w-3.5 h-3.5" />}
        iconContainerClassName="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
        subtitle={
          <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-3 h-3 text-blue-500" />
            <span>{calculatedPendingCount} outstanding bills</span>
          </span>
        }
        spotlightColor="rgba(59, 130, 246, 0.15)"
        hoverBorderClassName="hover:border-blue-300 dark:hover:border-blue-700"
        onClick={() => onNavigate?.('invoices')}
      />

      {/* Total Inflow (Personal) */}
      <KpiMetricCard
        title="Month Inflow"
        value={`₹${formatINR((budgetSummary?.total_income || 0) + (budgetSummary?.previous_remaining || 0))}`}
        valueClassName="text-emerald-600 dark:text-emerald-400"
        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
        iconContainerClassName="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
        subtitle="Income + carryover"
        spotlightColor="rgba(16, 185, 129, 0.15)"
        hoverBorderClassName="hover:border-emerald-300 dark:hover:border-emerald-700"
        onClick={() => onNavigate?.('income')}
      />

      {/* Total Outflow (Personal) */}
      <KpiMetricCard
        title="Month Expenses"
        value={`₹${formatINR(budgetSummary?.total_expense || 0)}`}
        valueClassName="text-rose-600 dark:text-rose-400"
        icon={<ArrowDownRight className="w-3.5 h-3.5" />}
        iconContainerClassName="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
        subtitle="Fixed & extra spending"
        spotlightColor="rgba(244, 63, 94, 0.15)"
        hoverBorderClassName="hover:border-rose-300 dark:hover:border-rose-700"
        onClick={() => onNavigate?.('expenses')}
      />

      {/* Net Safe-to-Spend / Overhead */}
      <KpiMetricCard
        title="Overhead Surplus"
        value={`₹${formatINR(budgetSummary?.remaining || 0)}`}
        valueClassName={
          (budgetSummary?.overhead || 0) < 0
            ? 'text-amber-600'
            : 'text-slate-900 dark:text-white'
        }
        icon={<Wallet className="w-3.5 h-3.5" />}
        iconContainerClassName="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
        subtitle="Carried to next month"
        spotlightColor="rgba(99, 102, 241, 0.15)"
        hoverBorderClassName="hover:border-indigo-300 dark:hover:border-indigo-700"
        onClick={() => onNavigate?.('budget')}
      />

      {/* Ending Debt / Liabilities */}
      <KpiMetricCard
        title="Total Liabilities"
        value={`₹${formatINR(budgetSummary?.ending_debt || 0)}`}
        valueClassName="text-red-600 dark:text-red-400"
        icon={<Landmark className="w-3.5 h-3.5" />}
        iconContainerClassName="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
        subtitle="Active loan balance"
        spotlightColor="rgba(239, 68, 68, 0.15)"
        hoverBorderClassName="hover:border-red-300 dark:hover:border-red-700"
        onClick={() => onNavigate?.('borrow')}
      />
    </div>
  );
};

export default KpiMetricsCards;
