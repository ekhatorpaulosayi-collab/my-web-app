import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Package, Wallet, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../../contexts/StaffContext';
import { useStore } from '../../lib/supabase-hooks';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'sell', label: 'Sell', icon: ShoppingBag },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'money', label: 'Money', icon: Wallet },
  { id: 'more', label: 'More', icon: Menu },
] as const;

function activeTab(pathname: string) {
  if (pathname.startsWith('/invoices') || pathname.startsWith('/upgrade')) return 'money';
  if (pathname.startsWith('/settings') || pathname.startsWith('/staff') || pathname.startsWith('/help')) return 'more';
  return 'home';
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isStaffMode, currentRole } = useStaff();
  const { store } = useStore(currentUser?.uid);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const current = activeTab(location.pathname);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const go = (id: (typeof TABS)[number]['id']) => {
    if (id === 'home' || id === 'items') {
      navigate('/dashboard');
      if (id === 'items') {
        window.setTimeout(() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      return;
    }
    if (id === 'sell') {
      const open = () => window.dispatchEvent(new CustomEvent('open-record-sale', { detail: {} }));
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
        window.setTimeout(open, 80);
      } else {
        open();
      }
      return;
    }
    if (id === 'money') {
      const open = () => window.dispatchEvent(new CustomEvent('storehouse:open-money'));
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
        window.setTimeout(open, 80);
      } else {
        open();
      }
      return;
    }
    const open = () => window.dispatchEvent(new CustomEvent('storehouse:open-more'));
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
      window.setTimeout(open, 80);
    } else {
      open();
    }
  };

  const storeName = store?.business_name || 'Your store';

  return (
    <div className="app-shell">
      <aside className="app-shell-nav" aria-label="Store">
        <div className="app-shell-brand">
          Storehouse
          <span>{storeName}</span>
        </div>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`app-shell-link${current === tab.id ? ' is-active' : ''}`}
              onClick={() => go(tab.id)}
            >
              <Icon size={20} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </aside>
      <div className="app-shell-main">
        {offline && (
          <div className="app-shell-banner" role="status">You are offline. Sales still save on this phone.</div>
        )}
        {isStaffMode && (
          <div className="app-shell-banner" role="status">
            Staff mode · {currentRole}. Ask the owner to edit or delete products.
          </div>
        )}
        <div className="app-shell-content">{children}</div>
      </div>
      <nav className="app-shell-tabs" aria-label="Primary">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`app-shell-tab${current === tab.id ? ' is-active' : ''}`}
              onClick={() => go(tab.id)}
            >
              <Icon size={20} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
