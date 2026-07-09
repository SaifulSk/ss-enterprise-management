import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Package, Wallet, AlertTriangle } from 'lucide-react';

export const SupervisorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [siteName, setSiteName] = useState('');
  const [capitalBalance, setCapitalBalance] = useState(0);
  const [recentStockCount, setRecentStockCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);

  useEffect(() => {
    const siteId = currentUser?.assignedSiteId;
    if (!siteId) return;
    const load = async () => {
      const siteDoc = await getDocs(query(collection(db, 'sites'), where('__name__', '==', siteId)));
      if (!siteDoc.empty) setSiteName((siteDoc.docs[0].data() as any).name);

      const [capSnap, expSnap, stockSnap, recSnap] = await Promise.all([
        getDocs(query(collection(db, 'capital_transfers'), where('siteId', '==', siteId))),
        getDocs(query(collection(db, 'site_expenses'), where('siteId', '==', siteId))),
        getDocs(query(collection(db, 'stock_transactions'), where('siteId', '==', siteId))),
        getDocs(query(collection(db, 'billing_reconciliation'), where('siteId', '==', siteId))),
      ]);
      const cap = capSnap.docs.reduce((s, d) => s + ((d.data() as any).amount || 0), 0);
      const exp = expSnap.docs.reduce((s, d) => s + ((d.data() as any).amount || 0), 0);
      setCapitalBalance(cap - exp);
      setRecentStockCount(stockSnap.size);
      setFlaggedCount(recSnap.docs.filter(d => (d.data() as any).flagStatus === 'Flagged').length);
    };
    load();
  }, [currentUser]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Site: {siteName || currentUser?.assignedSiteId || 'Not Assigned'}</h2>
          <p>Welcome, {currentUser?.displayName || currentUser?.email}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon green"><Wallet size={22}/></div>
          <div className="stat-content"><h3>Capital Balance</h3><div className="value">₹{capitalBalance.toLocaleString()}</div><div className="sub">Available at site</div></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon blue"><Package size={22}/></div>
          <div className="stat-content"><h3>Stock Transactions</h3><div className="value">{recentStockCount}</div><div className="sub">Total for this site</div></div>
        </div>
        <div className="glass-card stat-card">
          <div className={`stat-icon ${flaggedCount > 0 ? 'red' : 'green'}`}><AlertTriangle size={22}/></div>
          <div className="stat-content"><h3>Flagged Items</h3><div className="value">{flaggedCount}</div><div className="sub">Billing mismatches</div></div>
        </div>
      </div>

      <div className="glass-card">
        <div className="section-header"><h3>Quick Actions</h3></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12, marginTop:16 }}>
          {[
            { label:'Log Stock In', path:'/supervisor/stock', icon:'📦' },
            { label:'Log Expense', path:'/supervisor/expenses', icon:'💰' },
            { label:'Mark Attendance', path:'/supervisor/attendance', icon:'📋' },
            { label:'Tools', path:'/supervisor/tools', icon:'🔧' },
          ].map(item => (
            <a key={item.path} href={item.path} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, padding:'14px', borderRadius:'var(--radius-sm)', background:'#F8FAFC', border:'1.5px solid var(--border-solid)', color:'var(--text-main)', fontWeight:500, fontSize:'0.9rem' }}>
              <span style={{ fontSize:'1.5rem' }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
