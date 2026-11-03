import React, { useState, useEffect } from 'react';
import { formatINR } from '../../utils/numberToWords';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Edit2, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface BudgetPacingBarProps {
  currentMonth: string;
  totalSpent: number;
  regSpent?: number;
  extSpent?: number;
  className?: string;
  onRefresh?: () => void;
}

export const BudgetPacingBar: React.FC<BudgetPacingBarProps> = ({
  currentMonth,
  totalSpent,
  regSpent = 0,
  extSpent = 0,
  className = '',
  onRefresh,
}) => {
  const [targetBudget, setTargetBudget] = useState<number>(30000);
  const [regBudget, setRegBudget] = useState<number>(20000);
  const [extBudget, setExtBudget] = useState<number>(10000);
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState<string>('30000');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBudgetLimit();
  }, [currentMonth]);

  const fetchBudgetLimit = async () => {
    if (!currentMonth || currentMonth === 'all') return;
    try {
      const res = await fetch(`/api/budget/limits?month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        const tot = Number(data.total_budget) || 30000;
        setTargetBudget(tot);
        setRegBudget(Number(data.regular_budget) || Math.round(tot * 0.67));
        setExtBudget(Number(data.extra_budget) || Math.round(tot * 0.33));
        setEditAmount(String(tot));
      }
    } catch (err) {
      console.warn('Failed to fetch budget limit, using default:', err);
    }
  };

  const handleSaveBudget = async () => {
    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) return;
    setLoading(true);
    try {
      const reg = Math.round(num * 0.67);
      const ext = Math.round(num * 0.33);
      await fetch('/api/budget/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          total_budget: num,
          regular_budget: reg,
          extra_budget: ext,
        }),
      });
      setTargetBudget(num);
      setRegBudget(reg);
      setExtBudget(ext);
      setIsEditing(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save budget limit:', err);
    } finally {
      setLoading(false);
    }
  };

  // Date calculations for daily pace
  const now = new Date();
  let daysInMonth = 30;
  let currentDay = now.getDate();
  let daysRemaining = 1;

  if (currentMonth && currentMonth !== 'all' && currentMonth.includes('-')) {
    const [year, month] = currentMonth.split('-').map(Number);
    daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentActiveMonth =
      now.getFullYear() === year && now.getMonth() + 1 === month;
    if (isCurrentActiveMonth) {
      currentDay = now.getDate();
      daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
    } else {
      currentDay = daysInMonth;
      daysRemaining = 1;
    }
  }

  const percentUsed = targetBudget > 0 ? Math.round((totalSpent / targetBudget) * 100) : 0;
  const remainingBudget = targetBudget - totalSpent;
  const dailyAllowance = Math.max(0, Math.round(remainingBudget / daysRemaining));
  const isOverBudget = remainingBudget < 0;

  // Status colors & labels
  let statusBadgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  let statusText = 'On Track';
  let progressColor = 'from-emerald-500 to-teal-500';

  if (percentUsed >= 100) {
    statusBadgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800';
    statusText = `Over Limit by ₹${formatINR(Math.abs(remainingBudget))}`;
    progressColor = 'from-rose-500 to-red-600';
  } else if (percentUsed >= 80) {
    statusBadgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    statusText = 'Approaching Limit';
    progressColor = 'from-amber-500 to-orange-500';
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Monthly Spending Budget
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
                {statusText}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Target for {currentMonth || 'current month'} • Recommended limit based on cashflow
            </p>
          </div>
        </div>

        {/* Budget Target & Quick Edit */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-28 pl-6 pr-2 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="30000"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={loading}
                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                title="Save limit"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditAmount(String(targetBudget));
                }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Budget Limit</span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  ₹{formatINR(targetBudget)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit Budget Limit"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & Indicators */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Spent:</span>
            <span className="font-bold text-slate-900 dark:text-white">₹{formatINR(totalSpent)}</span>
            <span className="text-[11px] text-slate-400">({percentUsed}%)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">
              {isOverBudget ? 'Over Budget:' : 'Remaining Allowance:'}
            </span>
            <span className={`font-bold ${isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ₹{formatINR(Math.abs(remainingBudget))}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-500`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>

        {/* Footer Metrics: Daily Allowance & Split */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Regular (Fixed): <strong className="text-slate-700 dark:text-slate-300">₹{formatINR(regSpent)}</strong>
            </span>
            <span>•</span>
            <span>
              Extra (Discretionary): <strong className="text-slate-700 dark:text-slate-300">₹{formatINR(extSpent)}</strong>
            </span>
          </div>

          {!isOverBudget && (
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
              <Sparkles className="w-3 h-3" />
              <span>Safe Daily Burn: <strong>₹{formatINR(dailyAllowance)}/day</strong> ({daysRemaining} days left)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

