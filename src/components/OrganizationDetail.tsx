import React, { useState, useEffect } from 'react';
import { Organization, Invoice, UserProfile } from '../types';
import { formatINR } from '../utils/numberToWords';
import { exportInvoiceDocx } from '../utils/docxExport';
import { printInvoice, downloadInvoicePdf } from '../utils/pdfExport';
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
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { InvoicePreview } from './InvoicePreview';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';

interface OrganizationDetailProps {
  organization: Organization;
  profile: UserProfile;
  onBack: () => void;
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onRefresh: () => void;
}

export const OrganizationDetail: React.FC<OrganizationDetailProps> = ({
  organization,
  profile,
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
  const [editEmail, setEditEmail] = useState(organization.email || '');
  const [editNotes, setEditNotes] = useState(organization.notes || '');

  // Filter state for ledger
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
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
        setEditEmail(data.email || '');
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

  const allInvoices: Invoice[] = orgData?.invoices || [];

  const invoices = allInvoices.filter((inv) => {
    if (statusFilter === 'unpaid') return inv.balance_due > 0;
    if (statusFilter === 'paid') return inv.balance_due === 0;
    return true;
  });

  const totalInvoiced = orgData?.total_invoiced || 0;
  const totalPaid = orgData?.total_paid || 0;
  const balanceDue = orgData?.balance_due || 0;

  return (
    <div className="p-8  space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Organizations
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditModal(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Edit className="w-3.5 h-3.5 text-slate-600" />
            <span>Edit Organization Data</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={printInvoice}
            className="gap-1.5 text-xs font-semibold"
            title="Print Account Statement"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Ledger</span>
          </Button>

          <Button
            onClick={onNewInvoice}
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Bill for {orgData?.name || organization.name}</span>
          </Button>
        </div>
      </div>

      {/* Organization Header & Profile Card */}
      <Card className="shadow-2xs">
        <CardContent className="p-6 flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {orgData?.name || organization.name}
                  </h1>
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                    Client Workspace
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">Dedicated Ledger, Records & Statement</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-1">
              {(orgData?.address || organization.address) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {orgData?.address || organization.address},{' '}
                    {[orgData?.city || organization.city, orgData?.state || organization.state, orgData?.pincode || organization.pincode].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {(orgData?.phone || organization.phone) && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Phone: {orgData?.phone || organization.phone}</span>
                </div>
              )}
              {(orgData?.email || organization.email) && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Email: {orgData?.email || organization.email}</span>
                </div>
              )}
              {(orgData?.notes || organization.notes) && (
                <div className="text-[11px] text-slate-500 italic pt-1">
                  Note: {orgData?.notes || organization.notes}
                </div>
              )}
            </div>
          </div>

          {/* Financial Metrics for this Client */}
          <div className="grid grid-cols-3 gap-3 self-center lg:self-auto w-full lg:w-auto text-center shrink-0">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Invoiced
              </span>
              <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                ₹{formatINR(totalInvoiced)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{allInvoices.length} bills issued</p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 min-w-[120px]">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Total Paid
              </span>
              <div className="text-base font-bold text-emerald-700 mt-1 font-mono">
                ₹{formatINR(totalPaid)}
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5">Cleared</p>
            </div>

            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 min-w-[120px]">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Balance Due
              </span>
              <div className="text-base font-bold text-blue-700 mt-1 font-mono">
                ₹{formatINR(balanceDue)}
              </div>
              <p className="text-[10px] text-blue-600 mt-0.5">Outstanding</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs / Segmented Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 no-print">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'invoices'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          Bills & Invoices ({allInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'statement'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          Statement of Account
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'details'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          Client Profile Details
        </button>
      </div>

      {/* Tab 1: Invoices & Bills Table */}
      {activeTab === 'invoices' && (
        <Card className="shadow-2xs overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Filter Bills:
              </span>
              <div className="flex bg-slate-100 p-0.5 rounded-md text-xs font-medium">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                >
                  All ({allInvoices.length})
                </button>
                <button
                  onClick={() => setStatusFilter('unpaid')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${statusFilter === 'unpaid' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                >
                  Outstanding ({allInvoices.filter((i) => i.balance_due > 0).length})
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${statusFilter === 'paid' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                >
                  Fully Paid ({allInvoices.filter((i) => i.balance_due === 0).length})
                </button>
              </div>
            </div>

            <Button
              onClick={onNewInvoice}
              size="sm"
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Bill
            </Button>
          </CardHeader>

          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm font-medium">No bills match this filter.</p>
              <Button
                onClick={onNewInvoice}
                size="sm"
                className="mt-3 bg-blue-600 text-white font-semibold"
              >
                Create Bill
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        {inv.status === 'paid' ? (
                          <Badge variant="success">Paid</Badge>
                        ) : (
                          <Badge variant="default" className="bg-blue-50 text-blue-700 border border-blue-200">Issued</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{inv.invoice_date}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <button
                          onClick={() => setPreviewingInvoice(inv)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {inv.doc_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                        ₹{formatINR(inv.total)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-medium">
                        ₹{formatINR(inv.amount_paid || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
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
                            className="h-7 w-7 text-slate-500 hover:text-blue-600"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditInvoice(inv)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadInvoicePdf(inv, profile)}
                            className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Download PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-rose-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => exportInvoiceDocx(inv, profile)}
                            className="h-7 w-7 text-slate-500 hover:text-blue-600"
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
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
      )}

      {/* Tab 2: Statement of Account */}
      {activeTab === 'statement' && (
        <Card className="shadow-2xs p-6 space-y-6">
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">Statement of Account</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <span className="font-semibold text-slate-800">{orgData?.name}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={printInvoice}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Statement
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Total Billed</span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">₹{formatINR(totalInvoiced)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Total Paid</span>
              <p className="font-mono font-bold text-emerald-600 text-sm mt-0.5">₹{formatINR(totalPaid)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Balance Due</span>
              <p className="font-mono font-bold text-blue-700 text-sm mt-0.5">₹{formatINR(balanceDue)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Settlement</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {totalInvoiced > 0 ? Math.round(((totalInvoiced - balanceDue) / totalInvoiced) * 100) : 100}% Cleared
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Document #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Invoiced Amount</th>
                  <th className="py-2.5 px-3 text-right">Payment Received</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{inv.invoice_date}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3">{inv.doc_type}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      ₹{formatINR(inv.total)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                      ₹{formatINR(inv.amount_paid || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700">
                      ₹{formatINR(inv.balance_due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Client Profile Details */}
      {activeTab === 'details' && (
        <Card className="shadow-2xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Organization Information</h2>
              <p className="text-xs text-slate-500">Contact person and address records</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="gap-1.5 bg-blue-600 text-white font-semibold"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Organization Name</span>
              <p className="font-semibold text-slate-900 text-sm">{orgData?.name}</p>
            </div>

            <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Phone Number</span>
              <p className="font-semibold text-slate-900">{orgData?.phone || 'Not specified'}</p>
            </div>

            <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Email Address</span>
              <p className="font-semibold text-slate-900">{orgData?.email || 'Not specified'}</p>
            </div>

            <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Location</span>
              <p className="font-semibold text-slate-900">
                {[orgData?.city, orgData?.state, orgData?.pincode, orgData?.country].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="md:col-span-2 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Full Address</span>
              <p className="font-semibold text-slate-900">{orgData?.address || 'Not specified'}</p>
            </div>

            {orgData?.notes && (
              <div className="md:col-span-2 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Internal Notes</span>
                <p className="text-slate-700">{orgData.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Edit Organization Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Edit Organization Information
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / Client Name *
                </label>
                <Input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                  <Input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
                  <Input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pincode</label>
                  <Input
                    type="text"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                  <Input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes</label>
                <Input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewingInvoice && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col z-50 overflow-hidden animate-in fade-in duration-200 print:static print:bg-white print:overflow-visible print:p-0">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between no-print shadow-xs">
            <span className="font-mono font-bold text-slate-900 text-sm">{previewingInvoice.invoice_number}</span>
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
                Word DOCX
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
    </div>
  );
};
