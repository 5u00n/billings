import React, { useState, useEffect } from 'react';
import { Organization, Invoice, UserProfile } from '../types';
import { formatINR } from '../utils/numberToWords';
import { Building2, Plus, ArrowRight, MapPin, Trash2, Edit, X } from 'lucide-react';
import { OrganizationDetail } from './OrganizationDetail';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';

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

  if (selectedOrgId) {
    const org = organizations.find((o) => o.id === selectedOrgId);
    if (org) {
      return (
        <OrganizationDetail
          organization={org}
          profile={profile}
          onBack={() => handleSelect(null)}
          onNewInvoice={() => onNewInvoiceForOrg(org.id)}
          onEditInvoice={onEditInvoice}
          onRefresh={onRefresh}
        />
      );
    }
  }

  const totalInvoiced = organizations.reduce((acc, o) => acc + (o.total_invoiced || 0), 0);
  const totalReceivables = organizations.reduce((acc, o) => acc + (o.balance_due || 0), 0);

  return (
    <div className="p-8  space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Client Organizations</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Keep billings and records completely separated for each client or institution.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Organization</span>
        </Button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-2xs">
          <CardHeader className="pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Clients
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{organizations.length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Isolated billing records</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Invoiced Across All Orgs
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              ₹{formatINR(totalInvoiced)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Cumulative billing</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Outstanding Receivables
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 font-mono">
              ₹{formatINR(totalReceivables)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pending collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {organizations.map((org) => (
          <Card
            key={org.id}
            className="hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-base shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 transition cursor-pointer"
                      onClick={() => handleSelect(org.id)}
                    >
                      {org.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {[org.city, org.state].filter(Boolean).join(', ') || 'India'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(org)}
                    className="h-7 w-7 text-slate-400 hover:text-slate-600"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(org.id, org.name)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-3">
              {org.address && (
                <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {org.address}
                </p>
              )}

              {/* Financial Stats */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Bills</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{org.invoices_count || 0}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Billed</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 font-mono">
                    ₹{formatINR(org.total_invoiced || 0)}
                  </div>
                </div>
                <div className="p-2 bg-blue-50/70 rounded-lg">
                  <div className="text-[10px] text-blue-600 font-semibold uppercase">Due</div>
                  <div className="text-xs font-bold text-blue-700 mt-0.5 font-mono">
                    ₹{formatINR(org.balance_due || 0)}
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNewInvoiceForOrg(org.id)}
                className="h-7 text-xs text-blue-600 hover:text-blue-700 gap-1 p-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Bill
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(org.id)}
                className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1 p-0"
              >
                View Ledger
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Add / Edit Organization Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {editingOrg ? 'Edit Organization' : 'Add Client Organization'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
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
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">State</label>
                  <Input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Jharkhand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pincode</label>
                  <Input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="832303"
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
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@school.com"
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
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {editingOrg ? 'Save Changes' : 'Create Organization'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
