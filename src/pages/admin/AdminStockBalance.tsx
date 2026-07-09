import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Package, TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react';

// Stock Balance Summary — shows live running stock per site per material
// PRD 9.3: "Live stock ledger per site per material: opening balance, in, out, current balance"

interface StockTransaction {
  id: string; date: string; siteId: string; siteName: string;
  materialId: string; materialName: string; type: 'In' | 'Out' | 'Transfer';
  quantity: number; unit: string; toSiteId?: string;
}
interface Site { id: string; name: string; }
interface Material { id: string; name: string; unit: string; category: string; }

interface StockBalance {
  siteId: string; siteName: string; materialId: string; materialName: string;
  unit: string; totalIn: number; totalOut: number; balance: number;
}

export const AdminStockBalance: React.FC = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSite, setFilterSite] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [txSnap, sSnap, mSnap] = await Promise.all([
      getDocs(query(collection(db, 'stock_transactions'), orderBy('date'))),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'materials')),
    ]);
    setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    setMaterials(mSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name, unit: (d.data() as any).unit, category: (d.data() as any).category || '' })));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  // Compute balances
  const balances: StockBalance[] = (() => {
    const map: Record<string, StockBalance> = {};
    for (const tx of transactions) {
      if (tx.type === 'In') {
        const key = `${tx.siteId}_${tx.materialId}`;
        if (!map[key]) map[key] = { siteId: tx.siteId, siteName: tx.siteName, materialId: tx.materialId, materialName: tx.materialName, unit: tx.unit, totalIn: 0, totalOut: 0, balance: 0 };
        map[key].totalIn += tx.quantity;
        map[key].balance += tx.quantity;
      } else if (tx.type === 'Out') {
        const key = `${tx.siteId}_${tx.materialId}`;
        if (!map[key]) map[key] = { siteId: tx.siteId, siteName: tx.siteName, materialId: tx.materialId, materialName: tx.materialName, unit: tx.unit, totalIn: 0, totalOut: 0, balance: 0 };
        map[key].totalOut += tx.quantity;
        map[key].balance -= tx.quantity;
      } else if (tx.type === 'Transfer') {
        // Deduct from source
        const srcKey = `${tx.siteId}_${tx.materialId}`;
        if (!map[srcKey]) map[srcKey] = { siteId: tx.siteId, siteName: tx.siteName, materialId: tx.materialId, materialName: tx.materialName, unit: tx.unit, totalIn: 0, totalOut: 0, balance: 0 };
        map[srcKey].totalOut += tx.quantity;
        map[srcKey].balance -= tx.quantity;
        // Add to destination
        if (tx.toSiteId) {
          const destSite = sites.find(s => s.id === tx.toSiteId);
          const destKey = `${tx.toSiteId}_${tx.materialId}`;
          if (!map[destKey]) map[destKey] = { siteId: tx.toSiteId, siteName: destSite?.name || '', materialId: tx.materialId, materialName: tx.materialName, unit: tx.unit, totalIn: 0, totalOut: 0, balance: 0 };
          map[destKey].totalIn += tx.quantity;
          map[destKey].balance += tx.quantity;
        }
      }
    }
    return Object.values(map);
  })();

  const filtered = balances
    .filter(b => !filterSite || b.siteId === filterSite)
    .filter(b => !filterMaterial || b.materialId === filterMaterial)
    .sort((a, b) => a.siteName.localeCompare(b.siteName) || a.materialName.localeCompare(b.materialName));

  const totalSites = [...new Set(filtered.map(b => b.siteId))].length;
  const lowStockCount = filtered.filter(b => b.balance <= 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Stock Balance Summary</h2>
          <p>Live running balance per site per material (calculated from all transactions)</p>
        </div>
        <button className="btn-secondary" onClick={loadAll}><Package size={16} /> Refresh</button>
      </div>

      {/* Summary */}
      <div className="dashboard-grid" style={{ marginBottom: 20 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon blue"><Package size={22} /></div>
          <div className="stat-content">
            <h3>Materials Tracked</h3>
            <div className="value">{filtered.length}</div>
            <div className="sub">Active site-material combinations</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className={`stat-icon ${lowStockCount > 0 ? 'red' : 'green'}`}><TrendingDown size={22} /></div>
          <div className="stat-content">
            <h3>Zero / Negative Balance</h3>
            <div className="value">{lowStockCount}</div>
            <div className="sub">Items at zero or below</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-control" style={{ width: 220 }} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="form-control" style={{ width: 220 }} value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}>
          <option value="">All Materials</option>
          {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h4>No stock data yet</h4>
            <p>Stock balances will appear here once you record stock transactions.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Material</th>
                  <th>Total In</th>
                  <th>Total Out</th>
                  <th>Current Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={`${b.siteId}_${b.materialId}`}
                    style={{ background: b.balance <= 0 ? 'rgba(239,68,68,0.04)' : 'inherit' }}>
                    <td style={{ fontWeight: 600 }}>{b.siteName}</td>
                    <td style={{ fontWeight: 500 }}>{b.materialName}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--secondary)' }}>
                        <TrendingUp size={14} />{b.totalIn.toFixed(2)} {b.unit}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}>
                        <TrendingDown size={14} />{b.totalOut.toFixed(2)} {b.unit}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: b.balance <= 0 ? 'var(--danger)' : b.balance < 10 ? 'var(--accent)' : 'var(--text-main)' }}>
                        {b.balance.toFixed(2)} {b.unit}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${b.balance <= 0 ? 'red' : b.balance < 10 ? 'orange' : 'green'}`}>
                        {b.balance <= 0 ? 'Empty / Deficit' : b.balance < 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
