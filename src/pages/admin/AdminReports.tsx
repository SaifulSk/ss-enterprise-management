import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BarChart2, TrendingUp, Package, Wallet } from 'lucide-react';

interface Site { id: string; name: string; }

export const AdminReports: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState('all');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ materialCost: number; labourCost: number; capitalIssued: number; expenses: number; flaggedItems: number; } | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'sites')).then(s => setSites(s.docs.map(d => ({ id: d.id, name: (d.data() as any).name }))));
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [stockSnap, expSnap, capSnap, _attSnap, recSnap] = await Promise.all([
        getDocs(query(collection(db, 'stock_transactions'), orderBy('date'))),
        getDocs(query(collection(db, 'site_expenses'), orderBy('date'))),
        getDocs(query(collection(db, 'capital_transfers'), orderBy('date'))),
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'billing_reconciliation')),
      ]);

      const filterByMonthSite = (data: any[]) => data.filter(d =>
        d.date?.startsWith(month) &&
        (selectedSite === 'all' || d.siteId === selectedSite)
      );

      const expenses = filterByMonthSite(expSnap.docs.map(d => ({ ...d.data() }))).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const capital = filterByMonthSite(capSnap.docs.map(d => ({ ...d.data() }))).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const materialCost = filterByMonthSite(stockSnap.docs.map(d => ({ ...d.data() }))).filter((t: any) => t.costAmount).reduce((s: number, t: any) => s + (t.costAmount || 0), 0);
      const flagged = recSnap.docs.filter(d => (d.data() as any).flagStatus === 'Flagged' && (selectedSite === 'all' || (d.data() as any).siteId === selectedSite)).length;

      setSummary({ materialCost, labourCost: 0, capitalIssued: capital, expenses, flaggedItems: flagged });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Reports &amp; Analytics</h2><p>Monthly site cost roll-ups and profitability view</p></div>
      </div>

      <div className="glass-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Generate Monthly Report</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Month</label>
            <input type="month" className="form-control" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Site</label>
            <select className="form-control" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
              <option value="all">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={generateReport} disabled={loading}>
            <BarChart2 size={16}/>{loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {summary && (
        <div>
          <div className="dashboard-grid">
            <div className="glass-card stat-card">
              <div className="stat-icon blue"><Package size={22}/></div>
              <div className="stat-content"><h3>Material Costs (HW/Consumable)</h3><div className="value">₹{summary.materialCost.toLocaleString()}</div></div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon green"><Wallet size={22}/></div>
              <div className="stat-content"><h3>Capital Issued</h3><div className="value">₹{summary.capitalIssued.toLocaleString()}</div></div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon orange"><Wallet size={22}/></div>
              <div className="stat-content"><h3>Total Expenses</h3><div className="value">₹{summary.expenses.toLocaleString()}</div></div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon red"><TrendingUp size={22}/></div>
              <div className="stat-content"><h3>Flagged Items</h3><div className="value">{summary.flaggedItems}</div></div>
            </div>
          </div>

          <div className="glass-card">
            <div className="section-header"><h3>Report Summary for {month}</h3></div>
            <table className="data-table" style={{ marginTop: 16 }}>
              <thead><tr><th>Category</th><th>Amount ₹</th></tr></thead>
              <tbody>
                <tr><td>Material Costs (Hardware/Consumables)</td><td style={{ fontWeight:700 }}>₹{summary.materialCost.toLocaleString()}</td></tr>
                <tr><td>Site Expenses (Grocery, Travel, etc.)</td><td style={{ fontWeight:700 }}>₹{summary.expenses.toLocaleString()}</td></tr>
                <tr><td>Capital Issued to Sites</td><td style={{ fontWeight:700 }}>₹{summary.capitalIssued.toLocaleString()}</td></tr>
                <tr style={{ background:'#F0FDF4' }}><td style={{ fontWeight:700 }}>Net Capital Balance</td><td style={{ fontWeight:700, color:'var(--secondary)' }}>₹{(summary.capitalIssued - summary.expenses).toLocaleString()}</td></tr>
              </tbody>
            </table>
            <p style={{ marginTop:16, color:'var(--text-muted)', fontSize:'0.8rem' }}>
              Note: Full labour cost allocation is derived from the Attendance module. GST/Tally accounting remains outside this system.
            </p>
          </div>
        </div>
      )}

      {!summary && !loading && (
        <div className="glass-card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <h4>Select a month and site, then click "Generate Report"</h4>
            <p>The report will aggregate material, labour, capital, and expense data for the selected period.</p>
          </div>
        </div>
      )}
    </div>
  );
};
