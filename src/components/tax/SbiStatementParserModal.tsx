import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Download,
  Info,
  DollarSign,
  Landmark,
} from 'lucide-react';
import { SbiParsedTransaction, TaxClassification } from '../../types';

interface SbiStatementParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const SAMPLE_SBI_CSV = `Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
12/10/2026,12/10/2026,DEBIT CARD AMC CHARGES FOR PRIDE CARD,CHG482910,413.00,,49587.00
10/10/2026,10/10/2026,UPI/IRVINE ADVENTIST/INV000001/SETTLEMENT,UPI629100,,20000.00,50000.00
08/10/2026,08/10/2026,TRF FROM PERSONAL SAVINGS A/C TO CURRENT,TRF992100,,15000.00,30000.00
05/10/2026,05/10/2026,CHQ WDL SELF-TRANSFER FOR DRAWINGS,CHQ000104,12000.00,,15000.00
02/10/2026,02/10/2026,AIRTEL BROADBAND & RECHARGE CHAKULIA,UPI829102,999.00,,27000.00
30/09/2026,30/09/2026,QUARTERLY SMS ALERT CHARGES,CHG110294,17.70,,27999.00
28/09/2026,28/09/2026,AWS HOSTING & GITHUB SUBSCRIPTION,POS771920,2450.00,,28016.70
25/09/2026,25/09/2026,RESTAURANT DINNER CHAKULIA DHABA,UPI102938,850.00,,30466.70`;

