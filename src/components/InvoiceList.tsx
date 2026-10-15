import React, { useState } from 'react';
import { Invoice, Organization, UserProfile } from '../types';
import { formatINR } from '../utils/numberToWords';
import { exportInvoiceDocx } from '../utils/docxExport';
import { printInvoice, downloadInvoicePdf } from '../utils/pdfExport';
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
} from 'lucide-react';
import { InvoicePreview } from './InvoicePreview';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

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
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.organization?.name && inv.organization.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesOrg = selectedOrg === 'all' || inv.organization_id === selectedOrg;
    const matchesType = selectedType === 'all' || inv.doc_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus;

    return matchesSearch && matchesOrg && matchesType && matchesStatus;
  });

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
        <Button
          onClick={onNewInvoice}
          className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </Button>
      </div>

      {/* Filters Bar with Tailwind & shadcn Inputs */}
      <Card className="p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice # or client organization..."
              className="pl-8 text-xs h-9 bg-slate-50/50"
            />
          </div>

          {/* Org Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Document Types</option>
              <option value="BILL OF SUPPLY">Bill of Supply</option>
              <option value="INVOICE">Standard Invoice</option>
              <option value="ESTIMATE">Estimate</option>
              <option value="PROFORMA">Proforma</option>
              <option value="RECEIPT">Receipt</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2.5 bg-slate-50 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
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
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Organization / Client</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{inv.invoice_date}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <button
                        onClick={() => setPreviewingInvoice(inv)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {inv.organization_id && onSelectOrg ? (
                        <button
                          onClick={() => onSelectOrg(inv.organization_id)}
                          className="text-slate-900 hover:text-blue-600 hover:underline cursor-pointer font-bold text-left"
                        >
                          {inv.organization?.name || 'Unknown'}
                        </button>
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
              </tbody>
            </table>
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
      {paymentModalInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Record received payment for <span className="font-semibold text-slate-800">{paymentModalInvoice.invoice_number}</span> ({paymentModalInvoice.organization?.name})
            </p>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
          </div>
        </div>
      )}
    </div>
  );
};
