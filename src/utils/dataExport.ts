import * as XLSX from 'xlsx';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { UserProfile } from '../types';
import { TabularPdfDocument, TabularPdfColumn, TabularPdfSummaryMetric } from '../components/common/TabularPdfDocument';
import { formatINR } from './numberToWords';

export interface ExportColumn<T = any> {
  header: string;
  key: string;
  width?: number; // relative flex for PDF, character width for Excel
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean; // When true, written as numeric cell in Excel
  format?: (value: any, row: T) => string | number;
  formatPdf?: (value: any, row: T) => string;
}

export interface ExportOptions<T = any> {
  filename: string; // e.g. "expense_ledger_nov_2026"
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: ExportColumn<T>[];
  data: T[];
  summaryMetrics?: { label: string; value: string | number }[];
  profile?: UserProfile | null;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Format currency amount for vector PDF (uses "Rs." prefix to avoid non-ASCII symbol glyph issues in PDF).
 */
export function formatCurrencyForPdf(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return 'Rs. 0.00';
  return `Rs. ${formatINR(num)}`;
}

/**
 * Exports data to a clean, formatted Microsoft Excel (.xlsx) file.
 * Automatically formats numeric fields so Excel formulas (=SUM, =AVERAGE) work natively.
 */
export async function exportToExcel<T = any>(options: ExportOptions<T>): Promise<void> {
  const {
    filename,
    title,
    subtitle,
    sheetName = 'Report',
    columns,
    data,
    summaryMetrics,
    profile,
  } = options;

  const rows: any[][] = [];

  // 1. Title Block
  rows.push([title]);
  if (subtitle) {
    rows.push([subtitle]);
  }
  rows.push([`Generated on: ${new Date().toLocaleString('en-IN')}`]);
  if (profile?.name) {
    rows.push([`Exported by: ${profile.name}${profile.email ? ` (${profile.email})` : ''}`]);
  }
  rows.push([]); // blank separator

  // 2. Summary Metrics Block (if present)
  if (summaryMetrics && summaryMetrics.length > 0) {
    rows.push(['SUMMARY OVERVIEW']);
    summaryMetrics.forEach((m) => {
      rows.push([m.label, m.value]);
    });
    rows.push([]); // blank separator
  }

  // 3. Table Header
  const headerRow = columns.map((c) => c.header);
  rows.push(headerRow);

  // 4. Data Rows
  let numericTotals: Record<number, number> = {};

  data.forEach((item) => {
    const rowValues = columns.map((col, colIdx) => {
      const rawVal = (item as any)[col.key];
      if (col.format) {
        const formatted = col.format(rawVal, item);
        if (col.isNumeric) {
          const num = typeof formatted === 'number' ? formatted : parseFloat(String(formatted));
          const safeNum = isNaN(num) ? 0 : num;
          numericTotals[colIdx] = (numericTotals[colIdx] || 0) + safeNum;
          return safeNum;
        }
        return formatted;
      }

      if (col.isNumeric) {
        const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || 0));
        const safeNum = isNaN(num) ? 0 : num;
        numericTotals[colIdx] = (numericTotals[colIdx] || 0) + safeNum;
        return safeNum;
      }

      return rawVal ?? '';
    });
    rows.push(rowValues);
  });

  // 5. Total Row (if there are numeric columns)
  const hasNumeric = Object.keys(numericTotals).length > 0;
  if (hasNumeric && data.length > 0) {
    const totalRow = columns.map((col, colIdx) => {
      if (colIdx === 0) return 'TOTAL / SUMMARY';
      if (col.isNumeric && numericTotals[colIdx] !== undefined) {
        return Math.round(numericTotals[colIdx] * 100) / 100;
      }
      return '';
    });
    rows.push(totalRow);
  }

  // Build SheetJS Workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = columns.map((col, colIdx) => {
    let maxLen = col.header.length;
    data.forEach((item) => {
      const rawVal = (item as any)[col.key];
      const strVal = String(rawVal ?? '');
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, col.width || 12), 60) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  // Sanitize filename
  const cleanFilename = filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename}.xlsx`;

  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Exports data to a publication-ready Vector PDF file.
 */
export async function exportToPdf<T = any>(options: ExportOptions<T>): Promise<void> {
  const {
    filename,
    title,
    subtitle,
    columns,
    data,
    summaryMetrics,
    profile,
    orientation = columns.length > 6 ? 'landscape' : 'portrait',
  } = options;

  // Adapt columns for PDF
  const pdfColumns: TabularPdfColumn[] = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 1,
    align: c.align || (c.isNumeric ? 'right' : 'left'),
    format: (val, row) => {
      if (c.formatPdf) return c.formatPdf(val, row);
      if (c.isNumeric) return formatCurrencyForPdf(val);
      if (c.format) return String(c.format(val, row));
      return val != null ? String(val) : '-';
    },
  }));

  // Adapt summary metrics
  const pdfMetrics: TabularPdfSummaryMetric[] = (summaryMetrics || []).map((m) => ({
    label: m.label,
    value: typeof m.value === 'number' ? formatCurrencyForPdf(m.value) : String(m.value),
  }));

  const docElement = React.createElement(TabularPdfDocument, {
    title,
    subtitle,
    columns: pdfColumns,
    data,
    summaryMetrics: pdfMetrics,
    profile,
    orientation,
  });

  const blob = await pdf(docElement as any).toBlob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