export const SbiStatementParserModal: React.FC<SbiStatementParserModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<SbiParsedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseCsvText = (text: string) => {
    setIsParsing(true);
    setImportStatus(null);
    try {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        alert('Please paste valid CSV or tabular data with at least one transaction row.');
        setIsParsing(false);
        return;
      }

      // Check header or find column indices
      const firstLine = lines[0].toLowerCase();
      let hasHeader = firstLine.includes('date') || firstLine.includes('description') || firstLine.includes('debit');
      
      const startIdx = hasHeader ? 1 : 0;
      const results: SbiParsedTransaction[] = [];

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma or tab
        const delimiter = line.includes('\t') ? '\t' : ',';
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

        if (cols.length < 4) continue;

        // Typical SBI columns:
        // Txn Date [0], Value Date [1], Description [2], Ref No [3], Debit [4], Credit [5], Balance [6]
        // Or Date [0], Description [1], Ref [2], Debit [3], Credit [4]
        let rawDate = cols[0];
        let desc = '';
        let refNo = '';
        let debitStr = '';
        let creditStr = '';
        let balanceStr = '';

        if (cols.length >= 7) {
          desc = cols[2];
          refNo = cols[3];
          debitStr = cols[4];
          creditStr = cols[5];
          balanceStr = cols[6];
        } else if (cols.length === 6) {
          desc = cols[1];
          refNo = cols[2];
          debitStr = cols[3];
          creditStr = cols[4];
          balanceStr = cols[5];
        } else {
          desc = cols[1];
          refNo = cols[2];
          debitStr = cols[3];
          creditStr = cols[4] || '';
        }

        // Normalize Date to YYYY-MM-DD with strict validation
        let formattedDate = new Date().toISOString().slice(0, 10);
        if (rawDate) {
          const parts = rawDate.split(/[-/]/);
          if (parts.length === 3) {
            const p0 = parts[0].trim();
            const p1 = parts[1].trim();
            const p2 = parts[2].trim();
            if (p2.length === 4 && !isNaN(Number(p2))) {
              // DD/MM/YYYY
              formattedDate = `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
            } else if (p0.length === 4 && !isNaN(Number(p0))) {
              // YYYY-MM-DD
              formattedDate = `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
            }
          }
        }
        if (isNaN(Date.parse(formattedDate))) {
          formattedDate = new Date().toISOString().slice(0, 10);
        }

        const debitRaw = parseFloat(debitStr.replace(/,/g, ''));
        const debit = isNaN(debitRaw) ? 0 : Math.max(0, debitRaw);
        const creditRaw = parseFloat(creditStr.replace(/,/g, ''));
        const credit = isNaN(creditRaw) ? 0 : Math.max(0, creditRaw);
        const balanceRaw = balanceStr ? parseFloat(balanceStr.replace(/,/g, '')) : undefined;
        const balance = balanceRaw !== undefined && !isNaN(balanceRaw) ? balanceRaw : undefined;

        if (debit <= 0 && credit <= 0) continue;

        const isDebit = debit > 0;
        const amount = isDebit ? debit : credit;
        const descLower = desc.toLowerCase();

        // Intelligent Auto-Classification for SBI
        let suggestedClassification: TaxClassification = 'BUSINESS_DEDUCTIBLE';
        let suggestedCategory = 'reg';
        let suggestedBusPct = 100;

        if (isDebit) {
          if (
            ['amc', 'sms', 'mab', 'chg', 'charge', 'service charge', 'cheque', 'shortfall', 'penalty'].some(k =>
              descLower.includes(k)
            )
          ) {
            suggestedClassification = 'BUSINESS_DEDUCTIBLE';
            suggestedCategory = 'reg';
            suggestedBusPct = 100;
          } else if (
            ['self-transfer', 'drawings', 'swiggy', 'zomato', 'blinkit', 'dinner', 'food', 'dhaba', 'grocery', 'cinema', 'personal'].some(
              k => descLower.includes(k)
            )
          ) {
            suggestedClassification = 'PERSONAL_DRAWINGS';
            suggestedCategory = 'ext';
            suggestedBusPct = 0;
          } else if (
            ['airtel', 'jio', 'broadband', 'recharge', 'wifi', 'fuel', 'petrol', 'travel', 'train'].some(k =>
              descLower.includes(k)
            )
          ) {
            suggestedClassification = 'MIXED_APPORTIONED';
            suggestedCategory = 'reg';
            suggestedBusPct = 70;
          } else if (
            ['laptop', 'apple', 'dell', 'hardware', 'equipment', 'camera', 'gpu'].some(k =>
              descLower.includes(k)
            )
          ) {
            suggestedClassification = 'CAPITAL_ASSET';
            suggestedCategory = 'ext';
            suggestedBusPct = 100;
          } else {
            suggestedClassification = 'BUSINESS_DEDUCTIBLE';
            suggestedCategory = 'reg';
            suggestedBusPct = 100;
          }
        } else {
          // CREDIT
          if (
            ['savings', 'personal savings', 'self', 'own account', 'capital', 'funds trf', 'trf from personal'].some(k =>
              descLower.includes(k)
            )
          ) {
            suggestedClassification = 'CAPITAL_INTRODUCED';
          } else {
            suggestedClassification = 'BUSINESS_DEDUCTIBLE'; // client revenue
          }
        }

        results.push({
          id: `sbi-row-${i}`,
          date: formattedDate,
          description: desc || 'SBI Bank Transaction',
          ref_no: refNo || undefined,
          type: isDebit ? 'DEBIT' : 'CREDIT',
          amount,
          balance,
          suggested_classification: suggestedClassification,
          suggested_category: suggestedCategory,
          suggested_bus_pct: suggestedBusPct,
          selected: true,
        });
      }

      setParsedRows(results);
    } catch (e: any) {
      alert('Error parsing statement: ' + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setRawText(content);
        parseCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const updateRowClassification = (id: string, classification: TaxClassification) => {
    setParsedRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        let busPct = 100;
        if (classification === 'PERSONAL_DRAWINGS' || classification === 'CAPITAL_INTRODUCED') busPct = 0;
        if (classification === 'MIXED_APPORTIONED') busPct = 70;
        return {
          ...row,
          suggested_classification: classification,
          suggested_bus_pct: busPct,
        };
      })
    );
  };

  const toggleRowSelected = (id: string) => {
    setParsedRows(prev =>
      prev.map(row => (row.id === id ? { ...row, selected: !row.selected } : row))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedRows(prev => prev.map(row => ({ ...row, selected: select })));
  };

  const handleImport = async () => {
    const selectedRows = parsedRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert('Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);
    setImportStatus('Importing transactions to your business records...');

    try {
      const payload = {
        transactions: selectedRows.map(r => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          tax_classification: r.suggested_classification,
          business_percentage: r.suggested_bus_pct,
          category: r.suggested_category,
          tag: r.suggested_classification === 'CAPITAL_INTRODUCED' ? 'Capital Introduced' : (r.type === 'DEBIT' ? 'Bank Debit' : 'Revenue'),
          ref_no: r.ref_no,
          notes: `SBI Chakulia Branch A/C 45661497562 | Ref: ${r.ref_no || 'N/A'}`,
        })),
      };

      const res = await fetch('/api/tax/sbi/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import');
      }

      const data = await res.json();
      setImportStatus(
        `Successfully imported ${data.importedExpenses} expense/debit entries and ${data.importedIncomes} income/credit entries!`
      );
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportStatus('Error importing: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = parsedRows.filter(r => r.selected).length;
  const totalDebit = parsedRows
    .filter(r => r.selected && r.type === 'DEBIT')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalCredit = parsedRows
    .filter(r => r.selected && r.type === 'CREDIT')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                SBI Statement CSV Parser & Reconciliation
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Chakulia Branch (SBIN0014355)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A/C: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">45661497562</span> | Parse debits into deductible expenses and credits into Revenue vs Capital Introduced
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Input section */}
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-500" />
                    How to get your SBI Statement CSV:
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    1. Log into <strong>OnlineSBI</strong> or <strong>YONO Business</strong>.
                    <br />
                    2. Go to <strong>My Accounts &gt; Account Statement</strong> &gt; Select A/C <span className="font-mono">45661497562</span>.
                    <br />
                    3. Choose <strong>Download in CSV format</strong>, or copy and paste the statement text below.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRawText(SAMPLE_SBI_CSV);
                    parseCsvText(SAMPLE_SBI_CSV);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors shrink-0"
                >
                  ⚡ Load Sample SBI Statement
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Paste Statement CSV or Tab-Separated Text:
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV File
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your SBI CSV lines here (e.g. Txn Date, Description, Ref No, Debit, Credit, Balance)..."
                  rows={8}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => parseCsvText(rawText)}
                  disabled={!rawText.trim() || isParsing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Parse & Auto-Classify Statement
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Parsed Table Preview */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Parsed <strong>{parsedRows.length}</strong> transactions
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Debits: ₹{totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Credits: ₹{totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Deselect All
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setRawText('');
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-900 dark:text-violet-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Tax Rule Review:</strong> Verify inward credits! Any personal savings transferred from your personal account must be marked as <strong>"CAPITAL_INTRODUCED"</strong> so it is not taxed as business turnover.
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === parsedRows.length}
                          onChange={(e) => toggleSelectAll(e.target.value === 'true' || e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description / Ref</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Tax Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          row.selected ? 'bg-blue-50/20 dark:bg-blue-950/10' : 'opacity-60'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRowSelected(row.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {row.date}
                        </td>
                        <td className="p-3 max-w-[240px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={row.description}>
                            {row.description}
                          </div>
                          {row.ref_no && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ref: {row.ref_no}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {row.type === 'DEBIT' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              DEBIT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              CREDIT
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold whitespace-nowrap">
                          ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <select
                            value={row.suggested_classification}
                            onChange={(e) => updateRowClassification(row.id, e.target.value as TaxClassification)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="BUSINESS_DEDUCTIBLE">Business Deductible (100% u/s 37(1))</option>
                            <option value="PERSONAL_DRAWINGS">Personal Drawings (0% Non-deductible)</option>
                            <option value="MIXED_APPORTIONED">Mixed / Apportioned (70% Business)</option>
                            <option value="CAPITAL_ASSET">Capital Asset (Depreciation u/s 32)</option>
                            <option value="CAPITAL_INTRODUCED">Capital Introduced (Excluded from Turnover)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  importStatus.includes('Error')
                    ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}>
                  {importStatus}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedRows.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Selected <strong>{selectedCount}</strong> items for import
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedCount === 0}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isImporting ? 'Importing...' : `Import ${selectedCount} Items`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
