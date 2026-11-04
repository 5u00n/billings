import React, { useState } from 'react';
import { FinancialGoal, GoalStatus } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  CreditCard,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';

interface GoalsTrackerViewProps {
  goals: FinancialGoal[];
  onRefresh: () => void;
}

export const GoalsTrackerView: React.FC<GoalsTrackerViewProps> = ({
  goals,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);

  // Form State for Add / Edit Goal
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [savingsPercent, setSavingsPercent] = useState<number | ''>('');
  const [savedAmount, setSavedAmount] = useState<number | ''>('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<GoalStatus>('IN_PROGRESS');
  const [spentAmount, setSpentAmount] = useState<number | ''>('');
  const [completedDate, setCompletedDate] = useState('');
  
  // Contribution State
  const [contributionAmount, setContributionAmount] = useState<number | ''>('');

  // Purchase / Completion State
  const [purchaseGoal, setPurchaseGoal] = useState<FinancialGoal | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('UPI');
  const [logExpense, setLogExpense] = useState(true);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setSavingsPercent('');
    setSavedAmount('');
    setTargetDate('');
    setNotes('');
    setStatus('IN_PROGRESS');
    setSpentAmount('');
    setCompletedDate('');
    setSelectedGoal(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount);
    setSavingsPercent(Math.round(goal.savings_percent * 100));
    setSavedAmount(goal.saved_amount);
    setTargetDate(goal.target_date || '');
    setNotes(goal.notes || '');
    setStatus(goal.status || 'IN_PROGRESS');
    setSpentAmount(goal.spent_amount || '');
    setCompletedDate(goal.completed_date || '');
    setIsModalOpen(true);
  };

  const handleOpenContribute = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setIsContributeModalOpen(true);
  };

  const handleOpenPurchase = (goal: FinancialGoal) => {
    setPurchaseGoal(goal);
    setPurchaseAmount(goal.target_amount || goal.saved_amount || '');
    setPurchaseDate(new Date().toISOString().substring(0, 10));
    setPurchasePaymentMethod('UPI');
    setLogExpense(true);
    setPurchaseNotes(goal.notes || '');
    setIsPurchaseModalOpen(true);
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseGoal || !purchaseAmount || Number(purchaseAmount) <= 0) {
      alert('Please enter a valid amount spent.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/budget/goals/${purchaseGoal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spent_amount: Number(purchaseAmount),
          completed_date: purchaseDate,
          payment_method: purchasePaymentMethod,
          log_expense: logExpense,
          notes: purchaseNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete goal purchase.');
      }

      setIsPurchaseModalOpen(false);
      setPurchaseGoal(null);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to complete goal:', err);
      alert(err.message || 'Failed to complete goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleReopenGoal = async (goal: FinancialGoal) => {
    let deleteExpense = false;
    if (goal.linked_expense_id) {
      deleteExpense = confirm(
        `Reopening "${goal.name}".\n\nThis goal has an associated expense of ₹${formatINR(goal.spent_amount || goal.target_amount)} in your expense ledger.\n\nClick OK to also DELETE the expense entry from your ledger.\nClick Cancel to keep the expense entry.`
      );
    } else {
      if (!confirm(`Reopen "${goal.name}"? It will return to Active (In Progress).`)) {
        return;
      }
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/budget/goals/${goal.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_linked_expense: deleteExpense }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reopen goal.');
      }

      onRefresh();
    } catch (err: any) {
      console.error('Failed to reopen goal:', err);
      alert(err.message || 'Failed to reopen goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) {
      alert('Please enter a goal name and target amount.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: name.trim(),
        target_amount: Number(targetAmount),
        savings_percent: savingsPercent ? Number(savingsPercent) / 100 : 0.05,
        saved_amount: savedAmount ? Number(savedAmount) : 0,
        target_date: targetDate || undefined,
        status,
        spent_amount: status === 'COMPLETED' ? (spentAmount ? Number(spentAmount) : Number(targetAmount)) : 0,
        completed_date: status === 'COMPLETED' ? (completedDate || new Date().toISOString().substring(0, 10)) : undefined,
        notes: notes.trim() || undefined,
      };

      if (selectedGoal) {
        await fetch(`/api/budget/goals/${selectedGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/budget/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error('Failed to save goal:', err);
      alert('Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contributionAmount || Number(contributionAmount) <= 0) return;

    try {
      setSaving(true);
      const newSaved = selectedGoal.saved_amount + Number(contributionAmount);
      const newStatus = newSaved >= selectedGoal.target_amount ? 'REACHED' : 'IN_PROGRESS';

      await fetch(`/api/budget/goals/${selectedGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedGoal,
          saved_amount: newSaved,
          status: newStatus,
        }),
      });

      setIsContributeModalOpen(false);
      setSelectedGoal(null);
      setContributionAmount('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add contribution:', err);
      alert('Failed to update contribution.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to remove this financial goal?')) return;
    try {
      await fetch(`/api/budget/goals/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  // Metrics Calculation
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const activeGoals = goals.filter((g) => g.status !== 'COMPLETED');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  
  // Real active savings in piggy banks (money that still exists as unspent cash)
  const activeSavedPortfolio = activeGoals.reduce((sum, g) => sum + g.saved_amount, 0);
  // Total value of acquired assets (money disbursed/paid to fulfill goals)
  const acquiredAssetsValue = completedGoals.reduce((sum, g) => sum + (g.spent_amount || g.target_amount), 0);

  const inProgressGoals = goals.filter((g) => g.status !== 'COMPLETED');
  const displayedGoals = filterTab === 'IN_PROGRESS'
    ? inProgressGoals
    : filterTab === 'COMPLETED'
    ? completedGoals
    : goals;

  const goalsExportColumns: ExportColumn<FinancialGoal>[] = [
    { header: 'Goal / Milestone', key: 'name', width: 24, align: 'left' },
    {
      header: 'Target Amount',
      key: 'target_amount',
      width: 15,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Saved Amount',
      key: 'saved_amount',
      width: 15,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Progress %',
      key: 'progress',
      width: 12,
      align: 'center',
      format: (_, g) =>
        g.status === 'COMPLETED'
          ? '100%'
          : `${Math.min(100, Math.round(((g.saved_amount || 0) / (g.target_amount || 1)) * 100))}%`,
    },
    {
      header: 'Status',
      key: 'status',
      width: 14,
      align: 'center',
      format: (val) => {
        if (val === 'COMPLETED') return 'Completed & Bought';
        if (val === 'REACHED') return 'Target Reached';
        return 'In Progress';
      },
    },
    {
      header: 'Target Date',
      key: 'target_date',
      width: 14,
      align: 'center',
      format: (val) => val || '-',
    },
    {
      header: 'Completed Date',
      key: 'completed_date',
      width: 14,
      align: 'center',
      format: (val) => val || '-',
    },
    {
      header: 'Notes',
      key: 'notes',
      width: 22,
      align: 'left',
      format: (val) => val || '',
    },
  ];

  const goalsExportOptions = {
    filename: `Financial_Goals_${filterTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`,
    title: 'Financial Goals & Milestones Portfolio',
    subtitle: `Exported ${displayedGoals.length} goals (Tab: ${filterTab})`,
    sheetName: 'Goals',
    columns: goalsExportColumns,
    data: displayedGoals,
    summaryMetrics: [
      { label: 'Total Target', value: formatCurrencyForPdf(totalTarget) },
      { label: 'Active Savings Stash', value: formatCurrencyForPdf(activeSavedPortfolio) },
      { label: 'Acquired Assets (Paid)', value: formatCurrencyForPdf(acquiredAssetsValue) },
      { label: 'Milestones Exported', value: `${displayedGoals.length} of ${goals.length}` },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Progress Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Targets</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 dark:text-white">₹{formatINR(totalTarget)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{goals.length} milestones</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Savings Stash</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{formatINR(activeSavedPortfolio)}</span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
              {activeGoals.length} In Progress
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Unspent cash accumulating in savings</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acquired Assets (Paid)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{formatINR(acquiredAssetsValue)}</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              {completedGoals.length} Acquired
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Disbursed & completed milestones</span>
        </div>

        <div className="flex items-center">
          <Button
            onClick={handleOpenNew}
            className="w-full h-full min-h-[58px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs flex items-center justify-center gap-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Financial Goal
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilterTab('ALL')}
            className={`h-7 px-3 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              filterTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Milestones ({goals.length})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilterTab('IN_PROGRESS')}
            className={`h-7 px-3 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              filterTab === 'IN_PROGRESS'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            In Progress ({activeGoals.length})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilterTab('COMPLETED')}
            className={`h-7 px-3 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              filterTab === 'COMPLETED'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Completed & Bought ({completedGoals.length})
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {displayedGoals.length} of {goals.length} milestones
          </span>
          <ExportActions exportOptions={goalsExportOptions} />
        </div>
      </div>

      {/* Grid of Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {displayedGoals.map((goal) => {
          const isCompleted = goal.status === 'COMPLETED';
          const isReadyToBuy = !isCompleted && (goal.status === 'REACHED' || goal.saved_amount >= goal.target_amount);
          const pct = isCompleted
            ? 100
            : Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100);

          return (
            <div
              key={goal.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs ${
                isCompleted
                  ? 'border-emerald-500/60 dark:border-emerald-600/60 ring-2 ring-emerald-500/20 bg-emerald-50/15 dark:bg-emerald-950/20'
                  : isReadyToBuy
                  ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/20 bg-blue-50/10 dark:bg-blue-950/10'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                          : isReadyToBuy
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isCompleted ? (
                        <PackageCheck className="w-4 h-4" />
                      ) : isReadyToBuy ? (
                        <Sparkles className="w-4 h-4" />
                      ) : (
                        <Target className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{goal.name}</h4>
                      {isCompleted && goal.completed_date ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Acquired: {goal.completed_date}
                        </span>
                      ) : goal.target_date ? (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <Calendar className="w-2.5 h-2.5" />
                          Target: {goal.target_date}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Bought
                    </span>
                  ) : isReadyToBuy ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      Ready
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {Math.round(goal.savings_percent * 100)}% share
                    </span>
                  )}
                </div>

                {/* Amount Figures */}
                <div className="my-4 space-y-1">
                  {isCompleted ? (
                    <>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Paid / Spent:</span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                          ₹{formatINR(goal.spent_amount || goal.target_amount)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400 dark:text-slate-500">Target Value:</span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                          ₹{formatINR(goal.target_amount)}
                        </span>
                      </div>
                      <div className="mt-1 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
                        <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded block text-center">
                          ✓ Money Disbursed • Asset Acquired
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Saved Cash:</span>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          ₹{formatINR(goal.saved_amount)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Target:</span>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                          ₹{formatINR(goal.target_amount)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">
                        {isCompleted ? 'Fulfilled' : 'Progress'}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {isCompleted ? 100 : pct}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isReadyToBuy
                            ? 'bg-blue-600'
                            : pct > 50
                            ? 'bg-indigo-600'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${isCompleted ? 100 : pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {goal.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2 mb-3">
                    {goal.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  {isCompleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReopenGoal(goal)}
                      disabled={saving}
                      className="gap-1 text-[11px] font-semibold h-7.5 px-2.5 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 dark:hover:bg-amber-950/40 transition-colors"
                      title="Reopen milestone as active in-progress"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reopen</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOpenPurchase(goal)}
                        disabled={saving}
                        className={`gap-1 text-[11px] font-bold h-7.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          isReadyToBuy
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                        }`}
                        title="Mark as bought/paid, record purchase details and expense outflow"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isReadyToBuy ? 'Buy Now' : 'Mark Bought'}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenContribute(goal)}
                        className="gap-1 text-[11px] text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold h-7.5 px-2 rounded-lg cursor-pointer"
                        title="Add savings contribution to this goal"
                      >
                        <Plus className="w-3 h-3" />
                        Save
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(goal)}
                    title="Edit Goal"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGoal(goal.id)}
                    title="Delete Goal"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mark as Bought / Complete Milestone Modal */}
      <Dialog
        open={Boolean(isPurchaseModalOpen && purchaseGoal)}
        onOpenChange={(open) => {
          if (!open) setIsPurchaseModalOpen(false);
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-emerald-50/80 dark:bg-emerald-950/60 border-b border-emerald-100 dark:border-emerald-900/60 flex flex-row items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Mark as Bought / Acquired
              </DialogTitle>
              <DialogDescription className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                {purchaseGoal?.name}
              </DialogDescription>
            </div>
          </DialogHeader>

            <form onSubmit={handleConfirmPurchase} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid / Spent (₹)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    required
                    placeholder="0.00"
                    value={purchaseAmount}
                    onChange={(e) =>
                      setPurchaseAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <Select
                  value={purchasePaymentMethod}
                  onValueChange={setPurchasePaymentMethod}
                >
                  <SelectTrigger className="w-full h-8 px-3 py-1.5 text-xs">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer / Net Banking</SelectItem>
                    <SelectItem value="Credit Card">Credit Card (Auto-recorded as Borrow)</SelectItem>
                    <SelectItem value="Slice Borrow">Slice Borrow (Auto-recorded as Borrow)</SelectItem>
                    <SelectItem value="Amazon Borrow">Amazon Borrow (Auto-recorded as Borrow)</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Record in Expense Ledger Checkbox */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logExpense}
                    onChange={(e) => setLogExpense(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Record as Outflow in {purchaseDate ? purchaseDate.substring(0, 7) : 'Current Month'} Expense Ledger
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Deducts this purchase from monthly cash flow under Extra Expenses (tagged <em>Asset Purchase</em>).
                    </span>
                  </div>
                </label>

                {['Credit Card', 'Slice Borrow', 'Amazon Borrow'].includes(purchasePaymentMethod) && logExpense && (
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60">
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>{purchasePaymentMethod} payment will also be auto-recorded under Loans & Debts.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Receipt / Warranty Info (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Purchased at Croma, Bill #4928"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {saving ? 'Processing...' : 'Confirm Purchase & Complete Goal'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Goal Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
              {selectedGoal ? 'Edit Financial Goal' : 'New Financial Goal'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set target amount, savings priority, and deadline for your financial milestone.
            </DialogDescription>
          </DialogHeader>

            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Goal Name / Asset
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Dad GPU, iPad Pro, Touring Bike, Land"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Amount (₹)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    required
                    placeholder="0.00"
                    value={targetAmount}
                    onChange={(e) =>
                      setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Saved in Stash (₹)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="0.00"
                    value={savedAmount}
                    onChange={(e) =>
                      setSavedAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Allocation %
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    placeholder="e.g. 15 for 15%"
                    value={savingsPercent}
                    onChange={(e) =>
                      setSavingsPercent(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Milestone Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStatus('IN_PROGRESS')}
                    className={`h-auto py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'IN_PROGRESS' || status === 'REACHED'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>In Progress (Active)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStatus('COMPLETED');
                      if (targetAmount && (!spentAmount || Number(spentAmount) <= 0)) {
                        setSpentAmount(targetAmount);
                      }
                      if (!completedDate) {
                        setCompletedDate(new Date().toISOString().substring(0, 10));
                      }
                    }}
                    className={`h-auto py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === 'COMPLETED'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed & Bought</span>
                  </Button>
                </div>
              </div>

              {status === 'COMPLETED' && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Spent / Paid (₹)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={spentAmount}
                      onChange={(e) => setSpentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="h-8 text-xs font-bold border-emerald-300 dark:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date Acquired
                    </label>
                    <Input
                      type="date"
                      value={completedDate}
                      onChange={(e) => setCompletedDate(e.target.value)}
                      className="h-8 text-xs border-emerald-300 dark:border-emerald-700"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Details
                </label>
                <Input
                  type="text"
                  placeholder="Specs, priority or merchant notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : selectedGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Add Contribution Modal */}
      <Dialog
        open={Boolean(isContributeModalOpen && selectedGoal)}
        onOpenChange={(open) => {
          if (!open) setIsContributeModalOpen(false);
        }}
      >
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">Add Contribution</DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400">{selectedGoal?.name}</DialogDescription>
          </DialogHeader>

            <form onSubmit={handleAddContribution} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contribution Amount (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="e.g. 5000"
                  value={contributionAmount}
                  onChange={(e) =>
                    setContributionAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="h-10 text-base font-bold"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Current Saved:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{formatINR(selectedGoal?.saved_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>After Contribution:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{formatINR((selectedGoal?.saved_amount || 0) + (Number(contributionAmount) || 0))}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContributeModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Adding...' : 'Confirm Contribution'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
