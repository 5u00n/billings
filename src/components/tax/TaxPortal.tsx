import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ShieldAlert,
  Calculator,
  Bell,
  FileCheck,
  Landmark,
  Scale,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { TaxAuditSummary, TaxReminder, Expense, UserProfile } from '../../types';
import { TaxGuideView } from './TaxGuideView';
import { TaxAuditView } from './TaxAuditView';
import { TaxCalculatorView } from './TaxCalculatorView';
import { TaxRemindersView } from './TaxRemindersView';
import { TaxDossierView } from './TaxDossierView';
import { Button } from '../ui/button';

export type TaxSubTab = 'guide' | 'audit' | 'calculator' | 'reminders' | 'dossier';

interface TaxPortalProps {
  profile: UserProfile | null;
}

const DEFAULT_TAX_SUMMARY: TaxAuditSummary = {
  financialYear: '2026-27 (FY)',
  assessmentYear: '2027-28 (AY)',
  grossTurnover: 0,
  totalInvoicesCount: 0,
  totalCollections: 0,
  businessDeductibleExpenses: 0,
  personalDrawings: 0,
  mixedExpensesTotal: 0,
  mixedExpensesDeductible: 0,
  capitalAssetsTotal: 0,
  capitalIntroduced: 0,
  bankChargesDeductible: 0,
  sbiMabRequired: 5000,
  sbiMabStatus: 'COMPLIANT',
  totalDeductionsAllowed: 0,
  netActualProfit: 0,
  profitMarginActual: 0,
  presumptive44ADAProfit: 0,
  presumptive44ADProfit: 0,
  totalCashDeposits: 0,
  totalCashWithdrawals: 0,
  sftLimitCurrentAccount: 5000000,
  sftCashUtilizationPercent: 0,
  violations: [],
  complianceScore: 100,
  taxLiabilityNewRegime: 0,
  taxLiabilityOldRegime: 0,
  advanceTaxSchedule: [],
};

export const TaxPortal: React.FC<TaxPortalProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<TaxSubTab>('guide');
  const [summary, setSummary] = useState<TaxAuditSummary>(DEFAULT_TAX_SUMMARY);
  const [reminders, setReminders] = useState<TaxReminder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      const [sumRes, remRes, expRes] = await Promise.all([
        fetch('/api/tax/summary').catch(() => null),
        fetch('/api/tax/reminders').catch(() => null),
        fetch('/api/budget/expenses').catch(() => null),
      ]);

      if (sumRes && sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData && !sumData.error && Array.isArray(sumData.violations)) {
          setSummary(sumData);
        } else {
          setSummary(DEFAULT_TAX_SUMMARY);
        }
      } else {
        setSummary(DEFAULT_TAX_SUMMARY);
      }

      if (remRes && remRes.ok) {
        const remData = await remRes.json();
        setReminders(Array.isArray(remData) ? remData : []);
      }

      if (expRes && expRes.ok) {
        const expData = await expRes.json();
        setExpenses(Array.isArray(expData) ? expData : []);
      }
    } catch (err) {
      console.error('Failed to load tax data:', err);
      setSummary(DEFAULT_TAX_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, []);

  // Find next upcoming deadline
  const nextReminder = reminders
    .filter((r) => !r.is_completed && new Date(r.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const score = summary?.complianceScore ?? 100;

  return (
    <div className="space-y-6  pb-12">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Landmark className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Indian Tax & Current Account Portal
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Jharkhand, India
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tax rules, Current Account personal vs business expense segregation, Section 44ADA presumptive planning, and automated compliance reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Health Score Pill */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
              <span className="text-xs text-slate-500 font-medium">Compliance Score:</span>
              <span
                className={`text-sm font-black ${score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}
              >
                {score}/100
              </span>
            </div>

            <Button
              onClick={fetchTaxData}
              variant="outline"
              size="sm"
              className="text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh Tax Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Urgent Deadline Notification Pill */}
        {nextReminder && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
              <Clock className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>Next Statutory Deadline:</strong> {nextReminder.title} (Due:{' '}
                {nextReminder.due_date})
              </span>
            </div>
            <button
              onClick={() => setActiveTab('reminders')}
              className="text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer shrink-0"
            >
              View Compliance Calendar &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'guide', label: 'Tax Rules & Guide', icon: BookOpen },
          { id: 'audit', label: 'Expense Classifier & Audit', icon: ShieldAlert, badge: summary?.violations?.length ? `${summary.violations.length} alerts` : undefined },
          { id: 'calculator', label: 'Tax & 44ADA Calculator', icon: Calculator },
          { id: 'reminders', label: 'Compliance Calendar & Alerts', icon: Bell, badge: reminders.filter(r => !r.is_completed).length || undefined },
          { id: 'dossier', label: 'CA Tax Dossier Export', icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TaxSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${isActive
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                    }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Views */}
      <div className="pt-2">
        {activeTab === 'guide' && <TaxGuideView />}
        {activeTab === 'audit' && (
          <TaxAuditView summary={summary} expenses={expenses} onRefresh={fetchTaxData} />
        )}
        {activeTab === 'calculator' && <TaxCalculatorView summary={summary} />}
        {activeTab === 'reminders' && (
          <TaxRemindersView reminders={reminders} onRefresh={fetchTaxData} />
        )}
        {activeTab === 'dossier' && (
          <TaxDossierView summary={summary} profile={profile} expenses={expenses} />
        )}
      </div>
    </div>
  );
};
