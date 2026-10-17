import React, { useState } from 'react';
import { BudgetAllocationRule } from '../../types';
import { formatINR } from '../../utils/numberToWords';
import { PieChart, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle, X, ArrowRight, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface BudgetAllocationViewProps {
  allocations: BudgetAllocationRule[];
  totalIncome: number;
  monthStr: string;
}

export const BudgetAllocationView: React.FC<BudgetAllocationViewProps> = ({
  allocations,
  totalIncome,
  monthStr,
}) => {
  const [selectedAlloc, setSelectedAlloc] = useState<BudgetAllocationRule | null>(null);

  const getEnvelopeDescription = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'essentials':
        return 'Rent, electricity, mobile recharge, groceries, bike fuel, and daily necessities (50% target).';
      case 'emergency fund':
        return '10% liquid cash reserve stashed into emergency bank account or mutual fund for unexpected events.';
      case 'parents fund':
        return '13% dedicated family allowance, gifts for parents, and health care support.';
      case 'business growth':
        return '15% business reinvestment for software subscriptions, hosting, servers, freelance domain, and dev tools.';
      case 'big assets fund':
        return '7% long-term asset building: Land purchase in Chakulia/Meghalaya, touring bike, and property.';
      case 'small assets':
        return '5% high-leverage personal hardware: iPad Pro, laptop peripherals, lenses, and gadgets.';
      default:
        return 'Allocated spending envelope based on your 100% financial system from Excel.';
    }
  };
  return (
    <div className="space-y-6">
      {/* Allocation Overview Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Allocation Envelopes</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Based on your 100% allocation system from the Excel template (50% Essentials, 10% Emergency, 13% Family, 15% Business Growth, 7% Big Assets, 5% Small Assets).
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Income Base</span>
          <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">₹{formatINR(totalIncome)}</span>
        </div>
      </div>

      {/* Grid of Allocation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {allocations.map((alloc) => {
          const planned = alloc.planned_amount || Math.round(totalIncome * alloc.percentage);
          const actual = alloc.actual_spent || 0;
          const variance = alloc.variance !== undefined ? alloc.variance : planned - actual;
          const percentUsed = planned > 0 ? Math.min(Math.round((actual / planned) * 100), 200) : 0;
          const isOverBudget = variance < 0;

          return (
            <div
              key={alloc.id || alloc.category}
              onClick={() => setSelectedAlloc(alloc)}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between hover:border-blue-500/60 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
              title={`Click to view ${alloc.category} details & guidelines`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 group-hover:scale-125 transition-transform" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {alloc.category}
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {Math.round(alloc.percentage * 100)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 my-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>Utilization</span>
                    <span
                      className={`font-bold ${
                        isOverBudget
                          ? 'text-red-600'
                          : percentUsed > 80
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {percentUsed}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverBudget
                          ? 'bg-red-500'
                          : percentUsed > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Planned vs Actual Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">
                      Target Budget
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      ₹{formatINR(planned)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">
                      Actual Spent
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      ₹{formatINR(actual)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                <div className="flex items-center gap-1 font-bold">
                  {isOverBudget ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 tabular-nums">
                        Over by ₹{formatINR(Math.abs(variance))}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₹{formatINR(variance)} left
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocation Rule Information Callout */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Rule Logic from Your Spreadsheet:</span>
          <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">
            Each month&apos;s planned amounts are automatically calculated from total monthly inflow. Click any envelope card above to view guidelines and spending allocations.
          </p>
        </div>
      </div>

      {/* Interactive Envelope Detail Modal */}
      {selectedAlloc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {Math.round(selectedAlloc.percentage * 100)}%
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedAlloc.category} Envelope
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Month: {monthStr}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlloc(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Envelope Description */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-1">Envelope Purpose:</span>
                {getEnvelopeDescription(selectedAlloc.category)}
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Target Budget</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    ₹{formatINR(selectedAlloc.planned_amount || Math.round(totalIncome * selectedAlloc.percentage))}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Actual Spent</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    ₹{formatINR(selectedAlloc.actual_spent || 0)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Remaining</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    ((selectedAlloc.planned_amount || Math.round(totalIncome * selectedAlloc.percentage)) - (selectedAlloc.actual_spent || 0)) < 0
                      ? 'text-red-600'
                      : 'text-emerald-600'
                  }`}>
                    ₹{formatINR((selectedAlloc.planned_amount || Math.round(totalIncome * selectedAlloc.percentage)) - (selectedAlloc.actual_spent || 0))}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>Envelope Consumption</span>
                  <span className="font-bold">
                    {Math.min(Math.round(((selectedAlloc.actual_spent || 0) / (selectedAlloc.planned_amount || Math.round(totalIncome * selectedAlloc.percentage) || 1)) * 100), 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(Math.round(((selectedAlloc.actual_spent || 0) / (selectedAlloc.planned_amount || Math.round(totalIncome * selectedAlloc.percentage) || 1)) * 100), 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={() => setSelectedAlloc(null)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
