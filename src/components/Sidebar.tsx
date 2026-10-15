import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Building2,
  Package,
  Settings,
  Plus,
  ShieldCheck,
  Repeat,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export type NavTab = 'dashboard' | 'invoices' | 'organizations' | 'automations' | 'catalog' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onNewInvoice: () => void;
  orgCount: number;
  invoiceCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onNewInvoice,
  orgCount,
  invoiceCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-blue-500',
    },
    {
      id: 'invoices' as NavTab,
      label: 'Invoices & Bills',
      icon: ReceiptText,
      color: 'text-emerald-500',
      count: invoiceCount,
    },
    {
      id: 'organizations' as NavTab,
      label: 'Organizations',
      icon: Building2,
      color: 'text-amber-500',
      count: orgCount,
    },
    {
      id: 'automations' as NavTab,
      label: 'Automations',
      icon: Repeat,
      color: 'text-violet-400',
    },
    {
      id: 'catalog' as NavTab,
      label: 'Items & Rates',
      icon: Package,
      color: 'text-purple-500',
    },
    {
      id: 'settings' as NavTab,
      label: 'Profile & Setup',
      icon: Settings,
      color: 'text-slate-400',
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col justify-between h-screen shrink-0 no-print select-none border-r border-slate-800/80">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-sm shadow-blue-500/25">
              H
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Suren Billings</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Personal Suite</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          <Button
            onClick={onNewInvoice}
            className="w-full justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 shadow-md shadow-blue-500/20 text-xs font-semibold h-9 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Bill</span>
          </Button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1.5">
            Main Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer',
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', item.color)} />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-mono font-medium',
                        isActive
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-800/80 text-slate-400'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info & Verification Status */}
      <div className="p-3 border-t border-slate-800/60 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] font-semibold text-slate-200">Udyam Verified</div>
              <div className="text-[9px] text-slate-400">Non-GST Small Entity</div>
            </div>
          </div>
          <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
            Active
          </span>
        </div>
      </div>
    </aside>
  );
};
