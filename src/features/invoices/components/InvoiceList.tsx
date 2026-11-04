import React, { useState } from 'react';
import { Invoice, Organization, UserProfile } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import { exportInvoiceDocx } from '@/utils/docxExport';
import { printInvoice, downloadInvoicePdf } from '@/utils/pdfExport';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Printer,
  FileDown,
  Trash2,
  CheckCircle,
  Copy,
  Plus,
  Building2,
  X,
  CreditCard,
  FileText,
  Banknote,
  ArrowUpDown,
} from 'lucide-react';
import { InvoicePreview } from './InvoicePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { DistinctDropdownFilter, DistinctFilterOption } from '@/components/common/DistinctDropdownFilter';
import { FilterChipsBar, ActiveFilterChip } from '@/components/common/FilterChipsBar';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';

interface InvoiceListProps {
  invoices: Invoice[];
  organizations: Organization[];
  profile: UserProfile;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (invoice: Invoice) => void;
  onStatusChange: (id: string, status: Invoice['status'], amountPaid?: number) => Promise<void>;
  onNewInvoice: () => void;
  onSelectOrg?: (orgId: string) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  organizations,
  profile,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onNewInvoice,
  onSelectOrg,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAmountBand, setSelectedAmountBand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Distinct organization options with invoice counts
  const orgCounts = invoices.reduce((acc, inv) => {
    if (inv.organization_id) acc[inv.organization_id] = (acc[inv.organization_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orgOptions: DistinctFilterOption[] = organizations.map((org) => ({
    value: org.id,
    label: org.name,
    count: orgCounts[org.id] || 0,
  }));

  // Distinct document types with counts
  const docTypeCounts = invoices.reduce((acc, inv) => {
    if (inv.doc_type) acc[inv.doc_type] = (acc[inv.doc_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const docTypeOptions: DistinctFilterOption[] = [
    { value: 'BILL OF SUPPLY', label: 'Bill of Supply', count: docTypeCounts['BILL OF SUPPLY'] || 0 },
    { value: 'INVOICE', label: 'Standard Invoice', count: docTypeCounts['INVOICE'] || 0 },
    { value: 'ESTIMATE', label: 'Estimate', count: docTypeCounts['ESTIMATE'] || 0 },
    { value: 'PROFORMA', label: 'Proforma', count: docTypeCounts['PROFORMA'] || 0 },
    { value: 'RECEIPT', label: 'Receipt', count: docTypeCounts['RECEIPT'] || 0 },
  ].filter((opt) => opt.count! > 0 || docTypeCounts[opt.value] !== undefined);

  // Distinct status options with counts
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusOptions: DistinctFilterOption[] = [
    { value: 'issued', label: 'Issued', count: statusCounts['issued'] || 0 },
    { value: 'paid', label: 'Paid', count: statusCounts['paid'] || 0 },
    { value: 'draft', label: 'Draft', count: statusCounts['draft'] || 0 },
    { value: 'overdue', label: 'Overdue', count: statusCounts['overdue'] || 0 },
  ];

  // Amount band options with counts
  const amountBandOptions: DistinctFilterOption[] = [
    { value: 'under_10k', label: 'Under ₹10,000', count: invoices.filter((i) => i.total < 10000).length },
    { value: '10k_50k', label: '₹10,000 – ₹50,000', count: invoices.filter((i) => i.total >= 10000 && i.total <= 50000).length },
    { value: '50k_200k', label: '₹50,000 – ₹2,00,000', count: invoices.filter((i) => i.total > 50000 && i.total <= 200000).length },
    { value: 'above_200k', label: 'Above ₹2,00,000', count: invoices.filter((i) => i.total > 200000).length },
  ];

  const sortOptions: DistinctFilterOption[] = [
    { value: 'date_desc', label: 'Date: Newest First' },
    { value: 'date_asc', label: 'Date: Oldest First' },
    { value: 'amount_desc', label: 'Total: High to Low' },
    { value: 'amount_asc', label: 'Total: Low to High' },
  ];

  const filtered = invoices
    .filter((inv) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.organization?.name && inv.organization.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesOrg = selectedOrg === 'all' || inv.organization_id === selectedOrg;
      const matchesType = selectedType === 'all' || inv.doc_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus;

      // Amount bands
      if (selectedAmountBand === 'under_10k' && inv.total >= 10000) return false;
      if (selectedAmountBand === '10k_50k' && (inv.total < 10000 || inv.total > 50000)) return false;
      if (selectedAmountBand === '50k_200k' && (inv.total < 50000 || inv.total > 200000)) return false;
      if (selectedAmountBand === 'above_200k' && inv.total <= 200000) return false;

      return matchesSearch && matchesOrg && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') return (a.invoice_date || '').localeCompare(b.invoice_date || '');
      if (sortBy === 'amount_desc') return b.total - a.total;
      if (sortBy === 'amount_asc') return a.total - b.total;
      return (b.invoice_date || '').localeCompare(a.invoice_date || '');
    });

  // Active filter chips
  const activeChips: ActiveFilterChip[] = [];
  if (selectedOrg !== 'all') {
    const org = organizations.find((o) => o.id === selectedOrg);
    activeChips.push({
      key: 'org',
      label: 'Client',
      valueDisplay: org ? org.name : selectedOrg,
      onRemove: () => setSelectedOrg('all'),
    });
  }
  if (selectedType !== 'all') {
    activeChips.push({
      key: 'type',
      label: 'Type',
      valueDisplay: selectedType,
      onRemove: () => setSelectedType('all'),
    });
  }
  if (selectedStatus !== 'all') {
    activeChips.push({
      key: 'status',
      label: 'Status',
      valueDisplay: selectedStatus.toUpperCase(),
      onRemove: () => setSelectedStatus('all'),
    });
  }
  if (selectedAmountBand !== 'all') {
    const opt = amountBandOptions.find((o) => o.value === selectedAmountBand);
    activeChips.push({
      key: 'amount',
      label: 'Amount',
      valueDisplay: opt ? opt.label : selectedAmountBand,
      onRemove: () => setSelectedAmountBand('all'),
    });
  }
  if (searchTerm.trim()) {
    activeChips.push({
      key: 'search',
      label: 'Search',
      valueDisplay: `"${searchTerm.trim()}"`,
      onRemove: () => setSearchTerm(''),
    });
  }

  const handleClearAllFilters = () => {
    setSelectedOrg('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedAmountBand('all');
    setSearchTerm('');
  };

  const totalInvoiced = filtered.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = filtered.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalDue = Math.max(0, totalInvoiced - totalPaid);

  const exportColumns: ExportColumn<Invoice>[] = [
    { header: 'Invoice #', key: 'invoice_number', width: 14, align: 'center' },
    {
      header: 'Type',
      key: 'invoice_type',
      width: 14,
      align: 'center',
      format: (val) => val || 'Bill of Supply',
    },
    { header: 'Date', key: 'invoice_date', width: 12, align: 'center' },
    {
      header: 'Due Date',
      key: 'due_date',
      width: 12,
      align: 'center',
      format: (val) => val || '-',
    },
    {
      header: 'Client / Organization',
      key: 'organization_id',
      width: 26,
      align: 'left',
      format: (id) => organizations.find((o) => o.id === id)?.name || id || 'Individual / Walk-in',
    },
    {
      header: 'Status',
      key: 'status',
      width: 12,
      align: 'center',
      format: (val) => String(val || 'draft').toUpperCase(),
    },
    {
      header: 'Paid Amount',
      key: 'amount_paid',
      width: 15,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val || 0),
    },
    {
      header: 'Total Amount',
      key: 'total',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val),
    },
    {
      header: 'Balance Due',
      key: 'balance_due',
      width: 16,
      align: 'right',
      isNumeric: true,
      format: (_, inv) => Math.max(0, inv.total - (inv.amount_paid || 0)),
      formatPdf: (_, inv) => formatCurrencyForPdf(Math.max(0, inv.total - (inv.amount_paid || 0))),
    },
  ];

  const exportOptions = {
    filename: `Invoices_Ledger_${new Date().toISOString().slice(0, 10)}`,
    title: 'Invoices & Billing Records Report',
    subtitle: `Exported ${filtered.length} invoice records matching applied filters`,
    sheetName: 'Invoices',
    columns: exportColumns,
    data: filtered,
    profile,
    summaryMetrics: [
      { label: 'Total Invoiced', value: formatCurrencyForPdf(totalInvoiced) },
      { label: 'Total Collected', value: formatCurrencyForPdf(totalPaid) },
      { label: 'Total Due', value: formatCurrencyForPdf(totalDue) },
      { label: 'Bills Exported', value: `${filtered.length} of ${invoices.length}` },
    ],
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'issued':
        return <Badge variant="default" className="bg-blue-50 text-blue-700 border border-blue-200">Issued</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'draft':
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const newPaid = (paymentModalInvoice.amount_paid || 0) + Number(paymentAmount);
    const newStatus = newPaid >= paymentModalInvoice.total ? 'paid' : 'issued';

    await onStatusChange(paymentModalInvoice.id, newStatus, newPaid);
    setPaymentModalInvoice(null);
    setPaymentAmount(0);
  };

  return (
    <div className="p-8  space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoices & Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issued bills of supply, standard invoices, estimates, and payment tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportActions exportOptions={exportOptions} size="default" />
          <Button
            onClick={onNewInvoice}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Bill</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar with Distinct Dropdown Filters */}
      <Card className="p-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice # or client organization..."
              className="pl-8 text-xs h-8 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Org Filter */}
            <DistinctDropdownFilter
              label="Client"
              icon={Building2}
              value={selectedOrg}
              onChange={setSelectedOrg}
              options={orgOptions}
              allLabel="All Clients"
            />

            {/* Type Filter */}
            <DistinctDropdownFilter
              label="Type"
              icon={FileText}
              value={selectedType}
              onChange={setSelectedType}
              options={docTypeOptions}
              allLabel="All Types"
            />

            {/* Status Filter */}
            <DistinctDropdownFilter
              label="Status"
              icon={CreditCard}
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              allLabel="All Statuses"
            />

            {/* Amount Band Filter */}
            <DistinctDropdownFilter
              label="Amount"
              icon={Banknote}
              value={selectedAmountBand}
              onChange={setSelectedAmountBand}
              options={amountBandOptions}
              allLabel="Any Amount"
            />

            {/* Sort Filter */}
            <DistinctDropdownFilter
              label="Sort"
              icon={ArrowUpDown}
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              allLabel="Date: Newest"
              align="right"
            />

            {/* Export Actions (Excel & PDF) */}
            <ExportActions exportOptions={exportOptions} />
          </div>
        </div>

        {/* Active Chips & Counter */}
        <FilterChipsBar
          chips={activeChips}
          onClearAll={handleClearAllFilters}
          filteredCount={filtered.length}
          totalCount={invoices.length}
          itemNoun="invoices"
        />
      </Card>

      {/* Invoices Data Table */}
      <Card className="overflow-hidden shadow-2xs">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-sm font-medium">No records match your filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters or create a new bill.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <TableRow>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4">Date</TableHead>
                  <TableHead className="py-3 px-4">Invoice #</TableHead>
                  <TableHead className="py-3 px-4">Organization / Client</TableHead>
                  <TableHead className="py-3 px-4">Type</TableHead>
                  <TableHead className="py-3 px-4 text-right">Amount</TableHead>
                  <TableHead className="py-3 px-4 text-right">Balance Due</TableHead>
                  <TableHead className="py-3 px-4 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{inv.invoice_date}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <Button
                        variant="link"
                        onClick={() => setPreviewingInvoice(inv)}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto font-mono font-semibold"
                      >
                        {inv.invoice_number}
                      </Button>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {inv.organization_id && onSelectOrg ? (
                        <Button
                          variant="link"
                          onClick={() => onSelectOrg(inv.organization_id)}
                          className="text-slate-900 hover:text-blue-600 p-0 h-auto font-bold text-left justify-start"
                        >
                          {inv.organization?.name || 'Unknown'}
                        </Button>
                      ) : (
                        inv.organization?.name || 'Unknown'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                        {inv.doc_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{formatINR(inv.total)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {inv.balance_due === 0 ? (
                        <span className="text-emerald-600 font-bold">₹0.00</span>
                      ) : (
                        <span className="text-slate-900">₹{formatINR(inv.balance_due)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewingInvoice(inv)}
                          title="Preview"
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(inv)}
                          title="Edit"
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadInvoicePdf(inv, profile)}
                          title="Download PDF"
                          className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <FileDown className="w-3.5 h-3.5 text-rose-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => exportInvoiceDocx(inv, profile)}
                          title="Export Word Document"
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPreviewingInvoice(inv);
                            setTimeout(() => printInvoice(), 200);
                          }}
                          title="Print"
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {inv.balance_due > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPaymentModalInvoice(inv);
                              setPaymentAmount(inv.balance_due);
                            }}
                            title="Record Payment"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDuplicate(inv)}
                          title="Duplicate"
                          className="h-7 w-7 text-slate-500 hover:text-purple-600"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${inv.invoice_number}?`)) {
                              onDelete(inv.id);
                            }
                          }}
                          title="Delete"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Full Screen Preview Modal */}
      {previewingInvoice && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col z-50 overflow-hidden animate-in fade-in duration-200 print:static print:bg-white print:overflow-visible print:p-0">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between no-print shadow-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-900 text-sm">{previewingInvoice.invoice_number}</span>
              <Badge variant="default" className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                {previewingInvoice.doc_type}
              </Badge>
              <span className="text-xs text-slate-400">
                Client: {previewingInvoice.organization?.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => downloadInvoicePdf(previewingInvoice, profile)}
                className="gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={printInvoice}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportInvoiceDocx(previewingInvoice, profile)}
                className="gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download DOCX
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewingInvoice(null)}
                className="h-8 w-8 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-900/10 flex justify-center print:p-0 print:bg-white print:overflow-visible">
            <div className="w-full max-w-[210mm] print:max-w-none">
              <InvoicePreview invoice={previewingInvoice} profile={profile} />
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Dialog
        open={!!paymentModalInvoice}
        onOpenChange={(open) => {
          if (!open) setPaymentModalInvoice(null);
        }}
      >
        <DialogContent className="max-w-sm p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <DialogTitle className="text-sm font-bold">Record Payment</DialogTitle>
            </div>
            {paymentModalInvoice && (
              <DialogDescription className="text-xs text-slate-500">
                Record received payment for{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {paymentModalInvoice.invoice_number}
                </span>{' '}
                ({paymentModalInvoice.organization?.name})
              </DialogDescription>
            )}
          </DialogHeader>

          {paymentModalInvoice && (
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount Received (₹)
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Outstanding Balance: ₹{formatINR(paymentModalInvoice.balance_due)}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentModalInvoice(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Confirm Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
