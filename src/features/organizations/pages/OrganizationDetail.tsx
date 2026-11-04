import React, { useState, useEffect, useMemo } from 'react';
import { Organization, Invoice, UserProfile } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import { exportInvoiceDocx } from '@/utils/docxExport';
import { printInvoice, downloadInvoicePdf } from '@/utils/pdfExport';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Plus,
  Eye,
  Edit,
  Printer,
  FileDown,
  X,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  Search,
  Wallet,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { InvoicePreview } from '@/features/invoices/components/InvoicePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';

interface OrganizationDetailProps {
  organization: Organization;
  profile: UserProfile;
  fallbackInvoices?: Invoice[];
  onBack: () => void;
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onRefresh: () => void;
}

export const OrganizationDetail: React.FC<OrganizationDetailProps> = ({
  organization,
  profile,
  fallbackInvoices = [],
  onBack,
  onNewInvoice,
  onEditInvoice,
  onRefresh,
}) => {
  const [orgData, setOrgData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);

  // Edit Mode state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(organization.name);
  const [editAddress, setEditAddress] = useState(organization.address || '');
  const [editCity, setEditCity] = useState(organization.city || '');
  const [editState, setEditState] = useState(organization.state || 'Jharkhand');
  const [editPincode, setEditPincode] = useState(organization.pincode || '');
  const [editPhone, setEditPhone] = useState(organization.phone || '');
  const [editEmail, setEmail] = useState(organization.email || '');
  const [editNotes, setEditNotes] = useState(organization.notes || '');

  // Filter state for ledger
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'statement' | 'details'>('invoices');

  useEffect(() => {
    fetchOrgDetails();
  }, [organization.id]);

  const fetchOrgDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizations/${organization.id}`);
      const data = await res.json();
      setOrgData(data);
      if (data) {
        setEditName(data.name);
        setEditAddress(data.address || '');
        setEditCity(data.city || '');
        setEditState(data.state || 'Jharkhand');
        setEditPincode(data.pincode || '');
        setEditPhone(data.phone || '');
        setEmail(data.email || '');
        setEditNotes(data.notes || '');
      }
    } catch (err) {
      console.error('Error fetching org details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          city: editCity,
          state: editState,
          pincode: editPincode,
          country: 'India',
          phone: editPhone,
          email: editEmail,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        await fetchOrgDetails();
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update organization:', err);
    }
  };

  const allInvoices: Invoice[] =
    orgData?.invoices && orgData.invoices.length > 0
      ? orgData.invoices
      : fallbackInvoices && fallbackInvoices.length > 0
      ? fallbackInvoices
      : orgData?.invoices || [];

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // Status filter
      if (statusFilter === 'unpaid' && !(inv.balance_due > 0)) return false;
      if (statusFilter === 'paid' && !(inv.balance_due === 0)) return false;

      // Text search
      if (searchInvoiceQuery.trim()) {
        const q = searchInvoiceQuery.toLowerCase();
        const matchesNumber = inv.invoice_number?.toLowerCase().includes(q);
        const matchesType = inv.doc_type?.toLowerCase().includes(q);
        const matchesDate = inv.invoice_date?.toLowerCase().includes(q);
        const matchesTotal = inv.total?.toString().includes(q);
        if (!matchesNumber && !matchesType && !matchesDate && !matchesTotal) {
          return false;
        }
      }

      return true;
    });
  }, [allInvoices, statusFilter, searchInvoiceQuery]);

  const totalInvoiced =
    orgData?.total_invoiced !== undefined && orgData?.total_invoiced !== null && Number(orgData.total_invoiced) > 0
      ? Number(orgData.total_invoiced)
      : allInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);

  const totalPaid =
    orgData?.total_paid !== undefined && orgData?.total_paid !== null && Number(orgData.total_paid) > 0
      ? Number(orgData.total_paid)
      : allInvoices.reduce((acc, inv) => acc + (Number(inv.amount_paid) || 0), 0);

  const balanceDue =
    orgData?.balance_due !== undefined && orgData?.balance_due !== null
      ? Number(orgData.balance_due)
      : allInvoices.reduce((acc, inv) => acc + (Number(inv.balance_due) || 0), 0);

  const orgName = orgData?.name || organization.name;

  // Export options for this client's invoices
  const clientExportColumns: ExportColumn<Invoice>[] = [
    { header: 'Invoice #', key: 'invoice_number', width: 18, align: 'left' },
    { header: 'Date', key: 'invoice_date', width: 14, align: 'center' },
    { header: 'Type', key: 'doc_type', width: 14, align: 'center' },
    {
      header: 'Status',
      key: 'status',
      width: 14,
      align: 'center',
      format: (v, row) => (row.balance_due === 0 ? 'Paid' : 'Outstanding'),
    },
    {
      header: 'Total Amount',
      key: 'total',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val || 0),
    },
    {
      header: 'Amount Paid',
      key: 'amount_paid',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val || 0),
    },
    {
      header: 'Balance Due',
      key: 'balance_due',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val || 0),
    },
  ];

  const clientExportOptions = {
    filename: `${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_Statement_${new Date().toISOString().slice(0, 10)}`,
    title: `${orgName} - Billing & Invoice Statement`,
    subtitle: `Ledger summary for ${allInvoices.length} bill(s)`,
    sheetName: 'Client Ledger',
    columns: clientExportColumns,
    data: allInvoices,
    profile,
    summaryMetrics: [
      { label: 'Total Billed', value: formatCurrencyForPdf(totalInvoiced) },
      { label: 'Total Paid', value: formatCurrencyForPdf(totalPaid) },
      { label: 'Outstanding Balance', value: formatCurrencyForPdf(balanceDue) },
    ],
  };

  const settlementPercent = totalInvoiced > 0 ? Math.min(100, Math.round(((totalInvoiced - balanceDue) / totalInvoiced) * 100)) : 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 self-start shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Organizations</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <ExportActions exportOptions={clientExportOptions} size="sm" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditModal(true)}
            className="gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
          >
            <Edit className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Edit Data</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={printInvoice}
            className="gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
            title="Print Account Statement"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Print Ledger</span>
          </Button>

          <Button
            onClick={onNewInvoice}
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Bill</span>
          </Button>
        </div>
      </div>

      {/* Organization Header & Profile Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col lg:flex-row justify-between gap-5 sm:gap-6">
          <div className="space-y-4 flex-1 min-w-0">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xs shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
                    {orgName}
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-semibold border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shrink-0"
                  >
                    Client Workspace
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dedicated Ledger, Invoice Records & Statement of Account
                </p>
              </div>
            </div>

            {/* Details bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              {(orgData?.address || organization.address) && (
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">
                    {orgData?.address || organization.address},{' '}
                    {[orgData?.city || organization.city, orgData?.state || organization.state, orgData?.pincode || organization.pincode].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {(orgData?.phone || organization.phone) && (
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{orgData?.phone || organization.phone}</span>
                </div>
              )}
              {(orgData?.email || organization.email) && (
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{orgData?.email || organization.email}</span>
                </div>
              )}
              {(orgData?.notes || organization.notes) && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 italic min-w-0">
                  <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">Note: {orgData?.notes || organization.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Metrics for this Client */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
            {/* Total Invoiced */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 sm:min-w-[130px] flex flex-row sm:flex-col justify-between items-center sm:items-center text-left sm:text-center gap-2">
              <div className="flex items-center sm:justify-between w-full sm:w-auto gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Invoiced</span>
                <Receipt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 sm:ml-auto" />
              </div>
              <div className="text-right sm:text-center shrink-0 sm:shrink">
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight sm:my-1">
                  ₹{formatINR(totalInvoiced)}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {allInvoices.length} {allInvoices.length === 1 ? 'bill' : 'bills'} issued
                </p>
              </div>
            </div>

            {/* Total Paid */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 sm:p-4 rounded-xl border border-emerald-100/80 dark:border-emerald-900/50 sm:min-w-[130px] flex flex-row sm:flex-col justify-between items-center sm:items-center text-left sm:text-center gap-2">
              <div className="flex items-center sm:justify-between w-full sm:w-auto gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                <span>Total Paid</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 sm:ml-auto" />
              </div>
              <div className="text-right sm:text-center shrink-0 sm:shrink">
                <div className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono tracking-tight sm:my-1">
                  ₹{formatINR(totalPaid)}
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400/90 whitespace-nowrap">
                  {settlementPercent}% cleared
                </p>
              </div>
            </div>

            {/* Balance Due */}
            <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3.5 sm:p-4 rounded-xl border border-blue-100/80 dark:border-blue-900/50 sm:min-w-[130px] flex flex-row sm:flex-col justify-between items-center sm:items-center text-left sm:text-center gap-2">
              <div className="flex items-center sm:justify-between w-full sm:w-auto gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                <span>Balance Due</span>
                <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0 sm:ml-auto" />
              </div>
              <div className="text-right sm:text-center shrink-0 sm:shrink">
                <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 font-mono tracking-tight sm:my-1">
                  ₹{formatINR(balanceDue)}
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400/90 whitespace-nowrap">
                  {balanceDue > 0 ? 'Outstanding' : 'No balance due'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs / Segmented Controls */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 no-print overflow-x-auto">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bills & Invoices</span>
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'invoices'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {allInvoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'statement'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Statement of Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Client Profile Details</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Invoices & Bills Table */}
      {activeTab === 'invoices' && (
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Filter Bills:
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
                <Button
                  variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={`h-7 px-2.5 text-xs ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({allInvoices.length})
                </Button>
                <Button
                  variant={statusFilter === 'unpaid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('unpaid')}
                  className={`h-7 px-2.5 text-xs ${
                    statusFilter === 'unpaid'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                  }`}
                >
                  Outstanding ({allInvoices.filter((i) => i.balance_due > 0).length})
                </Button>
                <Button
                  variant={statusFilter === 'paid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('paid')}
                  className={`h-7 px-2.5 text-xs ${
                    statusFilter === 'paid'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300'
                  }`}
                >
                  Fully Paid ({allInvoices.filter((i) => i.balance_due === 0).length})
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder="Filter bills..."
                  value={searchInvoiceQuery}
                  onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                  className="pl-8 pr-7 h-7 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {searchInvoiceQuery && (
                  <button
                    onClick={() => setSearchInvoiceQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <Button
                onClick={onNewInvoice}
                size="sm"
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bill</span>
              </Button>
            </div>
          </CardHeader>

          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400 dark:text-slate-500">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {searchInvoiceQuery ? 'No bills match your search' : 'No bills found'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {searchInvoiceQuery ? 'Try clearing or changing your search criteria.' : 'Create a bill to track invoices and payments for this client.'}
              </p>
              {searchInvoiceQuery ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchInvoiceQuery('')}
                  className="mt-3 text-xs dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Clear Search
                </Button>
              ) : (
                <Button
                  onClick={onNewInvoice}
                  size="sm"
                  className="mt-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs text-xs"
                >
                  Create Bill
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-xs border-collapse">
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                  <TableRow>
                    <TableHead className="py-3 px-4">Status</TableHead>
                    <TableHead className="py-3 px-4">Date</TableHead>
                    <TableHead className="py-3 px-4">Invoice #</TableHead>
                    <TableHead className="py-3 px-4">Type</TableHead>
                    <TableHead className="py-3 px-4 text-right">Total</TableHead>
                    <TableHead className="py-3 px-4 text-right">Paid</TableHead>
                    <TableHead className="py-3 px-4 text-right">Balance Due</TableHead>
                    <TableHead className="py-3 px-4 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        {inv.balance_due === 0 ? (
                          <Badge
                            variant="default"
                            className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-[10px]"
                          >
                            Paid
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[10px]"
                          >
                            Outstanding
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <Button
                          variant="link"
                          onClick={() => setPreviewingInvoice(inv)}
                          className="p-0 h-auto font-mono font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {inv.invoice_number}
                        </Button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/80 dark:border-slate-700/80">
                          {inv.doc_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        ₹{formatINR(inv.total)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        ₹{formatINR(inv.amount_paid || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {inv.balance_due === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹0.00</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            ₹{formatINR(inv.balance_due)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewingInvoice(inv)}
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditInvoice(inv)}
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadInvoicePdf(inv, profile)}
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => exportInvoiceDocx(inv, profile)}
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Export Word Document"
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
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
      )}

      {/* Tab 2: Statement of Account */}
      {activeTab === 'statement' && (
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Statement of Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client: <span className="font-semibold text-slate-800 dark:text-slate-200">{orgName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportActions exportOptions={clientExportOptions} size="sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={printInvoice}
                className="gap-1.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Print Statement</span>
              </Button>
            </div>
          </div>

          {/* 4-Metric Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Total Billed
              </span>
              <p className="font-mono font-bold text-slate-900 dark:text-white text-base">
                ₹{formatINR(totalInvoiced)}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{allInvoices.length} invoices</p>
            </div>
            <div className="space-y-1">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold uppercase text-[10px] tracking-wider">
                Total Paid
              </span>
              <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                ₹{formatINR(totalPaid)}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Collected</p>
            </div>
            <div className="space-y-1">
              <span className="text-blue-700 dark:text-blue-400 font-semibold uppercase text-[10px] tracking-wider">
                Balance Due
              </span>
              <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base">
                ₹{formatINR(balanceDue)}
              </p>
              <p className="text-[10px] text-blue-500 dark:text-blue-400">Receivable</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Settlement
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                {settlementPercent}% Cleared
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${settlementPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader className="bg-slate-50 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                <TableRow>
                  <TableHead className="py-2.5 px-3">Date</TableHead>
                  <TableHead className="py-2.5 px-3">Document #</TableHead>
                  <TableHead className="py-2.5 px-3">Type</TableHead>
                  <TableHead className="py-2.5 px-3 text-right">Invoiced Amount</TableHead>
                  <TableHead className="py-2.5 px-3 text-right">Payment Received</TableHead>
                  <TableHead className="py-2.5 px-3 text-right">Balance Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {allInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <TableCell className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {inv.invoice_date}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {inv.doc_type}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{formatINR(inv.total)}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{formatINR(inv.amount_paid || 0)}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      ₹{formatINR(inv.balance_due)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Tab 3: Client Profile Details */}
      {activeTab === 'details' && (
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Organization Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Client details, billing address, and records</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs text-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                Organization Name
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm pt-0.5">{orgName}</p>
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                Phone Number
              </span>
              <p className="font-semibold text-slate-900 dark:text-white pt-0.5">
                {orgData?.phone || organization.phone || 'Not specified'}
              </p>
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                Email Address
              </span>
              <p className="font-semibold text-slate-900 dark:text-white pt-0.5">
                {orgData?.email || organization.email || 'Not specified'}
              </p>
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Location
              </span>
              <p className="font-semibold text-slate-900 dark:text-white pt-0.5">
                {[orgData?.city || organization.city, orgData?.state || organization.state, orgData?.pincode || organization.pincode, orgData?.country || organization.country || 'India'].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="md:col-span-2 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Full Street Address
              </span>
              <p className="font-semibold text-slate-900 dark:text-white pt-0.5">
                {orgData?.address || organization.address || 'Not specified'}
              </p>
            </div>

            {(orgData?.notes || organization.notes) && (
              <div className="md:col-span-2 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Internal Notes
                </span>
                <p className="text-slate-700 dark:text-slate-300 pt-0.5">
                  {orgData?.notes || organization.notes}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Edit Organization Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                <Building2 className="w-4 h-4" />
              </div>
              <span>Edit Organization Information</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateOrg} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Organization / Client Name *
              </label>
              <Input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Street Address
              </label>
              <textarea
                rows={2}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">City</label>
                <Input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">State</label>
                <Input
                  type="text"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pincode</label>
                <Input
                  type="text"
                  value={editPincode}
                  onChange={(e) => setEditPincode(e.target.value)}
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                <Input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <Input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
                className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Modal */}
      {previewingInvoice && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col z-50 overflow-hidden animate-in fade-in duration-200 print:static print:bg-white print:overflow-visible print:p-0">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between no-print shadow-xs">
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {previewingInvoice.invoice_number}
            </span>
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
                className="gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportInvoiceDocx(previewingInvoice, profile)}
                className="gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/60"
              >
                <FileDown className="w-3.5 h-3.5" />
                Word DOCX
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewingInvoice(null)}
                className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-slate-900/10 dark:bg-slate-950/80 flex justify-center print:p-0 print:bg-white print:overflow-visible">
            <div className="w-full max-w-[210mm] print:max-w-none">
              <InvoicePreview invoice={previewingInvoice} profile={profile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
