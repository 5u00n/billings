import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  ChevronRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/button';
import { formatINR } from '../../utils/numberToWords';

export interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date';
  synonyms: string[];
  defaultValue?: any;
}

export interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  entityName: string;
  targetFields: FieldDefinition[];
  sampleData: Record<string, any>[];
  apiEndpoint: string;
  onSuccess: (count: number) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  entityName,
  targetFields,
  sampleData,
  apiEndpoint,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setStep('upload');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 1. Parse File using SheetJS
  const processFile = (selectedFile: File) => {
    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error('Could not read file buffer.');

        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('Spreadsheet does not contain any sheets.');

        const sheet = workbook.Sheets[sheetName];
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        });

        if (!json || json.length === 0) {
          throw new Error('The uploaded spreadsheet contains no data rows.');
        }

        // Extract headers from first row keys
        const headers = Object.keys(json[0] || {});
        if (headers.length === 0) {
          throw new Error('No column headers detected in the first row.');
        }

        setFile(selectedFile);
        setRawHeaders(headers);
        setRawRows(json);

        // Auto-detect mappings based on synonyms
        const initialMapping: Record<string, string> = {};
        targetFields.forEach((field) => {
          const match = headers.find((h) => {
            const cleanHeader = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              cleanHeader === field.key.toLowerCase().replace(/[^a-z0-9]/g, '') ||
              field.synonyms.some((syn) =>
                cleanHeader.includes(syn.toLowerCase().replace(/[^a-z0-9]/g, ''))
              )
            );
          });
          if (match) {
            initialMapping[field.key] = match;
          }
        });

        setColumnMapping(initialMapping);
        setStep('mapping');
      } catch (err: any) {
        console.error('File parsing error:', err);
        setErrorMessage(err.message || 'Failed to parse file. Please verify it is a valid Excel or CSV.');
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read the file.');
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // 2. Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${entityName.toLowerCase().replace(/\s+/g, '_')}_template.csv`);
  };

  // 3. Map & Validate Rows
  const getMappedRows = (): (Record<string, any> & { _index: number; _errors: string[]; _isValid: boolean })[] => {
    return rawRows.map((row, index) => {
      const mapped: Record<string, any> = {};
      const errors: string[] = [];

      targetFields.forEach((field) => {
        const sourceHeader = columnMapping[field.key];
        let val = sourceHeader ? row[sourceHeader] : undefined;

        if (val === undefined || val === null || val === '') {
          val = field.defaultValue !== undefined ? field.defaultValue : '';
        }

        if (field.type === 'number') {
          // Clean currency symbols or commas
          const cleanedNum = typeof val === 'string' ? val.replace(/[₹$,\s]/g, '') : val;
          const parsed = Number(cleanedNum);
          mapped[field.key] = isNaN(parsed) ? 0 : parsed;
          if (field.required && (isNaN(parsed) || parsed <= 0)) {
            errors.push(`${field.label} must be a positive number`);
          }
        } else if (field.type === 'date') {
          // Normalize date to YYYY-MM-DD
          let formattedDate = '';
          if (val instanceof Date) {
            formattedDate = val.toISOString().substring(0, 10);
          } else if (typeof val === 'string' && val.trim()) {
            const trimmed = val.trim();
            // Handle DD/MM/YYYY or DD-MM-YYYY
            if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
              const parts = trimmed.split(/[/-]/);
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(trimmed)) {
              const parts = trimmed.split(/[/-]/);
              formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else {
              const d = new Date(trimmed);
              formattedDate = !isNaN(d.getTime()) ? d.toISOString().substring(0, 10) : '';
            }
          }
          mapped[field.key] = formattedDate || new Date().toISOString().substring(0, 10);
          if (field.required && !formattedDate) {
            errors.push(`Valid ${field.label} date is required`);
          }
        } else {
          mapped[field.key] = typeof val === 'string' ? val.trim() : String(val);
          if (field.required && !mapped[field.key]) {
            errors.push(`${field.label} is required`);
          }
        }
      });

      return {
        _index: index + 1,
        _errors: errors,
        _isValid: errors.length === 0,
        ...mapped,
      };
    });
  };

  const mappedRows = rawRows.length > 0 ? getMappedRows() : [];
  const validRows = mappedRows.filter((r) => r._isValid);
  const invalidRows = mappedRows.filter((r) => !r._isValid);
  const rowsToImport = skipInvalid ? validRows : mappedRows;

  // Compute total amount if amount field exists
  const amountField = targetFields.find((f) => f.key === 'amount' || f.key === 'rate' || f.key === 'default_rate');
  const totalAmount = amountField
    ? rowsToImport.reduce((sum, r) => sum + (Number(r[amountField.key]) || 0), 0)
    : null;

  // 4. Batch Import Execution
  const handleExecuteImport = async () => {
    if (rowsToImport.length === 0) {
      alert('No valid records to import.');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMessage(null);

      // Clean metadata fields (_index, _errors, _isValid) before posting
      const cleanedItems = rowsToImport.map((r) => {
        const item: Record<string, any> = {};
        targetFields.forEach((f) => {
          item[f.key] = r[f.key];
        });
        return item;
      });

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleanedItems }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error (${res.status})`);
      }

      const result = await res.json();
      const count = result.count !== undefined ? result.count : cleanedItems.length;

      onSuccess(count);
      handleClose();
    } catch (err: any) {
      console.error('Import failed:', err);
      setErrorMessage(err.message || 'Import failed. Please check the data format and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click or drag and drop your spreadsheet here
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Supports Excel (.xlsx, .xls) and CSV (.csv, .tsv) files exported from Excel, Google Sheets, or Bank Statements.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                    .XLSX
                  </span>
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                    .CSV
                  </span>
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                    .XLS
                  </span>
                </div>
              </div>

              {/* Sample Template Section */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Need a pre-formatted template?
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Download a ready-to-use spreadsheet with valid headers and sample rows.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </Button>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>
                    Detected <strong>{rawRows.length}</strong> rows with{' '}
                    <strong>{rawHeaders.length}</strong> columns from <strong>{file?.name}</strong>.
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Column Mapping Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Map Spreadsheet Columns to System Fields
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {targetFields.map((field) => {
                    const isMapped = Boolean(columnMapping[field.key]);
                    return (
                      <div
                        key={field.key}
                        className={`p-3 rounded-xl border transition-colors flex flex-col justify-between ${
                          isMapped
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            : field.required
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            {field.label}
                            {field.required && (
                              <span className="text-[10px] text-red-500 font-bold">*Required</span>
                            )}
                          </label>
                          {isMapped ? (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Auto-mapped
                            </span>
                          ) : field.required ? (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Please select
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Optional</span>
                          )}
                        </div>

                        <select
                          value={columnMapping[field.key] || ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium cursor-pointer"
                        >
                          <option value="">-- Not Mapped (Use Default) --</option>
                          {rawHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header} (e.g. &quot;{String(rawRows[0]?.[header] ?? '').slice(0, 20)}&quot;)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Rows</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{mappedRows.length}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Valid Records</span>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{validRows.length}</p>
                </div>
                {invalidRows.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800">
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Issues Found</span>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{invalidRows.length}</p>
                  </div>
                )}
                {totalAmount !== null && (
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200/60 dark:border-blue-800">
                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Total Value</span>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">₹{formatINR(totalAmount)}</p>
                  </div>
                )}
              </div>

              {invalidRows.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-600 dark:text-slate-300">
                    {invalidRows.length} rows have missing or invalid required values.
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={skipInvalid}
                      onChange={(e) => setSkipInvalid(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Skip invalid rows and import {validRows.length} valid entries
                  </label>
                </div>
              )}

              {/* Live Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-12 text-center">#</th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-20">Status</th>
                      {targetFields.map((field) => (
                        <th key={field.key} className="p-2.5 border-b border-slate-200 dark:border-slate-700">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {mappedRows.slice(0, 50).map((row) => (
                      <tr
                        key={row._index}
                        className={row._isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-red-50/40 dark:bg-red-950/20'}
                      >
                        <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{row._index}</td>
                        <td className="p-2.5">
                          {row._isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span
                              title={row._errors.join(', ')}
                              className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold cursor-help"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Invalid
                            </span>
                          )}
                        </td>
                        {targetFields.map((field) => (
                          <td key={field.key} className="p-2.5 font-medium truncate max-w-[180px]">
                            {field.type === 'number'
                              ? `₹${formatINR(Number(row[field.key]) || 0)}`
                              : String(row[field.key] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isImporting} className="text-xs cursor-pointer">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {step === 'mapping' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep('upload')} className="text-xs cursor-pointer">
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep('preview')}
                  disabled={targetFields.some((f) => f.required && !columnMapping[f.key])}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                >
                  Preview Data
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {step === 'preview' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('mapping')}
                  disabled={isImporting}
                  className="text-xs cursor-pointer"
                >
                  Back to Mapping
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={isImporting || rowsToImport.length === 0}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Importing {rowsToImport.length} Records...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Import {rowsToImport.length} Records
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
