import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { ExportOptions, exportToExcel, exportToPdf } from '../../utils/dataExport';

export interface ExportActionsProps<T = any> {
  exportOptions: ExportOptions<T>;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export const ExportActions = <T,>({
  exportOptions,
  disabled = false,
  size = 'sm',
  className = '',
}: ExportActionsProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingType, setExportingType] = useState<'excel' | 'pdf' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const itemCount = exportOptions.data.length;
  const isActionDisabled = disabled || itemCount === 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportExcel = async () => {
    try {
      setExportingType('excel');
      await exportToExcel(exportOptions);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    } finally {
      setExportingType(null);
      setIsOpen(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      await exportToPdf(exportOptions);
    } catch (err) {
      console.error('Failed to export to PDF:', err);
    } finally {
      setExportingType(null);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={isActionDisabled || exportingType !== null}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 font-medium border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
        title={
          itemCount === 0
            ? 'No records to export'
            : `Export ${itemCount} record${itemCount === 1 ? '' : 's'} to Excel or PDF`
        }
      >
        {exportingType ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        ) : (
          <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        )}
        <span>Export</span>
        {itemCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
            {itemCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Export {itemCount} filtered record{itemCount === 1 ? '' : 's'}
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingType !== null}
              className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-2.5 transition-colors group"
            >
              <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Excel Spreadsheet</span>
                <span className="text-[10px] text-slate-400">Microsoft Excel (.xlsx)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingType !== null}
              className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-2.5 transition-colors group"
            >
              <div className="p-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Vector PDF Document</span>
                <span className="text-[10px] text-slate-400">Printable Letterhead (.pdf)</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

