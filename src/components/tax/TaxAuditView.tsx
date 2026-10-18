import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Tags,
  ArrowUpRight,
  Receipt,
  FileCheck2,
  FileWarning,
  DollarSign,
  TrendingDown,
  Info,
  Scale,
  Landmark,
} from 'lucide-react';
import { Expense, TaxAuditSummary, TaxClassification } from '../../types';
import { Button } from '../ui/button';
import { SbiStatementParserModal } from './SbiStatementParserModal';
import { SbiPpsChequeModal } from './SbiPpsChequeModal';

interface TaxAuditViewProps {
  summary: TaxAuditSummary | null;
  expenses: Expense[];
  onRefresh: () => void;
}

export const TaxAuditView: React.FC<TaxAuditViewProps> = ({ summary, expenses, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showPpsModal, setShowPpsModal] = useState(false);
  const [isLoggingCharge, setIsLoggingCharge] = useState(false);

  const handleQuickBankCharge = async (chargeType: string) => {
    setIsLoggingCharge(true);
    try {
      const res = await fetch('/api/tax/sbi/quick-bank-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeType }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to log bank charge');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingCharge(false);
    }
  };

  const handleAutoClassify = async () => {
    if (!confirm('Run tax categorization rules on all logged expenses? This will categorize expenses according to standard rules (e.g. food/groceries as Personal Drawings, utilities as Mixed, equipment as Capital Assets, tools/software as Business Deductions).')) {
      return;
    }
    try {
      setIsAutoClassifying(true);
      const res = await fetch('/api/tax/expenses/auto-classify', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully categorized ${data.count} expenses!`);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to auto-classify.');
    } finally {
      setIsAutoClassifying(false);
    }
  };

  const handleUpdateClassification = async (
    id: string,
    tax_classification: TaxClassification,
    business_percentage: number = 100,
    has_invoice_voucher: boolean = true
  ) => {
    try {
      await fetch(`/api/tax/expenses/${id}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_classification,
          business_percentage,
          has_invoice_voucher,
        }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update classification:', err);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterType === 'all') return true;
    if (filterType === 'drawings') return e.tax_classification === 'PERSONAL_DRAWINGS';
    if (filterType === 'capital') return e.tax_classification === 'CAPITAL_INTRODUCED';
    if (filterType === 'business') return e.tax_classification === 'BUSINESS_DEDUCTIBLE' || !e.tax_classification;
    if (filterType === 'mixed') return e.tax_classification === 'MIXED_APPORTIONED';
    if (filterType === 'flagged') {
      const isCash = (e.payment_method || '').toLowerCase().includes('cash');
      const isHighCash = isCash && e.amount > 10000 && e.tax_classification === 'BUSINESS_DEDUCTIBLE';
      const isBlocked = ['Food', 'Dining', 'Cosmetics'].includes(e.tag || '') && e.tax_classification === 'BUSINESS_DEDUCTIBLE';
      const isMissingVoucher = e.amount >= 2000 && !e.has_invoice_voucher && e.tax_classification === 'BUSINESS_DEDUCTIBLE';
      return isHighCash || isBlocked || isMissingVoucher;
    }
    return true;
  });

  const sftLimit = summary?.sftLimitCurrentAccount || 5000000;
  const cashTurnover = (summary?.totalCashDeposits || 0) + (summary?.totalCashWithdrawals || 0);
  const sftPercentage = Math.min(100, Math.round((cashTurnover / sftLimit) * 100));

  const score = summary?.complianceScore ?? 100;
  const scoreColor =
    score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
  const scoreBg =
    score >= 80
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : score >= 60
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-rose-500/10 border-rose-500/20';

  return (
    <div className="space-y-6">
      {/* Top Health, SBI MAB, and SFT Bar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Compliance Health Score */}
        <div className={`p-5 rounded-2xl border ${scoreBg} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tax Health Score
            </span>
            <ShieldCheck className={`w-5 h-5 ${scoreColor}`} />
          </div>
          <div className="my-2">
            <div className={`text-4xl font-extrabold ${scoreColor}`}>
              {score}
              <span className="text-lg font-normal text-slate-400">/100</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {score >= 80
                ? 'Excellent: Low risk of IT scrutiny or Section 270A penalty.'
                : score >= 60
                ? 'Moderate Risk: Review personal drawings and cash payments.'
                : 'High Scrutiny Risk: Multiple Section 40A(3) or misclassified items!'}
            </p>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <Info className="w-3.5 h-3.5" />
            {summary?.violations?.length || 0} compliance notice triggers detected
          </div>
        </div>

        {/* 2. SBI Semi-Urban MAB Monitor */}
        <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              SBI Semi-Urban MAB
            </span>
            <Landmark className="w-5 h-5 text-blue-600" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹5,000
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Chakulia Branch (SBIN0014355) requirement. Maintain ₹5,000 average monthly balance to avoid penalty.
            </p>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            SBI Fees: ₹{(summary?.bankChargesDeductible || 0).toLocaleString('en-IN')} (100% Tax Deductible u/s 37)
          </div>
        </div>

        {/* 3. Current Account SFT Cash Limit Monitor */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SBI SFT Cash Monitor
            </span>
            <TrendingDown className="w-5 h-5 text-amber-500" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                ₹{cashTurnover.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Limit: ₹50L/yr
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sftPercentage > 80
                    ? 'bg-rose-500'
                    : sftPercentage > 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${sftPercentage}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Rule 114E: SBI reports cumulative cash operations $\ge$ ₹50 Lakhs to CBDT via Form 61A.
          </p>
        </div>

        {/* 4. Breakdown of Segregation */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current A/C Segregation
            </span>
            <Scale className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="space-y-1 my-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Deductible (u/s 37):
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{(summary?.businessDeductibleExpenses || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Drawings:
              </span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                ₹{(summary?.personalDrawings || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                Capital In:
              </span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                ₹{(summary?.capitalIntroduced || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Total Business Write-Off:{' '}
            <strong className="text-slate-900 dark:text-white">
              ₹{(summary?.totalDeductionsAllowed || 0).toLocaleString('en-IN')}
            </strong>
          </p>
        </div>
      </div>

      {/* Red-Flag Violations Warning Cards */}
      {summary && (summary.violations || []).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Statutory Red Flags & Audit Vulnerabilities ({(summary.violations || []).length})
            </h4>
            <span className="text-xs text-slate-500">Action recommended before ITR filing</span>
          </div>

          <div className="grid gap-3">
            {(summary.violations || []).map((v) => (
              <div
                key={v.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  v.severity === 'DANGER'
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-900 dark:text-rose-200'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        v.severity === 'DANGER'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {v.ruleTitle}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{v.date}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {v.description}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{v.suggestion}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs text-slate-500 block">At Risk</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    ₹{v.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SBI Current Account Actions & Quick Bank Charges Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                SBI Current A/C Tools & Reconciliation
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                  SBIN0014355 • 45661497562
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import official SBI statement CSV or track high-value cheques in the RBI Positive Pay System.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowStatementModal(true)}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Import SBI Statement CSV
            </button>
            <button
              onClick={() => setShowPpsModal(true)}
              className="px-3.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              Positive Pay (PPS) Register
            </button>
          </div>
        </div>

        {/* Quick Log SBI Bank Charges Bar */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Quick-Log SBI Charges (100% Tax Deductible u/s 37(1)):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickBankCharge('DEBIT_CARD_AMC')}
              disabled={isLoggingCharge}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              + Debit Card AMC (₹413)
            </button>
            <button
              onClick={() => handleQuickBankCharge('SMS_ALERT')}
              disabled={isLoggingCharge}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              + SMS Alert Fee (₹17.70)
            </button>
            <button
              onClick={() => handleQuickBankCharge('MAB_SHORTFALL')}
              disabled={isLoggingCharge}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              + MAB Shortfall (₹590)
            </button>
            <button
              onClick={() => handleQuickBankCharge('CHEQUE_BOOK')}
              disabled={isLoggingCharge}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              + Cheque Book (₹177)
            </button>
          </div>
        </div>
      </div>

      {/* Expense Classification Table & Management */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              Expense Tax Classification & Voucher Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Classify each Current Account spend as Business Deduction, Personal Drawings, or Mixed Apportioned.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAutoClassify}
              disabled={isAutoClassifying}
              size="sm"
              variant="outline"
              className="text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Tags className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {isAutoClassifying ? 'Categorizing...' : 'Auto-Categorize Tax Expenses'}
            </Button>

            {/* Filter buttons */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-0.5 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'flagged', label: '🚩 Flagged' },
                { id: 'business', label: 'Business' },
                { id: 'drawings', label: 'Drawings' },
                { id: 'capital', label: 'Capital In' },
                { id: 'mixed', label: 'Mixed' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilterType(btn.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterType === btn.id
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Description & Tag</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5">Tax Classification</th>
                <th className="p-3.5 text-center">Voucher Proof</th>
                <th className="p-3.5 text-right">Tax Allowed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredExpenses.map((e) => {
                const taxClass = e.tax_classification || 'BUSINESS_DEDUCTIBLE';
                const busPct = e.business_percentage !== undefined ? e.business_percentage : 100;
                const isCash = (e.payment_method || '').toLowerCase().includes('cash');
                const isHighCash = isCash && e.amount > 10000 && taxClass === 'BUSINESS_DEDUCTIBLE';

                let taxAllowed = 0;
                if (taxClass === 'BUSINESS_DEDUCTIBLE') taxAllowed = e.amount;
                else if (taxClass === 'MIXED_APPORTIONED') taxAllowed = (e.amount * busPct) / 100;
                else if (taxClass === 'CAPITAL_ASSET') taxAllowed = e.amount * 0.40; // 40% depreciation
                else taxAllowed = 0;

                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isHighCash ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="p-3.5 whitespace-nowrap font-medium text-slate-500">
                      {e.date}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {e.description}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {e.tag || 'General'}
                        </span>
                        {isHighCash && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-semibold">
                            ⚠️ 40A(3) Cash Disallowed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isCash
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {e.payment_method || 'UPI'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{e.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <select
                        value={taxClass}
                        onChange={(evt) =>
                          handleUpdateClassification(
                            e.id,
                            evt.target.value as TaxClassification,
                            busPct,
                            e.has_invoice_voucher ?? true
                          )
                        }
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="BUSINESS_DEDUCTIBLE">100% Business u/s 37</option>
                        <option value="PERSONAL_DRAWINGS">Personal Drawings (Non-deductible)</option>
                        <option value="CAPITAL_INTRODUCED">Capital Introduced (Owner Savings)</option>
                        <option value="MIXED_APPORTIONED">Mixed Apportioned (70/30)</option>
                        <option value="CAPITAL_ASSET">Capital Asset (Deprec u/s 32)</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() =>
                          handleUpdateClassification(
                            e.id,
                            taxClass,
                            busPct,
                            !e.has_invoice_voucher
                          )
                        }
                        title={e.has_invoice_voucher ? 'Invoice / Voucher available' : 'No voucher (at risk)'}
                        className="cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {e.has_invoice_voucher ? (
                          <FileCheck2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <FileWarning className="w-4 h-4 text-amber-500 mx-auto" />
                        )}
                      </button>
                    </td>
                    <td className="p-3.5 text-right font-semibold whitespace-nowrap">
                      {taxClass === 'CAPITAL_INTRODUCED' ? (
                        <span className="text-violet-600 dark:text-violet-400 font-medium">₹0 (Capital In)</span>
                      ) : taxAllowed > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ₹{Math.round(taxAllowed).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0 (Drawings)</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No expenses found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SBI Modals */}
      <SbiStatementParserModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        onImportComplete={onRefresh}
      />
      <SbiPpsChequeModal
        isOpen={showPpsModal}
        onClose={() => setShowPpsModal(false)}
      />
    </div>
  );
};
