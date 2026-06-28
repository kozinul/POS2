import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavGroup {
  label: string;
  icon: string;
  children: { to: string; icon: string; label: string }[];
}

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

type NavEntry = NavItem | NavGroup;

const navItems: NavEntry[] = [
  { to: '/', icon: 'dashboard', label: 'Ringkasan' },
  {
    label: 'Master Data',
    icon: 'inventory',
    children: [
      { to: '/products', icon: 'inventory_2', label: 'Produk' },
      { to: '/categories', icon: 'category', label: 'Kategori' },
      { to: '/families', icon: 'account_tree', label: 'Family' },
      { to: '/members', icon: 'diversity_3', label: 'Member' },
      { to: '/promotions', icon: 'auto_awesome', label: 'Promosi' },
      { to: '/taxes', icon: 'receipt', label: 'Pajak' },
      { to: '/rounding-config', icon: 'currency_exchange', label: 'Pembulatan' },
      { to: '/payment-methods', icon: 'payments', label: 'Metode Bayar' },
      { to: '/modifiers', icon: 'tune', label: 'Modifier / Opsi' },
    ],
  },
  {
    label: 'Outlet & Pengguna',
    icon: 'business',
    children: [
      { to: '/outlets', icon: 'storefront', label: 'Daftar Outlet' },
      { to: '/roles', icon: 'manage_accounts', label: 'Role & Hak Akses' },
      { to: '/users', icon: 'group', label: 'Pengguna' },
    ],
  },
  { to: '/orders', icon: 'receipt_long', label: 'Transaksi' },
  {
    label: 'Laporan',
    icon: 'analytics',
    children: [
      { to: '/reports/sales', icon: 'bar_chart', label: 'Penjualan' },
      { to: '/reports/finance', icon: 'account_balance', label: 'Keuangan' },
      { to: '/reports/cashier', icon: 'badge', label: 'Per Kasir' },
    ],
  },
  { to: '/settings', icon: 'settings', label: 'Pengaturan' },
];

function isGroup(item: NavEntry): item is NavGroup {
  return 'children' in item;
}

function SidebarGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-surface-variant hover:text-surface-bright hover:bg-surface-container-highest/10 transition-colors duration-200"
      >
        <span className="material-symbols-outlined text-[20px]">{group.icon}</span>
        <span className="font-label-md text-label-md flex-1 text-left">{group.label}</span>
        <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
          chevron_right
        </span>
      </button>
      {open && (
        <div className="ml-4 pl-4 border-l border-white/10 space-y-0.5">
          {group.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container border-l-4 border-white'
                    : 'text-surface-variant hover:text-surface-bright hover:bg-surface-container-highest/10'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{child.icon}</span>
              <span className="font-label-md text-label-md">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex flex-col h-full w-[280px] bg-primary fixed left-0 top-0 z-50 text-white overflow-y-auto">
        <div className="p-6 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-[20px] font-bold text-surface-bright leading-tight">HQ Central</h1>
              <p className="text-[11px] opacity-70 tracking-wider font-semibold">ENTERPRISE ADMIN</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 mt-2 px-3 space-y-0.5 pb-6">
          {navItems.map((item) =>
            isGroup(item) ? (
              <SidebarGroup key={item.label} group={item} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container border-l-4 border-white'
                      : 'text-surface-variant hover:text-surface-bright hover:bg-surface-container-highest/10'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className="p-6 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-white text-primary font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            LOGOUT
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-sidebar_width flex flex-col min-h-screen">
        <header className="fixed top-0 right-0 w-[calc(100%-280px)] h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-container_gutter z-40">
          <div className="flex items-center">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">HQ Dashboard</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">notifications</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
            </div>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low p-2 rounded-lg transition-all duration-200">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
              <span className="font-label-md text-label-md text-on-surface font-medium">{user?.name || 'Administrator'}</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
            </div>
          </div>
        </header>

        <main className="mt-16 p-container_gutter flex flex-col gap-8 flex-1">
          <Outlet />
        </main>

        <footer className="mt-auto p-container_gutter flex justify-between items-center text-outline text-[12px] font-body-sm">
          <p>Copyright &copy; 2022 — POS, Inc. All rights reserved.</p>
          <p className="font-semibold">System version 1.0.10</p>
        </footer>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary rounded-full blur-[100px]"></div>
      </div>
    </div>
  );
}
