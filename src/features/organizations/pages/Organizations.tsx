import React, { useState, useEffect, useMemo } from 'react';
import { Organization, Invoice, UserProfile } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import {
  Building2,
  Plus,
  ArrowRight,
  MapPin,
  Trash2,
  Edit,
  Search,
  X,
  Receipt,
  Clock,
  Layers,
} from 'lucide-react';
import { OrganizationDetail } from './OrganizationDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';

interface OrganizationsProps {
  organizations: Organization[];
  invoices: Invoice[];
  profile: UserProfile;
  onRefresh: () => void;
  onNewInvoiceForOrg: (orgId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  initialOrgId?: string | null;
  onSelectOrgId?: (id: string | null) => void;
}

export const Organizations: React.FC<OrganizationsProps> = ({
  organizations,
  invoices,
  profile,
  onRefresh,
  onNewInvoiceForOrg,
  onEditInvoice,
  initialOrgId,
  onSelectOrgId,
}) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(initialOrgId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const orgStatsMap = useMemo(() => {
    const map = new Map<string, { count: number; invoiced: number; paid: number; due: number }>();
    for (const inv of invoices || []) {
      if (!inv.organization_id) continue;
      const cur = map.get(inv.organization_id) || { count: 0, invoiced: 0, paid: 0, due: 0 };
      cur.count += 1;
      cur.invoiced += Number(inv.total) || 0;
      cur.paid += Number(inv.amount_paid) || 0;
      cur.due += Number(inv.balance_due) || 0;
      map.set(inv.organization_id, cur);
    }
    return map;
  }, [invoices]);

  useEffect(() => {
    if (initialOrgId !== undefined) {
      setSelectedOrgId(initialOrgId);
    }
  }, [initialOrgId]);

  const handleSelect = (id: string | null) => {
    setSelectedOrgId(id);
    onSelectOrgId?.(id);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Jharkhand');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingOrg(null);
    setName('');
    setAddress('');
    setCity('');
    setState('Jharkhand');
    setPincode('');
    setPhone('');
    setEmail('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setName(org.name);
    setAddress(org.address);
    setCity(org.city || '');
    setState(org.state || 'Jharkhand');
    setPincode(org.pincode || '');
    setPhone(org.phone || '');
    setEmail(org.email || '');
    setNotes(org.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      address,
      city,
      state,
      pincode,
      country: 'India',
      phone,
      email,
      notes,
    };

    if (editingOrg) {
      await fetch(`/api/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setShowModal(false);
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
        return;
      }
      onRefresh();
    }
  };

  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter(
      (org) =>
        org.name?.toLowerCase().includes(q) ||
        org.city?.toLowerCase().includes(q) ||
        org.state?.toLowerCase().includes(q) ||
        org.email?.toLowerCase().includes(q) ||
        org.phone?.toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  if (selectedOrgId) {
    const org = organizations.find((o) => o.id === selectedOrgId);
    if (org) {
      return (
        <OrganizationDetail
          organization={org}
          profile={profile}
          fallbackInvoices={invoices.filter((inv) => inv.organization_id === org.id)}
          onBack={() => handleSelect(null)}
          onNewInvoice={() => onNewInvoiceForOrg(org.id)}
          onEditInvoice={onEditInvoice}
          onRefresh={onRefresh}
        />
      );
    }
  }

  const totalInvoiced = organizations.reduce((acc, o) => {
    const fallbackVal = orgStatsMap.get(o.id)?.invoiced || 0;
    return acc + (o.total_invoiced !== undefined && o.total_invoiced !== null && Number(o.total_invoiced) > 0 ? Number(o.total_invoiced) : fallbackVal);
  }, 0);
  const totalReceivables = organizations.reduce((acc, o) => {
    const fallbackVal = orgStatsMap.get(o.id)?.due || 0;
    return acc + (o.balance_due !== undefined && o.balance_due !== null ? Number(o.balance_due) : fallbackVal);
  }, 0);

  const orgExportColumns: ExportColumn<Organization>[] = [
    { header: 'Organization Name', key: 'name', width: 26, align: 'left' },
    { header: 'Contact Person', key: 'contact_person', width: 20, align: 'left', format: (v) => v || '-' },
    { header: 'Email', key: 'email', width: 22, align: 'left', format: (v) => v || '-' },
    { header: 'Phone', key: 'phone', width: 16, align: 'center', format: (v) => v || '-' },
    { header: 'City & State', key: 'city', width: 18, align: 'left', format: (_, o) => [o.city, o.state].filter(Boolean).join(', ') || '-' },
    { header: 'GST / Tax ID', key: 'tax_id', width: 16, align: 'center', format: (v) => v || '-' },
    {
      header: 'Total Invoiced',
      key: 'total_invoiced',
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

  const orgExportOptions = {
    filename: `Organizations_Directory_${new Date().toISOString().slice(0, 10)}`,
    title: 'Client Organizations & Institutions Directory',
    subtitle: `Directory overview of ${organizations.length} client entities`,
    sheetName: 'Clients',
    columns: orgExportColumns,
    data: organizations,
    profile,
    summaryMetrics: [
      { label: 'Total Clients', value: organizations.length },
      { label: 'Total Invoiced', value: formatCurrencyForPdf(totalInvoiced) },
      { label: 'Outstanding Receivables', value: formatCurrencyForPdf(totalReceivables) },
    ],
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Client Organizations
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
              {organizations.length} clients
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Keep billings, ledgers, and records completely isolated for each client or institution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportActions exportOptions={orgExportOptions} size="default" />
          <Button
            onClick={openAddModal}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Organization</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Clients
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {organizations.length}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Isolated billing records</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Invoiced Across All Orgs
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                ₹{formatINR(totalInvoiced)}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Cumulative billing</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Outstanding Receivables
              </span>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                ₹{formatINR(totalReceivables)}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Pending collection</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="Search clients by name, city, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs h-9 bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredOrganizations.length}</span> of {organizations.length} organizations
        </div>
      </div>

      {/* Empty State */}
      {filteredOrganizations.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            {searchQuery ? 'No matching organizations found' : 'No client organizations yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `No results found for "${searchQuery}". Try a different search term or clear the filter.`
              : 'Add your first client organization or institution to keep their billings and ledgers organized.'}
          </p>
          {searchQuery ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-xs dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear Search
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={openAddModal}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Organization
            </Button>
          )}
        </div>
      ) : (
        /* Organization Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filteredOrganizations.map((org) => (
            <Card
              key={org.id}
              className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-blue-400/60 dark:hover:border-blue-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group rounded-xl overflow-hidden"
            >
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-base shrink-0 transition-transform group-hover:scale-105">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-bold text-slate-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer truncate"
                        onClick={() => handleSelect(org.id)}
                        title={org.name}
                      >
                        {org.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{[org.city, org.state].filter(Boolean).join(', ') || 'India'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(org)}
                      className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(org.id, org.name)}
                      className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-3 px-4">
                {org.address && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    {org.address}
                  </p>
                )}

                {/* Financial Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100/80 dark:border-slate-800/60">
                    <div className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider">Bills</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {org.invoices_count !== undefined && org.invoices_count !== null && org.invoices_count > 0
                        ? org.invoices_count
                        : (orgStatsMap.get(org.id)?.count || 0)}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100/80 dark:border-slate-800/60">
                    <div className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider">Billed</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                      ₹{formatINR(
                        org.total_invoiced !== undefined && org.total_invoiced !== null && Number(org.total_invoiced) > 0
                          ? org.total_invoiced
                          : (orgStatsMap.get(org.id)?.invoiced || 0)
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-100/60 dark:border-blue-900/40">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Due</div>
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300 mt-0.5 font-mono">
                      ₹{formatINR(
                        org.balance_due !== undefined && org.balance_due !== null
                          ? org.balance_due
                          : (orgStatsMap.get(org.id)?.due || 0)
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 pb-3 px-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNewInvoiceForOrg(org.id)}
                  className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 gap-1 p-0 hover:bg-transparent"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Bill
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelect(org.id)}
                  className="h-7 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white gap-1 p-0 hover:bg-transparent group/link"
                >
                  View Ledger
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Organization Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                <Building2 className="w-4 h-4" />
              </div>
              <span>{editingOrg ? 'Edit Organization' : 'Add Client Organization'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Organization / Client Name *
              </label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Irvine Adventist School"
                className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Street Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, area, landmark..."
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">City</label>
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ghatshila"
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">State</label>
                <Input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Jharkhand"
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pincode</label>
                <Input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="832303"
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact number"
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@school.com"
                  className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contact person or remarks"
                className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
              >
                {editingOrg ? 'Save Changes' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
