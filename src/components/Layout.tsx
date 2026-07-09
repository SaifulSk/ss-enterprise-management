import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, Truck, Wrench, Users, ClipboardList,
  Wallet, BarChart2, Archive, UserCog, LogOut, Menu,
  ChevronDown, ChevronRight, ChevronLeft, ClipboardCheck, Receipt, BookOpen,
  CreditCard, X
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Master Data', path: '', icon: <BookOpen size={18} />, children: [
      { label: 'Sites', path: '/admin/sites' },
      { label: 'Materials', path: '/admin/materials' },
      { label: 'Vendors', path: '/admin/vendors' },
    ]
  },
  {
    label: 'Stock Management', path: '', icon: <Package size={18} />, children: [
      { label: 'Stock Ledger (In/Out)', path: '/admin/stock' },
      { label: 'Stock Balance', path: '/admin/stock-balance' },
    ]
  },
  { label: 'Vendor Ledger', path: '/admin/vendor-ledger', icon: <CreditCard size={18} /> },
  { label: 'Tools & Equipment', path: '/admin/tools', icon: <Wrench size={18} /> },
  {
    label: 'Labour', path: '', icon: <Users size={18} />, children: [
      { label: 'Workers & Contractors', path: '/admin/labour' },
      { label: 'Daily Attendance', path: '/admin/attendance' },
      { label: 'Camp & PPE', path: '/admin/labour-camp' },
    ]
  },
  {
    label: 'Finance', path: '', icon: <Wallet size={18} />, children: [
      { label: 'Capital & Expenses', path: '/admin/capital-expenses' },
      { label: 'Billing Reconciliation', path: '/admin/reconciliation' },
    ]
  },
  {
    label: 'Transport & Fleet', path: '', icon: <Truck size={18} />, children: [
      { label: 'Transport Log', path: '/admin/transport' },
      { label: 'Vehicles & Fuel', path: '/admin/vehicles' },
      { label: 'Compliance Calendar', path: '/admin/compliance' },
    ]
  },
  { label: 'Office Store', path: '/admin/office-store', icon: <Archive size={18} /> },
  { label: 'Reports', path: '/admin/reports', icon: <BarChart2 size={18} /> },
  { label: 'User Management', path: '/admin/users', icon: <UserCog size={18} /> },
];

const supervisorNav: NavItem[] = [
  { label: 'My Site', path: '/supervisor', icon: <LayoutDashboard size={18} /> },
  { label: 'Stock Entry', path: '/supervisor/stock', icon: <Package size={18} /> },
  { label: 'Daily Expenses', path: '/supervisor/expenses', icon: <Receipt size={18} /> },
  { label: 'Labour Attendance', path: '/supervisor/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Tools', path: '/supervisor/tools', icon: <Wrench size={18} /> },
  { label: 'Vendor Purchases', path: '/supervisor/vendors', icon: <CreditCard size={18} /> },
];

const contractorNav: NavItem[] = [
  { label: 'Crew Dashboard', path: '/contractor', icon: <LayoutDashboard size={18} /> },
  { label: 'Mark Attendance', path: '/contractor/attendance', icon: <ClipboardCheck size={18} /> },
  { label: 'Advances', path: '/contractor/advances', icon: <Wallet size={18} /> },
];

interface NavGroupProps {
  item: NavItem;
  location: string;
  collapsed: boolean;
  onNavClick?: () => void;
}

