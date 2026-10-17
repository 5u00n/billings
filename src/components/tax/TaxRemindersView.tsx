import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  AlertTriangle,
  Download,
  Trash2,
  ExternalLink,
  Flame,
  ShieldCheck,
  Check,
  BellRing,
  Volume2,
} from 'lucide-react';
import { TaxReminder, TaxReminderCategory, TaxReminderPriority } from '../../types';
import { Button } from '../ui/button';

interface TaxRemindersViewProps {
  reminders: TaxReminder[];
  onRefresh: () => void;
}

export const TaxRemindersView: React.FC<TaxRemindersViewProps> = ({ reminders, onRefresh }) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'COMPLETED' | 'ALL'>('UPCOMING');

  // New Reminder Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<TaxReminderCategory>('CUSTOM');
  const [priority, setPriority] = useState<TaxReminderPriority>('HIGH');
  const [penaltyNote, setPenaltyNote] = useState('');
  const [actionUrl, setActionUrl] = useState('');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      new Notification('🔔 Indian Tax Compliance Reminders Activated', {
        body: 'You will receive reminders for Advance Tax, ITR Filing, and SBI AIS audits before statutory deadlines.',
        icon: '/favicon.ico',
      });
    }
  };

  const sendTestNotification = () => {
    if (notificationPermission !== 'granted') {
      requestNotificationPermission();
      return;
    }
    new Notification('⚠️ Tax Reminder: Advance Tax Deadline Alert', {
      body: 'Section 44ADA 100% tax liability due by 15th March. Check your portal calculations to avoid 234C interest.',
      icon: '/favicon.ico',
    });
  };

  const handleToggleComplete = async (reminder: TaxReminder) => {
    try {
      await fetch(`/api/tax/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !reminder.is_completed }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle reminder status:', err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await fetch(`/api/tax/reminders/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
      alert('Please fill in title and due date.');
      return;
    }

    try {
      await fetch('/api/tax/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          due_date: dueDate,
          category,
          priority,
          penalty_note: penaltyNote,
          action_url: actionUrl,
        }),
      });

      // Reset
      setTitle('');
      setDescription('');
      setDueDate('');
      setCategory('CUSTOM');
      setPriority('HIGH');
      setPenaltyNote('');
      setActionUrl('');
      setIsAddingReminder(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add reminder:', err);
    }
  };

  // Export to iCalendar (.ics format for Google Calendar / Apple Calendar)
  const exportToICalendar = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Billings App//Indian Tax Reminders//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    reminders.forEach((r) => {
      const cleanDate = r.due_date.replace(/-/g, '');
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${r.id}@billings.local`);
      icsContent.push(`DTSTAMP:${cleanDate}T090000Z`);
      icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      icsContent.push(`SUMMARY:${r.title}`);
      icsContent.push(
        `DESCRIPTION:${r.description || ''} ${r.penalty_note ? `[Penalty: ${r.penalty_note}]` : ''}`
      );
      if (r.action_url) icsContent.push(`URL:${r.action_url}`);
      icsContent.push('BEGIN:VALARM');
      icsContent.push('TRIGGER:-P3D'); // 3 days before
      icsContent.push('ACTION:DISPLAY');
      icsContent.push(`DESCRIPTION:Reminder: ${r.title}`);
      icsContent.push('END:VALARM');
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Indian_Tax_Deadlines_${new Date().getFullYear()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredReminders = reminders.filter((r) => {
    if (activeTab === 'UPCOMING') return !r.is_completed;
    if (activeTab === 'COMPLETED') return r.is_completed;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Automated Notification Banner */}
      <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Automated Statutory Compliance Notifications
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Receive browser alerts for Advance Tax installments, ITR filing deadlines, and Jharkhand Professional Tax.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {notificationPermission !== 'granted' ? (
            <Button
              onClick={requestNotificationPermission}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Enable Push Alerts
            </Button>
          ) : (
            <Button
              onClick={sendTestNotification}
              variant="outline"
              size="sm"
              className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              Test Sound Alert
            </Button>
          )}

          <Button
            onClick={exportToICalendar}
            variant="outline"
            size="sm"
            className="text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Sync to Phone / iCal
          </Button>

          <Button
            onClick={() => setIsAddingReminder(true)}
            size="sm"
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Custom Reminder
          </Button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'UPCOMING', label: 'Upcoming Deadlines' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'ALL', label: 'All Statutory Dates' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredReminders.length} items
        </span>
      </div>

      {/* Reminders List */}
      <div className="grid gap-3">
        {filteredReminders.map((r) => {
          const isOverdue = !r.is_completed && new Date(r.due_date) < new Date();

          return (
            <div
              key={r.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                r.is_completed
                  ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-75'
                  : isOverdue
                  ? 'border-rose-500/30 bg-rose-500/5 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() => handleToggleComplete(r)}
                  className={`p-1.5 rounded-xl border mt-0.5 cursor-pointer transition-colors ${
                    r.is_completed
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        r.is_completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {r.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        r.priority === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {r.category.replace('_', ' ')}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.description}
                    </p>
                  )}

                  {r.penalty_note && !r.is_completed && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {r.penalty_note}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                    Due Date
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    {r.due_date}
                  </span>
                </div>

                {r.action_url && (
                  <a
                    href={r.action_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Open official portal"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button
                  onClick={() => handleDeleteReminder(r.id)}
                  className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Delete reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredReminders.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              All compliance tasks in this category are completed!
            </p>
            <p className="text-xs text-slate-400 mt-1">Keep your Current Account records up to date.</p>
          </div>
        )}
      </div>

      {/* Add Custom Reminder Modal */}
      {isAddingReminder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Custom Compliance Reminder
            </h3>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Download SBI Current Account Statement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CUSTOM">Custom Reminder</option>
                    <option value="ADVANCE_TAX">Advance Tax</option>
                    <option value="ITR_FILING">ITR Filing</option>
                    <option value="GST_RETURN">GST Return</option>
                    <option value="JHARKHAND_PT">Jharkhand PT</option>
                    <option value="BANK_AUDIT">Bank / AIS Audit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="NORMAL">Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or checklist items..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Penalty Note (if delayed)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Shortfall attracts 1% interest u/s 234C"
                  value={penaltyNote}
                  onChange={(e) => setPenaltyNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingReminder(false)}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                  Save Reminder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
