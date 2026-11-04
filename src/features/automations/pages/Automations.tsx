import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Calendar,
  Repeat,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  DollarSign,
  AlertCircle,
  X,
  Layers,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatINR } from '@/utils/numberToWords';
import {
  RecurringSchedule,
  Organization,
  DocType,
  ScheduleType,
  MilestoneItem,
  LineItem,
  Invoice,
} from '@/types';

interface AutomationsProps {
  organizations: Organization[];
  onViewInvoice: (invoiceId: string) => void;
  onRefreshInvoices: () => void;
}

export const Automations: React.FC<AutomationsProps> = ({
  organizations,
  onViewInvoice,
  onRefreshInvoices,
}) => {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [runningDue, setRunningDue] = useState(false);
  const [runResult, setRunResult] = useState<{ count: number; invoices: string[] } | null>(null);

  // Modal Form State
  const [scheduleType, setScheduleType] = useState<ScheduleType>('MONTHLY_SUBSCRIPTION');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [docType, setDocType] = useState<DocType>('BILL OF SUPPLY');
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [terms, setTerms] = useState('Due on Receipt');
  const [notes, setNotes] = useState('Automated recurring bill.');

  // For Monthly Subscription line items
  const [items, setItems] = useState<LineItem[]>([
    { id: 'item-1', description: 'Monthly Retainer & Support', qty: 1, rate: 10000, amount: 10000 },
  ]);

  // For Milestone List
  const [totalAmount, setTotalAmount] = useState<string>('60000');
  const [milestones, setMilestones] = useState<MilestoneItem[]>([
    { id: 'm-1', date: new Date().toISOString().split('T')[0], amount: 20000, description: 'Phase 1 - Kickoff' },
    {
      id: 'm-2',
      date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      amount: 20000,
      description: 'Phase 2 - Deliverables',
    },
    {
      id: 'm-3',
      date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      amount: 20000,
      description: 'Phase 3 - Final Signoff',
    },
  ]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/recurring');
      const data = await res.json();
      setSchedules(data || []);
    } catch (e) {
      console.error('Failed to load recurring schedules:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDue = async () => {
    try {
      setRunningDue(true);
      const res = await fetch('/api/recurring/run-due', { method: 'POST' });
      const data = await res.json();
      setRunResult({ count: data.generatedCount || 0, invoices: data.generatedInvoices || [] });
      await fetchSchedules();
      onRefreshInvoices();
    } catch (e) {
      console.error('Failed to run due schedules:', e);
    } finally {
      setRunningDue(false);
    }
  };

  const handleToggleStatus = async (schedule: RecurringSchedule) => {
    const newStatus = schedule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await fetch(`/api/recurring/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, status: newStatus }),
      });
      await fetchSchedules();
    } catch (e) {
      console.error('Failed to update schedule status:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing automation?')) return;
    try {
      await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
      await fetchSchedules();
    } catch (e) {
      console.error('Failed to delete schedule:', e);
    }
  };

  // 1-Click Divide Total Evenly Across Milestone Dates
  const handleDivideTotalEvenly = () => {
    const tot = parseFloat(totalAmount) || 0;
    if (tot <= 0 || milestones.length === 0) return;
    const split = Math.round((tot / milestones.length) * 100) / 100;
    let remainder = Math.round((tot - split * (milestones.length - 1)) * 100) / 100;

    setMilestones((prev) =>
      prev.map((m, idx) => ({
        ...m,
        amount: idx === prev.length - 1 ? remainder : split,
      }))
    );
  };

  const handleAddMilestone = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (milestones.length + 1) * 30);
    setMilestones((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        date: nextDate.toISOString().split('T')[0],
        amount: 0,
        description: `Installment ${prev.length + 1}`,
      },
    ]);
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a schedule name.');
      return;
    }
    if (!orgId) {
      alert('Please select a client organization.');
      return;
    }

    try {
      const payload: any = {
        name,
        organization_id: orgId,
        schedule_type: scheduleType,
        doc_type: docType,
        terms,
        notes,
        status: 'ACTIVE',
      };

      if (scheduleType === 'MONTHLY_SUBSCRIPTION') {
        payload.monthly_day = Number(monthlyDay);
        payload.items = items;
      } else {
        payload.total_amount = parseFloat(totalAmount) || 0;
        payload.milestones = milestones;
      }

      await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      resetForm();
      await fetchSchedules();
      onRefreshInvoices();
    } catch (err) {
      console.error('Failed to create schedule:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setOrgId('');
    setScheduleType('MONTHLY_SUBSCRIPTION');
    setMonthlyDay(1);
    setTotalAmount('60000');
    setItems([{ id: 'item-1', description: 'Monthly Retainer & Support', qty: 1, rate: 10000, amount: 10000 }]);
  };

  const activeCount = schedules.filter((s) => s.status === 'ACTIVE').length;
  const milestoneCount = schedules.filter((s) => s.schedule_type === 'MILESTONE_LIST').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Billing Automations
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60 font-semibold"
            >
              Auto-Runner Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Auto-generate recurring monthly retainers and scheduled project milestone bills on their due dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunDue}
            disabled={runningDue}
            className="gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
          >
            <Play className={`w-3.5 h-3.5 ${runningDue ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>{runningDue ? 'Checking...' : 'Check & Run Due Now'}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Automation</span>
          </Button>
        </div>
      </div>

      {/* Alert toast for run result */}
      {runResult && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {runResult.count > 0
                ? `Successfully generated ${runResult.count} bill(s): ${runResult.invoices.join(', ')}`
                : 'All automated billing schedules are up to date. No pending bills due today.'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRunResult(null)}
            className="h-6 w-6 text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-200 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Active Automations */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Automations
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {activeCount} {activeCount === 1 ? 'Schedule' : 'Schedules'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Live recurring routines</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
              <Repeat className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Milestone Plans */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Milestone Plans
              </p>
              <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
                {milestoneCount} {milestoneCount === 1 ? 'Project' : 'Projects'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Phased milestone deliveries</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/60">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Auto-Generation Status */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Auto-Generation
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                Self-Executing
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Triggered on target dates</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedules List */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Active Billing Schedules
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Bills are generated with the next sequential invoice number when their due date arrives
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
              Loading automations...
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
                <Repeat className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No billing automations created yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Create a recurring monthly subscription or upload a list of milestone dates to auto-generate bills.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
              >
                Create Your First Automation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {schedules.map((schedule) => {
                const isMonthly = schedule.schedule_type === 'MONTHLY_SUBSCRIPTION';
                const monthlyTotal = isMonthly
                  ? schedule.items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)
                  : schedule.total_amount || 0;

                const generatedMilestones = !isMonthly
                  ? (schedule.milestones || []).filter((m) => Boolean(m.invoiceId))
                  : [];

                return (
                  <div
                    key={schedule.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {schedule.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            isMonthly
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60'
                          }`}
                        >
                          {isMonthly ? 'Monthly Subscription' : 'Milestone Schedule'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            schedule.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                              : schedule.status === 'PAUSED'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {schedule.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{schedule.org_name || 'Client Organization'}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Doc Type: <strong className="text-slate-700 dark:text-slate-200">{schedule.doc_type}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Amount: <strong className="text-slate-900 dark:text-white font-mono">₹{formatINR(monthlyTotal)}</strong>
                        </span>
                      </div>

                      {/* Schedule info row */}
                      <div className="pt-0.5 flex items-center gap-3 text-xs">
                        {isMonthly ? (
                          <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                            <span>Runs on <strong>Day {schedule.monthly_day || 1}</strong> of each month</span>
                            {schedule.next_run_date && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                (Next: {schedule.next_run_date})
                              </span>
                            )}
                          </span>
                        ) : (
                          <div className="space-y-1.5 w-full max-w-2xl">
                            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 flex-wrap">
                              <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                              <span>
                                Milestones: <strong>{generatedMilestones.length} of {schedule.milestones?.length || 0} bills generated</strong>
                              </span>
                              {schedule.next_run_date && (
                                <span className="text-purple-600 dark:text-purple-400 font-medium">
                                  (Next due: {schedule.next_run_date})
                                </span>
                              )}
                            </span>
                            {/* Milestone Pills */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {(schedule.milestones || []).map((m, idx) => (
                                <span
                                  key={m.id || idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                    m.invoiceId
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <span>{m.invoiceId ? '✓' : '○'}</span>
                                  <span>{m.date}</span>
                                  <span className="text-slate-400 dark:text-slate-500">·</span>
                                  <span>₹{formatINR(m.amount)}</span>
                                  {m.invoiceNumber && (
                                    <Button
                                      variant="link"
                                      onClick={() => m.invoiceId && onViewInvoice(m.invoiceId)}
                                      className="p-0 h-auto text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 font-bold ml-0.5 text-[10px]"
                                    >
                                      {m.invoiceNumber}
                                    </Button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(schedule)}
                        className="gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
                      >
                        {schedule.status === 'ACTIVE' ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Resume</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(schedule.id)}
                        className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete automation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Automation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                <Zap className="w-4 h-4" />
              </div>
              <span>Create Billing Automation</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Set up automated bill generation triggered on recurring monthly dates or milestone deadlines
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
              <Button
                type="button"
                variant={scheduleType === 'MONTHLY_SUBSCRIPTION' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setScheduleType('MONTHLY_SUBSCRIPTION')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  scheduleType === 'MONTHLY_SUBSCRIPTION'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Monthly Subscription</span>
              </Button>
              <Button
                type="button"
                variant={scheduleType === 'MILESTONE_LIST' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setScheduleType('MILESTONE_LIST')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  scheduleType === 'MILESTONE_LIST'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Scheduled Dates & Milestones</span>
              </Button>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Organization *
                </label>
                <Select value={orgId} onValueChange={(val) => setOrgId(val)}>
                  <SelectTrigger className="w-full h-9 text-xs font-semibold bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue placeholder="-- Select Client --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id} className="cursor-pointer">
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Automation Title *
                </label>
                <Input
                  type="text"
                  required
                  placeholder={
                    scheduleType === 'MONTHLY_SUBSCRIPTION'
                      ? 'e.g. Monthly Retainer / Maintenance'
                      : 'e.g. 3-Stage Website Contract'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Type
                </label>
                <Select value={docType} onValueChange={(val) => setDocType(val as DocType)}>
                  <SelectTrigger className="w-full h-9 text-xs bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Select Doc Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="BILL OF SUPPLY">BILL OF SUPPLY</SelectItem>
                    <SelectItem value="INVOICE">INVOICE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleType === 'MONTHLY_SUBSCRIPTION' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Day of Month (1-31)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10) || 1)}
                    className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Project / Contract Amount (₹)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 60000"
                    className="font-mono bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Mode Specific: Monthly Items vs Milestone Dates */}
            {scheduleType === 'MONTHLY_SUBSCRIPTION' ? (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Monthly Recurring Service Item
                  </label>
                </div>
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-2">
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => prev.map((i, pIdx) => (pIdx === idx ? { ...i, description: val } : i)));
                        }}
                        placeholder="Service description..."
                        className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItems((prev) =>
                            prev.map((i, pIdx) => (pIdx === idx ? { ...i, rate: val, amount: val * i.qty } : i))
                          );
                        }}
                        placeholder="Monthly Rate (₹)"
                        className="font-mono bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Scheduled Milestones with 1-Click Auto-Division */
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Target Dates & Installment Amounts
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleDivideTotalEvenly}
                      className="text-[11px] font-bold h-7 gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-900/60 shadow-2xs"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Divide Total Evenly Across Dates</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddMilestone}
                      className="text-[11px] font-semibold h-7 gap-1 border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Date</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 w-5">
                          #{idx + 1}
                        </span>
                        <Input
                          type="date"
                          value={m.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMilestones((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, date: val } : item))
                            );
                          }}
                          className="h-8 px-2 text-xs font-mono w-34 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                      <Input
                        type="text"
                        value={m.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMilestones((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                          );
                        }}
                        placeholder="Milestone description..."
                        className="flex-1 h-8 px-2 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          value={m.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMilestones((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          placeholder="Amount (₹)"
                          className="w-28 h-8 px-2 text-xs font-mono text-right font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMilestone(idx)}
                          disabled={milestones.length <= 1}
                          className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/50 rounded-xl text-xs flex justify-between text-purple-900 dark:text-purple-300 font-semibold">
                  <span>Sum of Milestones:</span>
                  <span className="font-mono">
                    ₹{formatINR(milestones.reduce((acc, m) => acc + (Number(m.amount) || 0), 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
              >
                Save & Enable Automation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
