import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { NavTab } from '../components/Sidebar';

export interface RouteState {
  path: string;
  tab: NavTab;
  subTab?: string;
  paramId?: string;
}

interface RouterContextType {
  route: RouteState;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  tabToPath: (tab: NavTab, subTab?: string) => string;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

// Map paths to tab names
export function parseRoute(pathname: string): RouteState {
  // Strip trailing slash except root
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] === 'dashboard') {
    return { path: '/dashboard', tab: 'dashboard' };
  }

  const primary = segments[0].toLowerCase();

  switch (primary) {
    case 'invoices': {
      const paramId = segments[1]; // e.g. 'new' or invoice ID
      return { path: cleanPath, tab: 'invoices', paramId };
    }
    case 'organizations':
    case 'clients': {
      const paramId = segments[1]; // orgId
      return { path: cleanPath, tab: 'organizations', paramId };
    }
    case 'budget': {
      const subTab = segments[1]; // 'spreadsheet' | 'income' | 'returns' | 'expenses' | 'loans' | 'goals' | 'allocations'
      if (subTab === 'returns') return { path: '/returns', tab: 'returns' };
      if (subTab === 'spreadsheet') return { path: '/spreadsheet', tab: 'spreadsheet' };
      if (subTab === 'allocations') return { path: '/allocations', tab: 'allocations' };
      if (subTab === 'loans' || subTab === 'borrow') return { path: '/loans', tab: 'borrow' };
      if (subTab === 'income') return { path: '/income', tab: 'income' };
      if (subTab === 'expenses') return { path: '/expenses', tab: 'expenses' };
      if (subTab === 'goals') return { path: '/goals', tab: 'goals' };
      return { path: cleanPath, tab: 'budget', subTab };
    }
    case 'expenses':
      return { path: cleanPath, tab: 'expenses' };
    case 'income':
      return { path: cleanPath, tab: 'income' };
    case 'returns':
      return { path: '/returns', tab: 'returns' };
    case 'spreadsheet':
      return { path: '/spreadsheet', tab: 'spreadsheet' };
    case 'allocations':
      return { path: '/allocations', tab: 'allocations' };
    case 'loans':
    case 'debts':
    case 'borrow':
      return { path: '/loans', tab: 'borrow' };
    case 'goals':
      return { path: cleanPath, tab: 'goals' };
    case 'tax':
    case 'compliance':
      return { path: cleanPath, tab: 'tax' };
    case 'automations':
    case 'schedules':
      return { path: cleanPath, tab: 'automations' };
    case 'catalog':
    case 'items':
      return { path: cleanPath, tab: 'catalog' };
    case 'settings':
      return { path: cleanPath, tab: 'settings' };
    default:
      return { path: '/dashboard', tab: 'dashboard' };
  }
}

export function tabToPath(tab: NavTab, subTab?: string): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'invoices':
      return '/invoices';
    case 'organizations':
      return '/organizations';
    case 'budget':
      return subTab ? `/budget/${subTab}` : '/budget';
    case 'spreadsheet':
      return '/spreadsheet';
    case 'returns':
      return '/returns';
    case 'allocations':
      return '/allocations';
    case 'expenses':
      return '/expenses';
    case 'income':
      return '/income';
    case 'borrow':
      return '/loans';
    case 'goals':
      return '/goals';
    case 'tax':
      return '/tax';
    case 'automations':
      return '/automations';
    case 'catalog':
      return '/catalog';
    case 'settings':
      return '/settings';
    default:
      return '/dashboard';
  }
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window !== 'undefined') {
      return parseRoute(window.location.pathname);
    }
    return { path: '/dashboard', tab: 'dashboard' };
  });

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const nextRoute = parseRoute(to);
    setRoute(nextRoute);

    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState({ path: to }, '', to);
      } else if (window.location.pathname !== to) {
        window.history.pushState({ path: to }, '', to);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    
    // Normalize initial URL if it's '/' to '/dashboard'
    if (window.location.pathname === '/') {
      window.history.replaceState({ path: '/dashboard' }, '', '/dashboard');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate, tabToPath }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
