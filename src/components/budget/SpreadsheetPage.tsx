import React, { useState, useEffect } from 'react';
import { MonthlyBreakdownTableView } from './MonthlyBreakdownTableView';
import { FileSpreadsheet, Printer, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { PrintableMonthlyReport } from './PrintableMonthlyReport';
import { MonthlyBudgetSummary, Expense, IncomeEntry, BorrowRecord, BudgetAllocationRule, UserProfile } from '../../types';

interface SpreadsheetPageProps {
  profile?: UserProfile;
}

export const SpreadsheetPage: React.FC<SpreadsheetPageProps> = ({ profile }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [summary, setSummary] = useState<MonthlyBudgetSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocationRule[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchMonths();
  }, [refreshKey]);

  const fetchMonths = async () => {
    try {
      const res = await fetch('/api/budget/months');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAvailableMonths(data);
        if (!data.includes(selectedMonth)) {
          setSelectedMonth(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch months:', err);
    }
  };

  const handleOpenPrint = async () => {
    try {
      const [sumRes, expRes, incRes, borRes, allocRes] = await Promise.all([
        fetch(`/api/budget/summary?month=${selectedMonth}`),
        fetch(`/api/budget/expenses?month=${selectedMonth}`),
        fetch(`/api/budget/income?month=${selectedMonth}`),
        fetch(`/api/budget/borrow?month=${selectedMonth}`),
        fetch(`/api/budget/allocations?month=${selectedMonth}`),
      ]);
      setSummary(await sumRes.json());
      setExpenses(await expRes.json());
      setIncomes(await incRes.json());
      setBorrows(await borRes.json());
      setAllocations(await allocRes.json());
      setIsPrintModalOpen(true);
    } catch (err) {
      console.error('Failed to prepare print data:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Multi-Month Spreadsheet (Excel View)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive columns with previous carryover, starting debt, 50/50 overhead split, and formula parity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenPrint}
            className="gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-xl shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report / PDF
          </Button>
        </div>
      </div>

      {/* Spreadsheet Component */}
      <MonthlyBreakdownTableView
        key={refreshKey}
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => setSelectedMonth(m)}
        onOpenEditModal={(m) => setSelectedMonth(m)}
        onRefreshParent={() => setRefreshKey((k) => k + 1)}
      />

      {/* Printable Report Modal */}
      {isPrintModalOpen && summary && (
        <PrintableMonthlyReport
          summary={summary}
          expenses={expenses}
          incomes={incomes}
          borrows={borrows}
          allocations={allocations}
          profile={profile || {
            name: 'Suren',
            addressLine1: '',
            addressLine2: '',
            cityStateZip: 'Jharkhand, India',
            country: 'India',
            email: '',
            phone: '',
            website: '',
            udyamNumber: '',
            showUdyamOnBill: false,
            bankName: 'State Bank of India',
            accountNumber: '45661497562',
            ifscCode: 'SBIN0014355',
            accountHolder: 'Suren',
            upiId: '',
            showBankDetailsOnBill: true,
            showUpiOnBill: false,
            showQrOnBill: false,
            defaultNotes: '',
            defaultTerms: '',
            signatureText: 'Authorized Signatory',
          }}
          monthStr={selectedMonth}
          availableMonths={availableMonths}
          onSelectMonth={(m) => setSelectedMonth(m)}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