const NavGroup: React.FC<NavGroupProps> = ({ item, location, collapsed, onNavClick }) => {
  const isActive = item.children
    ? item.children.some(c => location.startsWith(c.path))
    : location === item.path || (item.path !== '/admin' && location.startsWith(item.path));

  const [open, setOpen] = useState(isActive);

  // Collapsed mode: show only icon with title tooltip
  if (collapsed) {
    if (item.children) {
      // In collapsed mode, group icons navigate to the first child
      const firstChild = item.children[0];
      return (
        <div style={{ position: 'relative' }} className="nav-collapsed-group">
          <Link
            to={firstChild.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ justifyContent: 'center', padding: '10px 0' }}
            title={item.label}
            onClick={onNavClick}
          >
            <span className="nav-icon">{item.icon}</span>
          </Link>
        </div>
      );
    }
    return (
      <Link
        to={item.path}
        className={`nav-item ${location === item.path ? 'active' : ''}`}
        style={{ justifyContent: 'center', padding: '10px 0' }}
        title={item.label}
        onClick={onNavClick}
      >
        <span className="nav-icon">{item.icon}</span>
      </Link>
    );
  }

  // Expanded mode: full label + children
  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`nav-item nav-group-btn ${isActive ? 'active' : ''}`}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', justifyContent: 'space-between', display: 'flex' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div style={{ paddingLeft: '20px', marginTop: '2px' }}>
            {item.children.map(child => (
              <Link
                key={child.path}
                to={child.path}
                className={`nav-item nav-child ${location === child.path ? 'active' : ''}`}
                onClick={onNavClick}
              >
                <span style={{ color: 'var(--border-solid)', fontSize: '1.2rem', lineHeight: 1 }}>·</span>
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to={item.path} className={`nav-item ${location === item.path ? 'active' : ''}`} onClick={onNavClick}>
      <span className="nav-icon">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
};

export const Layout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // On mobile, always show full sidebar regardless of desktop collapsed state
  const effectiveCollapsed = mobileOpen ? false : collapsed;

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const navItems =
    currentUser?.role === 'admin' ? adminNav :
    currentUser?.role === 'supervisor' ? supervisorNav :
    contractorNav;

  const roleLabel =
    currentUser?.role === 'admin' ? 'Company Admin' :
    currentUser?.role === 'supervisor' ? 'Site Supervisor' : 'Contractor';



  const sidebarWidth = mobileOpen ? 260 : (collapsed ? 64 : 260);

  return (
    <div className="layout-container">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
        className={`sidebar ${mobileOpen ? 'open' : ''}`}
      >
        {/* Logo / Brand */}
        <div className="sidebar-header" style={{ justifyContent: effectiveCollapsed ? 'center' : 'space-between', padding: effectiveCollapsed ? '0' : '0 16px' }}>
          {effectiveCollapsed ? (
            <img src="/icon.png" alt="S" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          ) : (
            <img
              src="/logo.png"
              alt="SS Enterprise"
              style={{ width: '100%', maxWidth: '160px',  objectFit: 'contain', display: 'block', margin: mobileOpen ? '0' : '0 auto' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                const el = document.createElement('div');
                el.innerText = 'S S Enterprise';
                el.style.cssText = 'font-weight:800;font-size:1rem;color:var(--primary);';
                (e.target as HTMLImageElement).parentElement!.appendChild(el);
              }}
            />
          )}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Role label */}
        {!effectiveCollapsed && (
          <div style={{ padding: '6px 16px 2px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {roleLabel}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: effectiveCollapsed ? '4px 6px' : '4px 10px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(item => (
            <NavGroup
              key={item.path || item.label}
              item={item}
              location={location.pathname}
              collapsed={effectiveCollapsed}
              onNavClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer" style={{ padding: effectiveCollapsed ? '12px 6px' : '16px' }}>
          {!effectiveCollapsed ? (
            <>
              <div className="user-info">
                <div className="avatar" style={{
                  background: currentUser?.role === 'admin' ? 'var(--primary-light)' :
                    currentUser?.role === 'supervisor' ? 'var(--secondary)' : '#8B5CF6',
                  flexShrink: 0
                }}>
                  {(currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="user-name">{currentUser?.displayName || currentUser?.email?.split('@')[0]}</span>
                  <span className="user-role">{roleLabel}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={16} /><span>Logout</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div className="avatar" title={currentUser?.displayName || currentUser?.email || ''} style={{
                background: currentUser?.role === 'admin' ? 'var(--primary-light)' :
                  currentUser?.role === 'supervisor' ? 'var(--secondary)' : '#8B5CF6',
                cursor: 'default'
              }}>
                {(currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <button onClick={handleLogout} title="Logout" style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8, color: 'var(--danger)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Floating Border Toggle — desktop */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="desktop-toggle"
        style={{
          position: 'absolute',
          top: 18,
          left: sidebarWidth - 12,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'white',
          border: '1px solid var(--border-solid)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
          color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
          padding: 0
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <main className="main-content">
        <header className="topbar">
          {/* Hamburger — mobile only */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', alignItems: 'center', color: 'var(--text-main)' }}
          >
            <Menu size={22} />
          </button>

          <div className="topbar-title" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="SS Enterprise" style={{ maxHeight: '60px', objectFit: 'contain' }} />
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .desktop-toggle { display: flex !important; }
        @media (max-width: 768px) {
          .desktop-toggle { display: none !important; }
          .nav-item { justify-content: flex-start !important; padding: 10px 12px !important; }
        }
        @media (min-width: 769px) {
          .topbar-title { display: none !important; }
        }
        .nav-item:has(.nav-icon):not(.nav-child) { white-space: nowrap; }
      `}</style>
    </div>
  );
};
