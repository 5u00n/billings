import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trash2,
  Database,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { offlineCache } from '../../lib/offlineCache';

interface DiagnosticsReport {
  timestamp: string;
  healthy: boolean;
  tableCounts: Record<string, number>;
  idFormatAudit: {
    totalEntities: number;
    standardizedCount: number;
    legacyCount: number;
    legacySamples: string[];
  };
  integrityIssues: Array<{
    type: string;
    table: string;
    recordId?: string;
    severity: string;
    description: string;
  }>;
  ledgerAudit: {
    hasAnomalies: boolean;
    anomalies: Array<{ month: string; issue: string; currentValues: any }>;
  };
}

interface CloudflareDiagnosticsCardProps {
  onRefreshParent?: () => void;
}

export const CloudflareDiagnosticsCard: React.FC<CloudflareDiagnosticsCardProps> = ({
  onRefreshParent,
}) => {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const runAudit = async () => {
    try {
      setLoading(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/diagnostics');
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Diagnostics failed to run', error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'reconcile_ledger' | 'clean_orphans' | 'migrate_ids' | 'reset_expense_data') => {
    try {
      setExecutingAction(action);
      setActionMessage(null);
      const res = await fetch('/api/admin/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, dryRun: false }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Action failed with status ${res.status}`);
      }
      const data = await res.json();
      setActionMessage({ text: data.message || 'Operation executed successfully!' });

      // Clear local browser cache
      offlineCache.clearAll();

      // Re-run diagnostics to show updated state
      await runAudit();

      if (onRefreshParent) {
        onRefreshParent();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to complete repair action', error: true });
    } finally {
      setExecutingAction(null);
      setShowResetConfirm(false);
    }
  };

  return (
    <Card className="shadow-2xs border-slate-200 dark:border-slate-800 mt-6">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="text-sm font-bold">Cloudflare D1 & Database Health Diagnostics</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Audit entity integrity, standardize IDs, resolve ledger carryover anomalies, and manage expense data.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={runAudit}
          disabled={loading}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
        >
          <Activity className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Auditing...' : 'Run Diagnostics'}</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {actionMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              actionMessage.error
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {actionMessage.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Status Overview */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Database Status:</span>
                {report.healthy ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Healthy
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3" /> Issues Detected
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Audited at: {new Date(report.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Table Counts Pill Grid */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Live Table Row Counts</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(report.tableCounts).map(([tbl, cnt]) => (
                  <div key={tbl} className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-2.5 py-1.5 rounded-lg flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate">{tbl}</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ID Scheme Audit */}
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Entity ID Format Health:
                </span>
                <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                  {report.idFormatAudit.standardizedCount} / {report.idFormatAudit.totalEntities} Standardized
                </span>
              </div>
              {report.idFormatAudit.legacyCount > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                    Found {report.idFormatAudit.legacyCount} legacy timestamp/ad-hoc IDs.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('migrate_ids')}
                    disabled={executingAction === 'migrate_ids'}
                    className="text-xs h-7 px-2.5 bg-white dark:bg-slate-900 text-indigo-600 border-indigo-200"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Standardize IDs
                  </Button>
                </div>
              )}
            </div>

            {/* Integrity & Ledger Warnings */}
            {report.integrityIssues.length > 0 && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Referential Integrity Issues ({report.integrityIssues.length})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('clean_orphans')}
                    disabled={executingAction === 'clean_orphans'}
                    className="text-xs h-7 px-2.5 bg-white text-rose-700 border-rose-200"
                  >
                    Clean Broken Links
                  </Button>
                </div>
                <ul className="text-[11px] space-y-1 text-rose-600 dark:text-rose-400">
                  {report.integrityIssues.map((iss, i) => (
                    <li key={i}>• [{iss.table}] {iss.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Maintenance Action Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAction('reconcile_ledger')}
            disabled={executingAction === 'reconcile_ledger'}
            className="text-xs gap-1.5 font-semibold text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${executingAction === 'reconcile_ledger' ? 'animate-spin' : ''}`} />
            Reconcile Sequential Ledger
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            disabled={executingAction === 'reset_expense_data'}
            className="text-xs gap-1.5 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Expense & Borrowing Data...
          </Button>
        </div>

        {/* Reset Confirmation Modal / Alert */}
        {showResetConfirm && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Confirm Selective Expense & Debt Reset
                </h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  This will reset all expenses, borrow records, and debt history to zero so you can start fresh.
                  <strong> All your invoices, clients/organizations, settings, and catalog items will remain 100% safe and intact.</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowResetConfirm(false)}
                className="text-xs h-8 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction('reset_expense_data')}
                disabled={executingAction === 'reset_expense_data'}
                className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {executingAction === 'reset_expense_data' ? 'Resetting...' : 'Yes, Reset Expense Data to Zero'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

