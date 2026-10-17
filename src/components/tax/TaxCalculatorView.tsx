import React, { useState } from 'react';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Landmark,
  ExternalLink,
  Info,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Percent,
} from 'lucide-react';
import { TaxAuditSummary } from '../../types';

interface TaxCalculatorViewProps {
  summary: TaxAuditSummary | null;
}

export const TaxCalculatorView: React.FC<TaxCalculatorViewProps> = ({ summary }) => {
  const [selectedScheme, setSelectedScheme] = useState<'44ADA' | '44AD' | 'ACTUAL'>('44ADA');
  const [customTurnover, setCustomTurnover] = useState<number | ''>('');
  const [deduction80C, setDeduction80C] = useState<number>(150000); // For Old Regime comparison
  const [deduction80D, setDeduction80D] = useState<number>(25000); // Health insurance

  const baseTurnover = customTurnover !== '' ? Number(customTurnover) : summary?.grossTurnover || 0;

  // Presumptive 44ADA profit (50%)
  const profit44ADA = Math.round(baseTurnover * 0.50);

  // Presumptive 44AD profit (6% digital)
  const profit44AD = Math.round(baseTurnover * 0.06);

  // Actual profit from summary
  const actualProfit = summary?.netActualProfit || 0;

  let taxableProfit = profit44ADA;
  if (selectedScheme === '44AD') taxableProfit = profit44AD;
  if (selectedScheme === 'ACTUAL') taxableProfit = actualProfit;

  // Tax calculations
  // New Regime FY 2024-25 / FY 2025-26 u/s 115BAC
  const calculateNewRegime = (income: number) => {
    if (income <= 300000) return 0;
    let tax = 0;
    if (income <= 700000) {
      tax = (income - 300000) * 0.05;
    } else if (income <= 1000000) {
      tax = 20000 + (income - 700000) * 0.10;
    } else if (income <= 1200000) {
      tax = 50000 + (income - 1000000) * 0.15;
    } else if (income <= 1500000) {
      tax = 80000 + (income - 1200000) * 0.20;
    } else {
      tax = 140000 + (income - 1500000) * 0.30;
    }
    // Section 87A rebate for net taxable income <= ₹7,00,000
    if (income <= 700000) {
      tax = 0;
    }
    return Math.round(tax * 1.04); // 4% cess
  };

  // Old Regime with Chapter VI-A deductions (80C + 80D)
  const calculateOldRegime = (income: number, deductions: number) => {
    const netTaxable = Math.max(0, income - deductions);
    if (netTaxable <= 250000) return 0;
    let tax = 0;
    if (netTaxable <= 500000) {
      tax = (netTaxable - 250000) * 0.05;
    } else if (netTaxable <= 1000000) {
      tax = 12500 + (netTaxable - 500000) * 0.20;
    } else {
      tax = 112500 + (netTaxable - 1000000) * 0.30;
    }
    if (netTaxable <= 500000) {
      tax = 0; // 87A rebate
    }
    return Math.round(tax * 1.04);
  };

  const newRegimeTax = calculateNewRegime(taxableProfit);
  const oldRegimeTax = calculateOldRegime(taxableProfit, deduction80C + deduction80D);

  const bestRegime = newRegimeTax <= oldRegimeTax ? 'NEW' : 'OLD';
  const taxSavings = Math.abs(newRegimeTax - oldRegimeTax);

  return (
    <div className="space-y-6">
      {/* Top Scheme Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Section 44ADA Card */}
        <div
          onClick={() => setSelectedScheme('44ADA')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
            selectedScheme === '44ADA'
              ? 'border-amber-500 bg-amber-500/5 shadow-md ring-1 ring-amber-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Section 44ADA (Recommended)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Freelancers / Devs
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{profit44ADA.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Flat 50% Deemed Profit. Zero audit requirement u/s 44AB. Single advance tax payment by March 15.
          </p>
        </div>

        {/* Section 44AD Card */}
        <div
          onClick={() => setSelectedScheme('44AD')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
            selectedScheme === '44AD'
              ? 'border-amber-500 bg-amber-500/5 shadow-md ring-1 ring-amber-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Section 44AD (Trade/Goods)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Traders
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{profit44AD.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            6% Deemed Profit for digital turnover (8% for cash). Single advance tax payment by March 15.
          </p>
        </div>

        {/* Actual Books Card */}
        <div
          onClick={() => setSelectedScheme('ACTUAL')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
            selectedScheme === 'ACTUAL'
              ? 'border-amber-500 bg-amber-500/5 shadow-md ring-1 ring-amber-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Actual Books (P&L Ledger)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
              ITR-3
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{actualProfit.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gross Revenue minus allowed Section 37 business expenses. Requires full accounting books.
          </p>
        </div>
      </div>

      {/* Simulator Inputs & Regime Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-1 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-500" />
            Revenue & Deductions Simulator
          </h4>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Gross Annual Turnover (₹)
            </label>
            <input
              type="number"
              placeholder={`Current: ₹${summary?.grossTurnover || 0}`}
              value={customTurnover}
              onChange={(e) => setCustomTurnover(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Leave blank to use live invoices total (₹{summary?.grossTurnover.toLocaleString('en-IN')})
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Old Regime Deductions
            </span>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Section 80C (PPF, ELSS, EPF, Life Ins): Max ₹1.5L
              </label>
              <input
                type="number"
                value={deduction80C}
                onChange={(e) => setDeduction80C(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Section 80D (Health Insurance): Max ₹25k / ₹50k
              </label>
              <input
                type="number"
                value={deduction80D}
                onChange={(e) => setDeduction80D(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Comparison: New vs Old Regime */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {/* New Tax Regime Box */}
          <div
            className={`p-5 rounded-2xl border flex flex-col justify-between ${
              bestRegime === 'NEW'
                ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-1 ring-emerald-500/40'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  New Tax Regime (u/s 115BAC)
                </span>
                {bestRegime === 'NEW' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                ₹{newRegimeTax.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-slate-500">
                {taxableProfit <= 700000
                  ? '🎉 100% Tax Free via Section 87A rebate! (Zero tax up to ₹7 Lakh income)'
                  : 'Lower slab rates without needing 80C/80D investments.'}
              </p>

              <div className="mt-4 space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Turnover:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    ₹{baseTurnover.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Taxable Base ({selectedScheme}):</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    ₹{taxableProfit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Section 87A Rebate:</span>
                  <span className="font-medium text-emerald-600">
                    {taxableProfit <= 700000 ? 'Full (₹25,000)' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Default regime for FY 2026-27 (AY 2027-28).
            </div>
          </div>

          {/* Old Tax Regime Box */}
          <div
            className={`p-5 rounded-2xl border flex flex-col justify-between ${
              bestRegime === 'OLD'
                ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-1 ring-emerald-500/40'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Old Tax Regime
                </span>
                {bestRegime === 'OLD' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                ₹{oldRegimeTax.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-slate-500">
                With ₹{(deduction80C + deduction80D).toLocaleString('en-IN')} in 80C/80D deductions.
              </p>

              <div className="mt-4 space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex justify-between text-slate-500">
                  <span>Taxable Base:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    ₹{taxableProfit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>80C + 80D Deductions:</span>
                  <span className="font-medium text-emerald-600">
                    -₹{(deduction80C + deduction80D).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Net Taxable Income:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    ₹{Math.max(0, taxableProfit - (deduction80C + deduction80D)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Requires filing Form 10-IEA if opting out of New Regime.
            </div>
          </div>
        </div>
      </div>

      {/* Advance Tax Installment Schedule for the Selected Scheme */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Advance Tax Payment Schedule (FY 2026-27 / AY 2027-28)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedScheme === '44ADA' || selectedScheme === '44AD'
                ? '⚡ Section 44ADA / 44AD Perk: You do NOT have to pay quarterly installments! 100% of tax can be paid in a single payment by 15th March.'
                : 'Regular business taxpayers must pay in 4 quarterly installments (June 15, Sept 15, Dec 15, March 15).'}
            </p>
          </div>

          <a
            href="https://eportal.incometax.gov.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <span>Pay on e-Tax Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              quarter: 'Q1 (15%)',
              date: '15 June',
              pct: 15,
              due: Math.round(newRegimeTax * 0.15),
              exemptFor44ADA: true,
            },
            {
              quarter: 'Q2 (45%)',
              date: '15 September',
              pct: 45,
              due: Math.round(newRegimeTax * 0.45),
              exemptFor44ADA: true,
            },
            {
              quarter: 'Q3 (75%)',
              date: '15 December',
              pct: 75,
              due: Math.round(newRegimeTax * 0.75),
              exemptFor44ADA: true,
            },
            {
              quarter: 'Q4 (100% / 44ADA)',
              date: '15 March',
              pct: 100,
              due: newRegimeTax,
              exemptFor44ADA: false,
              isHighlight: true,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border ${
                item.isHighlight
                  ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{item.quarter}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.date}</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                ₹{item.due.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {selectedScheme === '44ADA' && item.exemptFor44ADA ? (
                  <span className="text-emerald-600 font-medium">Exempt u/s 44ADA</span>
                ) : (
                  <span>Cumulative {item.pct}% due</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Step-by-Step SBI e-Pay Tax Payment Guide */}
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
            <Landmark className="w-4 h-4 text-blue-600" />
            How to Pay Advance Tax from your SBI Current Account (No Extra Fees):
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed">
            <li>Visit <strong>eportal.incometax.gov.in</strong> &gt; Click <strong>e-Pay Tax</strong> &gt; Enter your PAN and mobile OTP.</li>
            <li>Select <strong>Assessment Year (AY 2027-28)</strong> &gt; Choose <strong>Income Tax</strong>.</li>
            <li>Under Type of Payment (Minor Head), select <strong>Advance Tax (100)</strong> (Do NOT select Self-Assessment Tax!).</li>
            <li>In the payment gateway selection, choose <strong>Net Banking &gt; State Bank of India</strong>.</li>
            <li>Authenticate with your SBI Internet Banking credentials and confirm debit from A/C <strong>45661497562</strong>.</li>
            <li>Download the paid Challan (CRN / BSR Code) and save it in your tax dossier.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
