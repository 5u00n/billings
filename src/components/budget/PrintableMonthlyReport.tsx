import React, { useState, useMemo } from 'react';
import {
  MonthlyBudgetSummary,
  Expense,
  IncomeEntry,
  BorrowRecord,
  BudgetAllocationRule,
  UserProfile,
} from '../../types';
import { formatINR } from '../../utils/numberToWords';
import {
  Printer,
  X,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  CheckCircle2,
  Clock,
  Layers,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { Button } from '../ui/button';

interface PrintableMonthlyReportProps {
  summary: MonthlyBudgetSummary;
  expenses: Expense[];
  incomes: IncomeEntry[];
  borrows: BorrowRecord[];
  allocations: BudgetAllocationRule[];
  profile: UserProfile;
  monthStr: string;
  availableMonths: string[];
  onSelectMonth?: (m: string) => void;
  onClose: () => void;
}

export const PrintableMonthlyReport: React.FC<PrintableMonthlyReportProps> = ({
  summary,
  expenses,
  incomes,
  borrows,
  allocations,
  profile,
  monthStr,
  availableMonths,
  onSelectMonth,
  onClose,
}) => {
  // Mode: specific month or 'ALL'
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<string>(monthStr || '2026-10');

  // Compute 1st day and last day of a month string (YYYY-MM)
  const getMonthDateRange = (mStr: string) => {
    if (!mStr || mStr === 'ALL') {
      return { start: '', end: '' };
    }
    const [y, m] = mStr.split('-').map(Number);
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDayNum = new Date(y, m, 0).getDate();
    const lastDay = `${y}-${String(m).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
    return { start: firstDay, end: lastDay };
  };

  const initialRange = getMonthDateRange(selectedReportPeriod);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const handlePeriodChange = (val: string) => {
    setSelectedReportPeriod(val);
    if (val === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else {
      const range = getMonthDateRange(val);
      setStartDate(range.start);
      setEndDate(range.end);
      if (onSelectMonth) {
        onSelectMonth(val);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter transactions according to selected range
  const filteredExpenses = useMemo(() => {
    if (selectedReportPeriod === 'ALL' && !startDate && !endDate) return expenses;
    return expenses.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });
  }, [expenses, selectedReportPeriod, startDate, endDate]);

  const filteredIncomes = useMemo(() => {
    if (selectedReportPeriod === 'ALL' && !startDate && !endDate) return incomes;
    return incomes.filter((i) => {
      if (startDate && i.date < startDate) return false;
      if (endDate && i.date > endDate) return false;
      return true;
    });
  }, [incomes, selectedReportPeriod, startDate, endDate]);

  const filteredReturns = useMemo(() => {
    const returnsOnly = borrows.filter((b) => b.type === 'RETURN');
    if (selectedReportPeriod === 'ALL' && !startDate && !endDate) return returnsOnly;
    return returnsOnly.filter((b) => {
      if (startDate && b.date < startDate) return false;
      if (endDate && b.date > endDate) return false;
      return true;
    });
  }, [borrows, selectedReportPeriod, startDate, endDate]);

  const filteredDebts = useMemo(() => {
    const debtsOnly = borrows.filter((b) => b.type !== 'RETURN');
    if (selectedReportPeriod === 'ALL' && !startDate && !endDate) return debtsOnly;
    return debtsOnly.filter((b) => {
      if (startDate && b.date < startDate) return false;
      if (endDate && b.date > endDate) return false;
      return true;
    });
  }, [borrows, selectedReportPeriod, startDate, endDate]);

  // Aggregate values
  const totalExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncEarned = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalReturnsCollected = filteredReturns
    .filter((r) => r.status === 'SETTLED')
    .reduce((sum, r) => sum + r.amount, 0);

  const prevCarried = selectedReportPeriod === 'ALL' ? 0 : (summary.previous_remaining || 0);
  const totalAvailableInflow = prevCarried + totalIncEarned + totalReturnsCollected;

  const debtRepaid = summary.dept_payment || 0;
  const newBorrowed = filteredDebts
    .filter((d) => d.type === 'BORROW')
    .reduce((sum, d) => sum + d.amount, 0);

  const netSurplus = (totalAvailableInflow + newBorrowed) - (totalExp + debtRepaid);
  const stashedSavings = netSurplus > 0 ? Math.round(netSurplus / 2) : 0;
  const nextMonthCarry = netSurplus - stashedSavings;
  const endingDebt = (summary.starting_debt || 0) + newBorrowed - debtRepaid;

  // Format month for label
  const formatPeriodDisplay = () => {
    if (selectedReportPeriod === 'ALL') {
      return 'All Recorded History (Lifetime Statement)';
    }
    const [y, m] = selectedReportPeriod.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const lastDayNum = new Date(y, m, 0).getDate();
    return `${monthName} (1 ${monthName.split(' ')[0]} – ${lastDayNum} ${monthName.split(' ')[0]} ${y})`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col overflow-hidden print:static print:bg-white print:overflow-visible print:p-0">
      {/* Top Non-Print Toolbar with Date & Period Selectors */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between no-print shadow-xs shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 text-sm">Financial Statement Generator</span>

          {/* Month / All Period Dropdown */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedReportPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Months / Lifetime Overview</option>
              {availableMonths.map((m) => {
                const [yr, mn] = m.split('-').map(Number);
                const d = new Date(yr, mn - 1, 1);
                const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label} (1st till end of month)
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Date Range Preview */}
          {startDate && endDate && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
              <span>{startDate}</span>
              <span>→</span>
              <span>{endDate}</span>
              <span className="text-[10px] text-slate-400 font-normal">(1st till end of month)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Statement / Save PDF
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Printable Sheet Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/10 flex justify-center print:p-0 print:bg-white print:overflow-visible">
        <div
          id="monthly-report-sheet"
          className="a4-sheet bg-white text-slate-900 border border-slate-300 shadow-xl print:border-none print:shadow-none print:w-full"
          style={{
            boxSizing: 'border-box',
            width: '210mm',
            minHeight: '297mm',
            padding: '14mm 16mm',
            fontSize: '11px',
            lineHeight: '1.4',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div className="space-y-4">
            {/* Header: User Profile & Statement Title */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {profile.name}
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '1px' }}>
                  Personal Financial Statement & Cashflow Audit
                </div>
                {profile.phone && profile.email && (
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    {profile.phone} • {profile.email} • {profile.address || 'India'}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.04em' }}>
                  FINANCIAL STATEMENT
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#2563eb', marginTop: '1px' }}>
                  {formatPeriodDisplay()}
                </div>
                <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                  Statement Date: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            {/* Section 1: Cashflow Summary KPI Bar */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                1. Executive Cashflow Summary
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  backgroundColor: '#f8fafc',
                  border: '1.2px solid #cbd5e1',
                  borderRadius: '6px',
                }}
              >
                <div style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Total Inflow Available
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹{formatINR(totalAvailableInflow)}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                    Earned: ₹{formatINR(totalIncEarned + totalReturnsCollected)} | Carried: ₹{formatINR(prevCarried)}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Total Living Outflow
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#e11d48', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹{formatINR(totalExp)}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                    {filteredExpenses.length} Expense Transactions
                  </div>
                </div>

                <div style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Surplus & 50/50 Split
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹{formatINR(netSurplus)}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                    Stashed: ₹{formatINR(stashedSavings)} | Carry: ₹{formatINR(nextMonthCarry)}
                  </div>
                </div>

                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Debt Balance
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹{formatINR(endingDebt)}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                    Paid Down: ₹{formatINR(debtRepaid)}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: 100% Allocation Envelopes Performance */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                2. 100% Allocation Envelopes (Target vs Actual)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #0f172a', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                      Envelope Category
                    </th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', width: '70px', fontWeight: '700', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                      Target %
                    </th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', width: '95px', fontWeight: '700', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                      Target Budget (₹)
                    </th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', width: '95px', fontWeight: '700', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                      Actual Spent (₹)
                    </th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', width: '95px', fontWeight: '700', textTransform: 'uppercase' }}>
                      Remaining (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a, idx) => (
                    <tr key={a.id || idx} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: '4.5px 8px', fontWeight: '600', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>
                        {a.category}
                      </td>
                      <td style={{ padding: '4.5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', borderRight: '1px solid #cbd5e1' }}>
                        {Math.round(a.percentage * 100)}%
                      </td>
                      <td style={{ padding: '4.5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>
                        ₹{formatINR(a.planned_amount || 0)}
                      </td>
                      <td style={{ padding: '4.5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#e11d48', fontWeight: '600', borderRight: '1px solid #cbd5e1' }}>
                        ₹{formatINR(a.actual_spent || 0)}
                      </td>
                      <td
                        style={{
                          padding: '4.5px 8px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: (a.variance || 0) >= 0 ? '#16a34a' : '#e11d48',
                        }}
                      >
                        {(a.variance || 0) >= 0 ? `+₹${formatINR(a.variance || 0)}` : `₹${formatINR(a.variance || 0)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3: Income Streams & Client Invoices */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                3. Income Streams & Client Billings ({filteredIncomes.length} records)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #0f172a', fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '25px', borderRight: '1px solid #334155' }}>#</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '75px', borderRight: '1px solid #334155' }}>Date</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '90px', borderRight: '1px solid #334155' }}>Category</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>Source / Client</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', width: '90px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.length > 0 ? (
                    filteredIncomes.map((inc, i) => (
                      <tr key={inc.id || i} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '3.5px 6px', color: '#64748b', borderRight: '1px solid #cbd5e1' }}>{i + 1}</td>
                        <td style={{ padding: '3.5px 6px', fontFamily: 'monospace', borderRight: '1px solid #cbd5e1' }}>{inc.date}</td>
                        <td style={{ padding: '3.5px 6px', fontWeight: '600', color: '#2563eb', borderRight: '1px solid #cbd5e1' }}>
                          {inc.category === 'fl' ? 'Freelance' : inc.category === 'sal' ? 'Salary' : inc.category === 'rt' ? 'Returned' : 'Extra'}
                        </td>
                        <td style={{ padding: '3.5px 6px', fontWeight: '500', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>{inc.source}</td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#16a34a' }}>
                          +₹{formatINR(inc.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>
                        No direct income entries found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 4: Money Returned to Me (Returns Statement) */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                4. Money Returned to Me (Inflow Collections)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #0f172a', fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '25px', borderRight: '1px solid #334155' }}>#</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '75px', borderRight: '1px solid #334155' }}>Date</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '120px', borderRight: '1px solid #334155' }}>Person / Contact</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>Settlement Notes</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: '70px', borderRight: '1px solid #334155' }}>Status</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', width: '90px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.length > 0 ? (
                    filteredReturns.map((ret, i) => (
                      <tr key={ret.id || i} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '3.5px 6px', color: '#64748b', borderRight: '1px solid #cbd5e1' }}>{i + 1}</td>
                        <td style={{ padding: '3.5px 6px', fontFamily: 'monospace', borderRight: '1px solid #cbd5e1' }}>{ret.date}</td>
                        <td style={{ padding: '3.5px 6px', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>{ret.person}</td>
                        <td style={{ padding: '3.5px 6px', color: '#475569', borderRight: '1px solid #cbd5e1' }}>{ret.reason || 'Loan returned'}</td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                          <span style={{ fontSize: '8px', fontWeight: '700', padding: '1px 4px', borderRadius: '3px', backgroundColor: ret.status === 'SETTLED' ? '#ecfdf5' : '#fffbeb', color: ret.status === 'SETTLED' ? '#047857' : '#b45309' }}>
                            {ret.status === 'SETTLED' ? 'Received' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#16a34a' }}>
                          +₹{formatINR(ret.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>
                        No returned money logged for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 5: Itemized Living Expenses */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                5. Itemized Living Expense Ledger ({filteredExpenses.length} transactions)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #0f172a', fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '25px', borderRight: '1px solid #334155' }}>#</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '75px', borderRight: '1px solid #334155' }}>Date</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '65px', borderRight: '1px solid #334155' }}>Type</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>Description</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', width: '90px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.slice(0, 15).map((exp, i) => (
                      <tr key={exp.id || i} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '3.5px 6px', color: '#64748b', borderRight: '1px solid #cbd5e1' }}>{i + 1}</td>
                        <td style={{ padding: '3.5px 6px', fontFamily: 'monospace', borderRight: '1px solid #cbd5e1' }}>{exp.date}</td>
                        <td style={{ padding: '3.5px 6px', borderRight: '1px solid #cbd5e1' }}>
                          <span style={{ fontSize: '8px', fontWeight: '700', padding: '1px 4px', borderRadius: '3px', backgroundColor: exp.category === 'reg' ? '#eff6ff' : '#fdf2f8', color: exp.category === 'reg' ? '#1d4ed8' : '#be185d' }}>
                            {exp.category === 'reg' ? 'Essential' : 'Extra'}
                          </span>
                        </td>
                        <td style={{ padding: '3.5px 6px', fontWeight: '500', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>
                          {exp.description} {exp.tag && <span style={{ color: '#64748b' }}>({exp.tag})</span>}
                        </td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#e11d48' }}>
                          ₹{formatINR(exp.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>
                        No living expense records logged for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredExpenses.length > 15 && (
                <div style={{ fontSize: '8.5px', color: '#64748b', textAlign: 'right', marginTop: '2px', fontStyle: 'italic' }}>
                  Showing top 15 of {filteredExpenses.length} records. Total expenditure: ₹{formatINR(totalExp)}
                </div>
              )}
            </div>

            {/* Section 6: Loans & Debts Overview */}
            {filteredDebts.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  6. Loans & Liabilities Record ({filteredDebts.length} entries)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #0f172a', fontSize: '9.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', width: '25px', borderRight: '1px solid #334155' }}>#</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', width: '75px', borderRight: '1px solid #334155' }}>Date</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', width: '65px', borderRight: '1px solid #334155' }}>Type</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>Entity / Lender</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>Reason</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right', width: '90px' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebts.map((d, i) => (
                      <tr key={d.id || i} style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '3.5px 6px', color: '#64748b', borderRight: '1px solid #cbd5e1' }}>{i + 1}</td>
                        <td style={{ padding: '3.5px 6px', fontFamily: 'monospace', borderRight: '1px solid #cbd5e1' }}>{d.date}</td>
                        <td style={{ padding: '3.5px 6px', borderRight: '1px solid #cbd5e1', fontWeight: '600' }}>
                          {d.type === 'BORROW' ? 'Borrowed' : 'Lent Out'}
                        </td>
                        <td style={{ padding: '3.5px 6px', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>{d.person}</td>
                        <td style={{ padding: '3.5px 6px', color: '#475569', borderRight: '1px solid #cbd5e1' }}>{d.reason || '-'}</td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#d97706' }}>
                          ₹{formatINR(d.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer & Certification */}
          <div
            style={{
              borderTop: '1px solid #cbd5e1',
              paddingTop: '8px',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '9.5px',
              color: '#64748b',
            }}
          >
            <div>
              <div style={{ fontWeight: '600', color: '#334155' }}>Complete Budget & Ledger Accounting System</div>
              <div style={{ marginTop: '1px' }}>Verified Record Holder: {profile.name} • {profile.website || 'suren-site.vercel.app'}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #0f172a', width: '130px', marginBottom: '3px', height: '18px' }}></div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{profile.name}</div>
              <div style={{ fontSize: '8.5px' }}>Verified Account Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
