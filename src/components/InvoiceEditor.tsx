import React, { useState, useEffect } from 'react';
import { Invoice, Organization, UserProfile, LineItem, DocType, CatalogItem } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { exportInvoiceDocx } from '../utils/docxExport';
import { printInvoice, downloadInvoicePdf } from '../utils/pdfExport';
import { Plus, Trash2, Printer, FileDown, Save, ArrowLeft, Building2, Sparkles, X } from 'lucide-react';
import { formatINR, numberToIndianWords } from '../utils/numberToWords';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface InvoiceEditorProps {
  invoice?: Invoice | null;
  organizations: Organization[];
  profile: UserProfile;
  catalog: CatalogItem[];
  onSave: (invoiceData: Partial<Invoice>) => Promise<void>;
  onCancel: () => void;
  onRefreshOrgs: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  invoice,
  organizations,
  profile,
  catalog,
  onSave,
  onCancel,
  onRefreshOrgs,
}) => {
  const [docType, setDocType] = useState<DocType>(invoice?.doc_type || 'BILL OF SUPPLY');
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number || '');
  const [orgId, setOrgId] = useState(invoice?.organization_id || (organizations[0]?.id || ''));
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoice_date || new Date().toLocaleDateString('en-GB')
  );
  const [terms, setTerms] = useState(invoice?.terms || 'Due on Receipt');
  const [dueDate, setDueDate] = useState(
    invoice?.due_date || new Date().toLocaleDateString('en-GB')
  );
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'NONE'>(
    invoice?.copy_type || 'ORIGINAL'
  );
  const [status, setStatus] = useState<Invoice['status']>(invoice?.status || 'issued');

  const [items, setItems] = useState<LineItem[]>(
    invoice?.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: 'item-1',
            description: 'Project Acceptance / Commencement',
            qty: 1,
            rate: 20000,
            amount: 20000,
          },
        ]
  );

  const [notes, setNotes] = useState(invoice?.notes ?? profile.defaultNotes ?? 'Thanks for your business.');
  const [paymentOptions, setPaymentOptions] = useState(
    invoice?.payment_options ??
      [
        profile.bankName ? `Bank: ${profile.bankName}` : '',
        profile.accountNumber ? `A/C: ${profile.accountNumber}` : '',
        profile.ifscCode ? `IFSC: ${profile.ifscCode}` : '',
        profile.upiId ? `UPI: ${profile.upiId}` : '',
      ]
        .filter(Boolean)
        .join('\n')
  );
  const [amountPaid, setAmountPaid] = useState<number>(invoice?.amount_paid || 0);
  const [hideQty, setHideQty] = useState<boolean>(invoice?.hide_qty ?? profile.defaultHideQty ?? false);

  const [viewMode, setViewMode] = useState<'split' | 'form' | 'preview'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('');

  // Fetch next number if creating new invoice
  useEffect(() => {
    if (!invoice && !invoiceNumber) {
      fetchNextNumber(docType);
    }
  }, [docType]);

  const fetchNextNumber = async (type: DocType) => {
    try {
      const res = await fetch(`/api/next-number?type=${encodeURIComponent(type)}`);
      const data = await res.json();
      if (data.nextNumber) {
        setInvoiceNumber(data.nextNumber);
      }
    } catch (err) {
      console.error('Error fetching next number:', err);
    }
  };

  // Auto calculate totals
  const subTotal = items.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const total = subTotal;
  const balanceDue = Math.max(0, total - (amountPaid || 0));

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'qty' || field === 'rate') {
      const q = field === 'qty' ? parseFloat(value) || 0 : item.qty;
      const r = field === 'rate' ? parseFloat(value) || 0 : item.rate;
      item.amount = Math.round(q * r * 100) / 100;
    }
    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: '',
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const addCatalogItem = (catItem: CatalogItem) => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: catItem.name + (catItem.description ? `\n${catItem.description}` : ''),
        qty: 1,
        rate: catItem.default_rate,
        amount: catItem.default_rate,
      },
    ]);
  };

  const handleQuickAddBankDetails = () => {
    const bankSnippet = `Bank: ${profile.bankName}\nA/C: ${profile.accountNumber}\nIFSC: ${profile.ifscCode}\nName: ${profile.accountHolder || profile.name}`;
    setPaymentOptions((prev) => (prev ? `${prev}\n\n${bankSnippet}` : bankSnippet));
  };

  const handleQuickAddUPI = () => {
    const upiSnippet = `UPI ID: ${profile.upiId}`;
    setPaymentOptions((prev) => (prev ? `${prev}\n${upiSnippet}` : upiSnippet));
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          address: newOrgAddress,
          city: newOrgCity,
        }),
      });
      const data = await res.json();
      if (data.id) {
        onRefreshOrgs();
        setOrgId(data.id);
        setShowAddOrgModal(false);
        setNewOrgName('');
        setNewOrgAddress('');
        setNewOrgCity('');
      }
    } catch (err) {
      console.error('Failed to create organization:', err);
    }
  };

  const currentOrg = organizations.find((o) => o.id === orgId);

  const previewInvoice: Invoice = {
    id: invoice?.id || 'temp',
    invoice_number: invoiceNumber || 'BOS-000001',
    doc_type: docType,
    organization_id: orgId,
    organization: currentOrg,
    invoice_date: invoiceDate,
    terms,
    due_date: dueDate,
    items,
    sub_total: subTotal,
    total,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    notes,
    payment_options: paymentOptions,
    status,
    copy_type: copyType,
    hide_qty: hideQty,
  };

  const handleSave = async () => {
    if (!invoiceNumber.trim()) {
      alert('Please provide an invoice number.');
      return;
    }
    if (!orgId) {
      alert('Please select or create an organization.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        id: invoice?.id,
        invoice_number: invoiceNumber,
        doc_type: docType,
        organization_id: orgId,
        invoice_date: invoiceDate,
        terms,
        due_date: dueDate,
        items,
        sub_total: subTotal,
        total,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        notes,
        payment_options: paymentOptions,
        status,
        copy_type: copyType,
        hide_qty: hideQty,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/70">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200/90 px-6 py-3 flex flex-wrap items-center justify-between gap-4 no-print shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {invoice ? 'Edit Document' : 'New Bill'}
              </h1>
              <Badge variant="default" className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                {docType}
              </Badge>
            </div>
            <p className="text-[11px] font-mono text-slate-500">{invoiceNumber || 'Sequence Pending'}</p>
          </div>
        </div>

        {/* View Mode Controls & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Segmented Mode Control */}
          <div className="hidden lg:flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('form')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'form' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Preview
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={printInvoice}
            className="gap-1.5"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportInvoiceDocx(previewInvoice, profile)}
            className="gap-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
            title="Export to Microsoft Word (.docx)"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>DOCX</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadInvoicePdf(previewInvoice, profile)}
            className="gap-1.5"
            title="Direct Download Vector PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span>PDF</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Bill'}</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form Area */}
        {(viewMode === 'form' || viewMode === 'split') && (
          <div
            className={`flex-1 overflow-y-auto p-6 transition-all ${
              viewMode === 'split' ? 'lg:max-w-[50%] border-r border-slate-200' : 'max-w-4xl mx-auto w-full'
            }`}
          >
            <div className="space-y-5">
              {/* Card 1: Document Setup */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs uppercase tracking-wide text-slate-500 font-bold">
                    Document Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Type
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => {
                        const newType = e.target.value as DocType;
                        setDocType(newType);
                        fetchNextNumber(newType);
                      }}
                      className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="BILL OF SUPPLY">Bill of Supply (Non-GST)</option>
                      <option value="INVOICE">Standard Invoice</option>
                      <option value="ESTIMATE">Estimate / Quotation</option>
                      <option value="PROFORMA">Proforma Invoice</option>
                      <option value="RECEIPT">Receipt / Voucher</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Invoice #
                    </label>
                    <Input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. BOS-000001"
                      className="font-mono text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Copy Badge
                    </label>
                    <select
                      value={copyType}
                      onChange={(e) => setCopyType(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ORIGINAL">ORIGINAL</option>
                      <option value="DUPLICATE">DUPLICATE</option>
                      <option value="TRIPLICATE">TRIPLICATE</option>
                      <option value="NONE">None (Hide Badge)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Organization / Client Details */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs uppercase tracking-wide text-slate-500 font-bold">
                    Bill To (Client Organization)
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddOrgModal(true)}
                    className="h-6 text-xs text-blue-600 hover:text-blue-700 gap-1 p-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Organization
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select Client Organization --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.city ? `(${org.city})` : ''}
                      </option>
                    ))}
                  </select>

                  {currentOrg && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-900">{currentOrg.name}</p>
                      <p>{currentOrg.address}</p>
                      <p>{[currentOrg.city, currentOrg.state, currentOrg.pincode].filter(Boolean).join(', ')}</p>
                    </div>
                  )}

                  {/* Dates & Terms in same card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Invoice Date
                      </label>
                      <Input
                        type="text"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Terms
                      </label>
                      <select
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                        <option value="Custom">Custom Terms</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Due Date
                      </label>
                      <Input
                        type="text"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Line Items Table */}
              <Card className="shadow-2xs overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-md transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={hideQty}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setHideQty(val);
                          if (val) {
                            setItems((prev) =>
                              prev.map((item) => ({
                                ...item,
                                qty: 1,
                                amount: Number(item.rate) || Number(item.amount) || 0,
                              }))
                            );
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Service Mode (Hide Qty)</span>
                    </label>

                    {catalog.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <select
                          onChange={(e) => {
                            const cat = catalog.find((c) => c.id === e.target.value);
                            if (cat) addCatalogItem(cat);
                            e.target.value = '';
                          }}
                          defaultValue=""
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
                        >
                          <option value="" disabled>+ Pick saved item...</option>
                          {catalog.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} (₹{formatINR(c.default_rate)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 text-slate-600 border-y border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">
                          {hideQty ? 'Description of Services / Work' : 'Item & Description'}
                        </th>
                        {!hideQty && (
                          <>
                            <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                            <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                          </>
                        )}
                        <th className={`py-2.5 px-3 ${hideQty ? 'w-36' : 'w-28'} text-right`}>Amount (₹)</th>
                        <th className="py-2.5 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-slate-400 font-medium">{index + 1}</td>
                          <td className="py-2 px-3">
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder={hideQty ? 'Service or milestone description...' : 'Item description...'}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>
                          {!hideQty && (
                            <>
                              <td className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.qty}
                                  onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                  className="text-right h-8"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.rate}
                                  onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                  className="text-right h-8 font-mono"
                                />
                              </td>
                            </>
                          )}
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                            {hideQty ? (
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={item.rate || item.amount || ''}
                                onChange={(e) => {
                                  const amt = parseFloat(e.target.value) || 0;
                                  handleItemChange(index, 'rate', amt);
                                  handleItemChange(index, 'qty', 1);
                                }}
                                className="text-right h-8 font-mono font-bold"
                              />
                            ) : (
                              formatINR(item.amount)
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                              className="h-7 w-7 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addItem}
                      className="gap-1.5 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Another Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Summary & Indian Words */}
              <Card className="shadow-2xs bg-slate-50/60 border-slate-200/80">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total in Words (Indian Currency)
                    </span>
                    <p className="text-xs font-semibold text-slate-800 italic">
                      {numberToIndianWords(total)}
                    </p>
                  </div>

                  <div className="w-full md:w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Sub Total:</span>
                      <span className="font-mono font-semibold">{formatINR(subTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-1.5">
                      <span>Total:</span>
                      <span className="font-mono">₹{formatINR(total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pt-1">
                      <span className="text-[11px]">Amount Paid:</span>
                      <Input
                        type="number"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-200 pt-1.5 text-sm">
                      <span>Balance Due:</span>
                      <span className="font-mono text-blue-700">₹{formatINR(balanceDue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 5: Notes & Payment Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-2xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-wide text-slate-500 font-bold">
                      Customer Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Customer notes, thank you message..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-2xs">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs uppercase tracking-wide text-slate-500 font-bold">
                      Payment Options (Bank / UPI)
                    </CardTitle>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleQuickAddBankDetails}
                        className="h-6 text-[10px] px-2 py-0 text-blue-600"
                      >
                        + Bank
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleQuickAddUPI}
                        className="h-6 text-[10px] px-2 py-0 text-blue-600"
                      >
                        + UPI
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      rows={3}
                      value={paymentOptions}
                      onChange={(e) => setPaymentOptions(e.target.value)}
                      placeholder="Bank account details, UPI ID..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Right: Live A4 Preview Area */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-200/80 flex justify-center">
            <div className="w-full max-w-[210mm]">
              <InvoicePreview invoice={previewInvoice} profile={profile} />
            </div>
          </div>
        )}
      </div>

      {/* Add Organization Modal */}
      {showAddOrgModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Add Client Organization
              </h3>
              <button
                type="button"
                onClick={() => setShowAddOrgModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / School Name *
                </label>
                <Input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Irvine Adventist School"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <textarea
                  rows={2}
                  value={newOrgAddress}
                  onChange={(e) => setNewOrgAddress(e.target.value)}
                  placeholder="Street, area, landmark..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Town
                </label>
                <Input
                  type="text"
                  value={newOrgCity}
                  onChange={(e) => setNewOrgCity(e.target.value)}
                  placeholder="e.g. Ghatshila"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddOrgModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Save Organization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
