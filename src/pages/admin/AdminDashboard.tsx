import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Package, Truck, Users, Wallet, AlertTriangle, TrendingUp, Wrench, Car, ShieldCheck, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  sites: number; vendors: number; workers: number; tools: number;
  totalCapital: number; totalExpenses: number;
  flaggedItems: number; pendingCompliance: number;
  vehiclesExpiringSoon: number;
}

const isExpiringSoon = (dateStr: string) => {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000;
};

const isOverdue = (dateStr: string) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    sites: 0, vendors: 0, workers: 0, tools: 0,
    totalCapital: 0, totalExpenses: 0,
    flaggedItems: 0, pendingCompliance: 0, vehiclesExpiringSoon: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        getDocs(collection(db, 'sites')),
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'tools')),
        getDocs(collection(db, 'capital_transfers')),
        getDocs(collection(db, 'site_expenses')),
        getDocs(collection(db, 'billing_reconciliation')),
        getDocs(collection(db, 'compliance_items')),
        getDocs(collection(db, 'vehicles')),
      ]);

      const get = (i: number, key?: string) => {
        const r = results[i];
        if (r.status !== 'fulfilled') return key ? 0 : 0;
        if (key) return r.value.docs.reduce((s, d) => s + ((d.data() as any)[key] || 0), 0);
        return r.value.size;
      };

      const capDocs = results[4].status === 'fulfilled' ? results[4].value.docs : [];
      const expDocs = results[5].status === 'fulfilled' ? results[5].value.docs : [];
      const recDocs = results[6].status === 'fulfilled' ? results[6].value.docs : [];
      const compDocs = results[7].status === 'fulfilled' ? results[7].value.docs : [];
      const vehDocs = results[8].status === 'fulfilled' ? results[8].value.docs : [];

      setStats({
        sites: get(0), vendors: get(1), workers: get(2), tools: get(3),
        totalCapital: capDocs.reduce((s, d) => s + ((d.data() as any).amount || 0), 0),
        totalExpenses: expDocs.reduce((s, d) => s + ((d.data() as any).amount || 0), 0),
        flaggedItems: recDocs.filter(d => (d.data() as any).flagStatus === 'Flagged').length,
        pendingCompliance: compDocs.filter(d => {
          const dd = (d.data() as any).dueDate;
          return isOverdue(dd) || isExpiringSoon(dd);
        }).length,
        vehiclesExpiringSoon: vehDocs.filter(d => {
          const v = d.data() as any;
          return isExpiringSoon(v.taxExpiry) || isExpiringSoon(v.pollutionExpiry) || isOverdue(v.taxExpiry) || isOverdue(v.pollutionExpiry);
        }).length,
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  const netBalance = stats.totalCapital - stats.totalExpenses;

  const quickLinks = [
    { label: 'Vendor Ledger', path: '/admin/vendor-ledger', icon: <Wallet size={17} />, color: 'blue' },
    { label: 'Stock Balance', path: '/admin/stock-balance', icon: <Package size={17} />, color: 'green' },
    { label: 'Log Attendance', path: '/admin/attendance', icon: <ClipboardList size={17} />, color: 'purple' },
    { label: 'Capital & Expenses', path: '/admin/capital-expenses', icon: <Wallet size={17} />, color: 'orange' },
    { label: 'Reconciliation', path: '/admin/reconciliation', icon: <AlertTriangle size={17} />, color: 'red' },
    { label: 'Reports', path: '/admin/reports', icon: <TrendingUp size={17} />, color: 'green' },
    { label: 'Transport Log', path: '/admin/transport', icon: <Truck size={17} />, color: 'blue' },
    { label: 'Compliance', path: '/admin/compliance', icon: <ShieldCheck size={17} />, color: stats.pendingCompliance > 0 ? 'red' : 'green' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Company Overview</h2>
          <p>S S Enterprise — Civil &amp; Interior Works Management System</p>
        </div>
      </div>

      {/* Alerts Banner */}
      {(stats.flaggedItems > 0 || stats.pendingCompliance > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {stats.flaggedItems > 0 && (
            <div className="info-box red">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span><strong>{stats.flaggedItems} billing reconciliation item(s)</strong> are flagged for possible misuse or excess wastage. <Link to="/admin/reconciliation" style={{ fontWeight: 700, color: 'inherit', textDecoration: 'underline' }}>Review now →</Link></span>
            </div>
          )}
          {stats.pendingCompliance > 0 && (
            <div className="info-box orange">
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span><strong>{stats.pendingCompliance} compliance item(s)</strong> are overdue or due within 30 days. <Link to="/admin/compliance" style={{ fontWeight: 700, color: 'inherit', textDecoration: 'underline' }}>View →</Link></span>
            </div>
          )}
        </div>
      )}

      {/* Primary Stats */}
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon blue"><MapPin size={22} /></div>
          <div className="stat-content">
            <h3>Active Sites</h3>
            <div className="value">{loading ? '…' : stats.sites}</div>
            <div className="sub">Registered project sites</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon green"><Truck size={22} /></div>
          <div className="stat-content">
            <h3>Vendors</h3>
            <div className="value">{loading ? '…' : stats.vendors}</div>
            <div className="sub">Active suppliers tracked</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon purple"><Users size={22} /></div>
          <div className="stat-content">
            <h3>Workers</h3>
            <div className="value">{loading ? '…' : stats.workers}</div>
            <div className="sub">Registered workforce</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon orange"><Wrench size={22} /></div>
          <div className="stat-content">
            <h3>Tools &amp; Equipment</h3>
            <div className="value">{loading ? '…' : stats.tools}</div>
            <div className="sub">In asset register</div>
          </div>
        </div>
      </div>

      {/* Finance Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20, marginBottom: 28 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon green"><Wallet size={22} /></div>
          <div className="stat-content">
            <h3>Total Capital Issued</h3>
            <div className="value" style={{ fontSize: '1.3rem' }}>₹{loading ? '…' : stats.totalCapital.toLocaleString()}</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon orange"><Wallet size={22} /></div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <div className="value" style={{ fontSize: '1.3rem' }}>₹{loading ? '…' : stats.totalExpenses.toLocaleString()}</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className={`stat-icon ${netBalance >= 0 ? 'green' : 'red'}`}><TrendingUp size={22} /></div>
          <div className="stat-content">
            <h3>Net Capital Balance</h3>
            <div className="value" style={{ fontSize: '1.3rem', color: netBalance >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
              ₹{loading ? '…' : netBalance.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className={`stat-icon ${stats.flaggedItems > 0 ? 'red' : 'green'}`}><AlertTriangle size={22} /></div>
          <div className="stat-content">
            <h3>Flagged Variances</h3>
            <div className="value">{loading ? '…' : stats.flaggedItems}</div>
            <div className="sub">Billing mismatches</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <h3>Quick Actions</h3>
          <p>Jump to frequently used modules</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10 }}>
          {quickLinks.map(l => (
            <Link
              key={l.path}
              to={l.path}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: '#F8FAFC', border: '1.5px solid var(--border-solid)', color: 'var(--text-main)', transition: 'var(--transition)', fontWeight: 500, fontSize: '0.85rem' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-light)'; (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'; (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
            >
              <span className={`stat-icon ${l.color}`} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }}>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
