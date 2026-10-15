import React from 'react';
import { Invoice, Organization, UserProfile } from '../types';
import { formatINR } from '../utils/numberToWords';
import {
  TrendingUp,
  Receipt,
  Building2,
  AlertCircle,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface DashboardProps {
  invoices: Invoice[];
  organizations: Organization[];
  profile: UserProfile;
  onNewInvoice: () => void;
  onViewInvoices: () => void;
  onViewOrganizations: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onSelectOrg?: (orgId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  organizations,
  profile,
  onNewInvoice,
  onViewInvoices,
  onViewOrganizations,
  onSelectInvoice,
  onSelectOrg,
}) => {
  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0);
  const totalReceivables = invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);

  const pendingInvoices = invoices.filter((i) => i.balance_due > 0);
  const paidInvoices = invoices.filter((i) => i.balance_due === 0);
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="p-8  space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-7 text-white shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-300 border-blue-500/30 bg-blue-500/10 text-[10px] tracking-wider uppercase font-semibold">
                Overview & Billing Control
              </Badge>
              {profile.udyamNumber && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Udyam: {profile.udyamNumber}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 text-white">
              Hello, {profile.name}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              Manage non-GST billing, track client ledgers separately, and issue bills of supply matching your official format.
            </p>
          </div>

          <Button
            onClick={onNewInvoice}
            size="lg"
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 text-xs h-10 px-5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Bill</span>
          </Button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receivables */}
        <Card className="hover:border-blue-200 transition-all shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Receivables
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-blue-600">
              ₹{formatINR(totalReceivables)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>{pendingInvoices.length} outstanding {pendingInvoices.length === 1 ? 'bill' : 'bills'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Invoiced */}
        <Card className="hover:border-slate-300 transition-all shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Invoiced
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-900">
              ₹{formatINR(totalBilled)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {invoices.length} total bills issued
            </p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="hover:border-emerald-200 transition-all shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Payments Received
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ₹{formatINR(totalPaid)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {paidInvoices.length} fully settled bills
            </p>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card className="hover:border-amber-200 transition-all shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Organizations
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {organizations.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Independent client records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Client Breakdown & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations Receivables Card */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm">Client Receivables</CardTitle>
              <CardDescription className="text-[11px]">Outstanding balance per organization</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewOrganizations}
              className="h-7 text-xs text-blue-600 hover:text-blue-700"
            >
              All Clients
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {organizations.map((org) => {
              const billed = org.total_invoiced || 0;
              const due = org.balance_due || 0;
              const percentPaid = billed > 0 ? Math.round(((billed - due) / billed) * 100) : 100;

              return (
                <div
                  key={org.id}
                  onClick={() => onSelectOrg?.(org.id)}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-150 space-y-2 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[170px] group-hover:text-blue-600 transition-colors">
                      {org.name}
                    </span>
                    <span className="font-mono font-bold text-blue-700">₹{formatINR(due)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{org.invoices_count || 0} bills</span>
                    <span>Total ₹{formatINR(billed)} ({percentPaid}% paid)</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Invoices Card */}
        <Card className="lg:col-span-2 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm">Recent Bills & Records</CardTitle>
              <CardDescription className="text-[11px]">Latest issued documents</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewInvoices}
              className="h-7 text-xs text-blue-600 hover:text-blue-700"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        {inv.status === 'paid' ? (
                          <Badge variant="success" className="text-[10px] px-2 py-0">Paid</Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] px-2 py-0 bg-blue-50 text-blue-700 border border-blue-200">Issued</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">
                        {inv.invoice_number}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {inv.organization?.name || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        ₹{formatINR(inv.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {inv.balance_due === 0 ? (
                          <span className="text-emerald-600">₹0.00</span>
                        ) : (
                          <span className="text-slate-900">₹{formatINR(inv.balance_due)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
