import React, { useState, useEffect } from 'react';
import {
  Sparkles,
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatINR } from '../utils/numberToWords';
import {
  RecurringSchedule,
  Organization,
  DocType,
  ScheduleType,
  MilestoneItem,
  LineItem,
  Invoice,
} from '../types';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing Automations</h1>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-semibold">
              Auto-Runner Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auto-generate recurring monthly retainers and scheduled project milestone bills on their due dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunDue}
            disabled={runningDue}
            className="gap-1.5 text-xs font-semibold"
          >
            <Play className={`w-3.5 h-3.5 ${runningDue ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
            {runningDue ? 'Checking...' : 'Check & Run Due Now'}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Automation
          </Button>
        </div>
      </div>

      {/* Alert toast for run result */}
      {runResult && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {runResult.count > 0
                ? `Successfully generated ${runResult.count} bill(s): ${runResult.invoices.join(', ')}`
                : 'All automated billing schedules are up to date. No pending bills due today.'}
            </span>
          </div>
          <button onClick={() => setRunResult(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Active Automations</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{activeCount} Schedules</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Milestone Plans</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{milestoneCount} Projects</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Auto-Generation</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">Automated on Date</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedules List */}
      <Card className="shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Active Billing Schedules</CardTitle>
            <CardDescription className="text-xs">
              Bills are generated with the next sequential number when their date arrives
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading automations...</div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Repeat className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No billing automations created yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create a recurring monthly subscription or upload a list of milestone dates to auto-generate bills.
              </p>
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Your First Automation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {schedules.map((schedule) => {
                const isMonthly = schedule.schedule_type === 'MONTHLY_SUBSCRIPTION';
                const monthlyTotal = isMonthly
                  ? schedule.items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)
                  : schedule.total_amount || 0;

                const generatedMilestones = !isMonthly
                  ? (schedule.milestones || []).filter((m) => Boolean(m.invoiceId))
                  : [];

                return (
                  <div key={schedule.id} className="p-4.5 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{schedule.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            isMonthly
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {isMonthly ? 'Monthly Subscription' : 'Milestone Schedule'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            schedule.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : schedule.status === 'PAUSED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {schedule.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {schedule.org_name || 'Client Organization'}
                        </span>
                        <span>•</span>
                        <span>Doc Type: <strong className="text-slate-700">{schedule.doc_type}</strong></span>
                        <span>•</span>
                        <span>Amount: <strong className="text-slate-900 font-mono">₹{formatINR(monthlyTotal)}</strong></span>
                      </div>

                      {/* Schedule info row */}
                      <div className="pt-1 flex items-center gap-3 text-xs">
                        {isMonthly ? (
                          <span className="text-slate-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            Runs on <strong>Day {schedule.monthly_day || 1}</strong> of each month
                            {schedule.next_run_date && (
                              <span className="text-blue-600 ml-1 font-medium">
                                (Next: {schedule.next_run_date})
                              </span>
                            )}
                          </span>
                        ) : (
                          <div className="space-y-1 w-full max-w-lg">
                            <span className="text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-purple-500" />
                              Milestones: <strong>{generatedMilestones.length} of {schedule.milestones?.length || 0} bills generated</strong>
                              {schedule.next_run_date && (
                                <span className="text-purple-600 ml-1 font-medium">
                                  (Next due: {schedule.next_run_date})
                                </span>
                              )}
                            </span>
                            {/* Milestone Pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(schedule.milestones || []).map((m, idx) => (
                                <span
                                  key={m.id || idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                    m.invoiceId
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {m.invoiceId ? '✓' : '○'} {m.date} (₹{formatINR(m.amount)})
                                  {m.invoiceNumber && (
                                    <button
                                      onClick={() => m.invoiceId && onViewInvoice(m.invoiceId)}
                                      className="underline hover:text-emerald-900 font-bold ml-0.5"
                                    >
                                      {m.invoiceNumber}
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(schedule)}
                        className="gap-1 text-xs"
                      >
                        {schedule.status === 'ACTIVE' ? (
                          <>
                            <Pause className="w-3 h-3 text-amber-600" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 text-emerald-600" />
                            Resume
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(schedule.id)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Billing Automation</h3>
                <p className="text-xs text-slate-400">Set up automatic bill generation on specific dates</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setScheduleType('MONTHLY_SUBSCRIPTION')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    scheduleType === 'MONTHLY_SUBSCRIPTION'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Monthly Subscription
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('MILESTONE_LIST')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    scheduleType === 'MILESTONE_LIST'
                      ? 'bg-white text-purple-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Scheduled Dates & Milestones
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Organization *
                  </label>
                  <select
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  >
                    <option value="">-- Select Client --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocType)}
                    className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="BILL OF SUPPLY">BILL OF SUPPLY</option>
                    <option value="INVOICE">INVOICE</option>
                  </select>
                </div>

                {scheduleType === 'MONTHLY_SUBSCRIPTION' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billing Day of Month (1-31)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={monthlyDay}
                      onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Project / Contract Amount (₹)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="e.g. 60000"
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Mode Specific: Monthly Items vs Milestone Dates */}
              {scheduleType === 'MONTHLY_SUBSCRIPTION' ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
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
                          className="font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Scheduled Milestones with 1-Click Auto-Division */
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Target Dates & Installment Amounts
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleDivideTotalEvenly}
                        className="text-[11px] font-bold h-7 gap-1 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
                      >
                        <Sparkles className="w-3 h-3" />
                        Divide Total Evenly Across Dates
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddMilestone}
                        className="text-[11px] font-semibold h-7 gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Date
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {milestones.map((m, idx) => (
                      <div key={m.id || idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                        <input
                          type="date"
                          value={m.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMilestones((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, date: val } : item))
                            );
                          }}
                          className="h-8 px-2 text-xs border border-slate-200 rounded bg-white font-mono"
                        />
                        <input
                          type="text"
                          value={m.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMilestones((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                            );
                          }}
                          placeholder="Milestone description..."
                          className="flex-1 h-8 px-2 text-xs border border-slate-200 rounded bg-white"
                        />
                        <input
                          type="number"
                          value={m.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMilestones((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          placeholder="Amount (₹)"
                          className="w-28 h-8 px-2 text-xs border border-slate-200 rounded bg-white font-mono text-right font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(idx)}
                          disabled={milestones.length <= 1}
                          className="text-slate-400 hover:text-rose-600 p-1 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-2 bg-purple-50/50 rounded-lg text-xs flex justify-between text-purple-900 font-semibold">
                    <span>Sum of Milestones:</span>
                    <span className="font-mono">
                      ₹{formatINR(milestones.reduce((acc, m) => acc + (Number(m.amount) || 0), 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save & Enable Automation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
