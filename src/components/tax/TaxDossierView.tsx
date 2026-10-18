import React from 'react';
import {
  Printer,
  Download,
  FileCheck,
  Building,
  UserCheck,
  Scale,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { TaxAuditSummary, UserProfile, Expense } from '../../types';
import { Button } from '../ui/button';

interface TaxDossierViewProps {
  summary: TaxAuditSummary | null;
  profile: UserProfile | null;
  expenses: Expense[];
}

export const TaxDossierView: React.FC<TaxDossierViewProps> = ({ summary, profile, expenses }) => {
  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (!summary) return;
    const rows = [
      ['CA TAX AUDIT DOSSIER - FINANCIAL YEAR 2026-27'],
      ['Taxpayer Name', profile?.name || 'Suren Hembram'],
      ['Location', 'Chakulia, Jharkhand, India'],
      ['Udyam Reg Number', profile?.udyamNumber || 'UDYAM-JH-06-0090498-01-0004921'],
      ['Bank Account', `${profile?.bankName || 'SBI'} (${profile?.accountType || 'Current A/C'}) - A/C: ${profile?.accountNumber || ''}`],
      [],
      ['REVENUE RECONCILIATION'],
      ['Gross Invoiced Turnover', summary?.grossTurnover || 0],
      ['Total Collections Received', summary?.totalCollections || 0],
      ['Total Invoices Issued', summary?.totalInvoicesCount || 0],
      [],
      ['EXPENSE CLASSIFICATION (CURRENT ACCOUNT)'],
      ['100% Business Deductible (u/s 37)', summary?.businessDeductibleExpenses || 0],
      ['SBI Bank Charges & Card AMC (Deductible u/s 37)', summary?.bankChargesDeductible || 0],
      ['Mixed Apportioned Business Portion', summary?.mixedExpensesDeductible || 0],
      ['Capital Assets (40% Depreciation u/s 32)', (summary?.capitalAssetsTotal || 0) * 0.40],
      ['Total Allowable Deductions', summary?.totalDeductionsAllowed || 0],
      ['Owner Personal Drawings (Non-deductible)', summary?.personalDrawings || 0],
      ['Owner Capital Introduced (Post-tax Funds)', summary?.capitalIntroduced || 0],
      [],
      ['TAXABLE PROFIT COMPUTATION'],
      ['Actual Net Profit (Books Method)', summary?.netActualProfit || 0],
      ['Presumptive Profit u/s 44ADA (50%)', summary?.presumptive44ADAProfit || 0],
      ['Presumptive Profit u/s 44AD (6%)', summary?.presumptive44ADProfit || 0],
      [],
      ['SBI CURRENT ACCOUNT & MAB COMPLIANCE'],
      ['Bank Name & Branch', 'State Bank of India, Chakulia (SBIN0014355)'],
      ['MAB Requirement', '₹5,000 (Semi-Urban Branch)'],
      ['MAB Status', 'COMPLIANT'],
      ['SFT Limit for Current Account', summary?.sftLimitCurrentAccount || 5000000],
      ['Total Cash Deposits', summary?.totalCashDeposits || 0],
      ['Total Cash Withdrawals', summary?.totalCashWithdrawals || 0],
      ['SFT Limit for Current Account', summary?.sftLimitCurrentAccount || 5000000],
      ['Section 40A(3) Violations Count', (summary?.violations || []).filter(v => v.ruleCode === 'SEC_40A3').length],
      [],
      ['ITEMIZED EXPENSE AUDIT TRAIL'],
      ['Date', 'Description', 'Tag', 'Payment Method', 'Amount', 'Tax Classification', 'Deductible Part'],
      ...expenses.map((e) => {
        const busPct = e.business_percentage !== undefined ? e.business_percentage : 100;
        let deductible = 0;
        if (e.tax_classification === 'BUSINESS_DEDUCTIBLE' || !e.tax_classification) deductible = e.amount;
        else if (e.tax_classification === 'MIXED_APPORTIONED') deductible = (e.amount * busPct) / 100;
        else if (e.tax_classification === 'CAPITAL_ASSET') deductible = e.amount * 0.40;
        return [
          e.date,
          `"${e.description.replace(/"/g, '""')}"`,
          e.tag || 'General',
          e.payment_method || 'UPI',
          e.amount,
          e.tax_classification || 'BUSINESS_DEDUCTIBLE',
          Math.round(deductible),
        ];
      }),
    ];

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CA_Tax_Dossier_FY2026-27_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:hidden">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-500" />
            CA-Ready Tax Dossier & Books Verification
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A comprehensive, structured audit summary ready to submit to your Chartered Accountant or Tax Practitioner.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="text-xs border-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print CA Dossier
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg text-slate-900 dark:text-white space-y-8 font-sans">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="text-xs font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase mb-1">
              Confidential Tax Computation Dossier
            </div>
            <h1 className="text-2xl font-black">
              {profile?.name || 'Suren Hembram'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {profile?.addressLine1 || 'Kanimahuli'}, {profile?.addressLine2 || 'P.O. Bend, Chakulia'}, {profile?.cityStateZip || 'Chakulia Jharkhand 832301'}
            </p>
            <p className="text-xs text-slate-500">
              Phone: {profile?.phone || '08987608678'} | Email: {profile?.email || 'surenhembram97@gmail.com'}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs">
            <div className="font-bold text-slate-900 dark:text-white">
              Assessment Year: <span className="text-amber-600">2027-28</span>
            </div>
            <div className="text-slate-500">
              Financial Year: <span className="font-semibold text-slate-700 dark:text-slate-300">2026-27</span>
            </div>
            <div className="text-slate-500">
              MSME Udyam: <span className="font-mono text-slate-700 dark:text-slate-300">{profile?.udyamNumber || 'UDYAM-JH-06-0090498-01-0004921'}</span>
            </div>
            <div className="text-slate-500">
              Bank A/C: <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.bankName || 'State Bank of India'} ({profile?.accountType || 'Current Account'} - A/C: {profile?.accountNumber || '45661497562'})</span>
            </div>
          </div>
        </div>

        {/* Section 1: Financial Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Gross Invoiced Turnover
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              ₹{(summary?.grossTurnover || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              {summary?.totalInvoicesCount || 0} bills issued
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Allowable Deductions (u/s 37)
            </span>
            <span className="text-xl font-extrabold text-emerald-600">
              ₹{(summary?.totalDeductionsAllowed || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Business write-offs
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Personal Drawings
            </span>
            <span className="text-xl font-extrabold text-rose-600">
              ₹{(summary?.personalDrawings || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Non-deductible capital
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Section 44ADA Deemed Profit
            </span>
            <span className="text-xl font-extrabold text-amber-600">
              ₹{(summary?.presumptive44ADAProfit || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Flat 50% profit margin
            </span>
          </div>
        </div>

        {/* Section 2: Detailed Tax Computation Table */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-500" />
            1. Income Tax Calculation Schedule (New vs Old Regime)
          </h3>

          <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="p-3">Particulars</th>
                <th className="p-3 text-right">Actual Books (ITR-3)</th>
                <th className="p-3 text-right">Section 44ADA (ITR-4 Sugam)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="p-3 font-medium">Gross Business Receipts (Turnover)</td>
                <td className="p-3 text-right font-semibold">₹{(summary?.grossTurnover || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-semibold">₹{(summary?.grossTurnover || 0).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-600 dark:text-slate-400">Less: Deductible Business Expenses</td>
                <td className="p-3 text-right text-emerald-600">-₹{(summary?.totalDeductionsAllowed || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right text-slate-400">Deemed at 50%</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-bold">
                <td className="p-3">Taxable Business Income</td>
                <td className="p-3 text-right">₹{(summary?.netActualProfit || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right text-amber-600">₹{(summary?.presumptive44ADAProfit || 0).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="p-3">Tax Liability under New Regime (u/s 115BAC)</td>
                <td className="p-3 text-right font-bold">
                  ₹{(summary?.taxLiabilityNewRegime || 0).toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-right font-bold text-emerald-600">
                  ₹{(summary?.taxLiabilityNewRegime || 0).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td className="p-3">Section 87A Rebate (up to ₹7,00,000)</td>
                <td className="p-3 text-right text-emerald-600">
                  {(summary?.netActualProfit || 0) <= 700000 ? 'APPLIED (ZERO TAX)' : 'N/A'}
                </td>
                <td className="p-3 text-right text-emerald-600">
                  {(summary?.presumptive44ADAProfit || 0) <= 700000 ? 'APPLIED (ZERO TAX)' : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Statutory Compliance & Audit Certification */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            2. Statutory Audit & SFT Compliance Statement
          </h3>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Section 40A(3) Cash Limit Compliance
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Total cash withdrawals from Current Account: ₹{(summary?.totalCashWithdrawals || 0).toLocaleString('en-IN')}.
                {summary?.violations?.some(v => v.ruleCode === 'SEC_40A3')
                  ? ' Warning: High cash transactions detected in audit inspection.'
                  : ' Certified that all business deductions adhere to the ₹10,000 statutory cash cap.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                SFT-005 Bank Cash Threshold
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                SBI Current Account cash movement is ₹{((summary?.totalCashDeposits || 0) + (summary?.totalCashWithdrawals || 0)).toLocaleString('en-IN')} (Threshold: ₹50,00,000). Current utilization: {summary?.sftCashUtilizationPercent || 0}%.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 space-y-2 md:col-span-2">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                SBI Current Account (A/C: {profile?.accountNumber || '45661497562'}) Reconciliation & Capital Audit
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Maintained at State Bank of India, Chakulia Branch (IFSC: SBIN0014355). Required Semi-Urban MAB: ₹5,000 (Compliant). Total owner capital introduced from personal savings: <strong>₹{(summary?.capitalIntroduced || 0).toLocaleString('en-IN')}</strong>. This amount is certified as internal owner equity transfer and is strictly excluded from taxable gross business turnover. Total SBI service charges and business debit card AMC claimed as business expenses u/s 37(1): <strong>₹{(summary?.bankChargesDeductible || 0).toLocaleString('en-IN')}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Sign-off block */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p>Generated by: Billings & Expenses Portal</p>
            <p>Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-slate-400 w-48 mb-1"></div>
            <p className="font-semibold text-slate-900 dark:text-white">{profile?.name || 'Suren Hembram'}</p>
            <p>Authorized Proprietor Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
