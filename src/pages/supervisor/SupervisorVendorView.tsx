import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { TrendingDown, TrendingUp, Package } from 'lucide-react';

// PRD Section 10: Supervisor can view own site's vendors (not manage them)
// This is a read-only view of vendor ledger entries for the supervisor's assigned site

interface VendorLedgerEntry {
  id: string; date: string; vendorId: string; vendorName: string;
  type: 'purchase' | 'payment'; materialName: string;
  quantity: number; unit: string; rate: number; amount: number;
}
interface Vendor { id: string; name: string; }

const computeBalance = (entries: VendorLedgerEntry[], vendorId: string) => {
  const vendorEntries = entries.filter(e => e.vendorId === vendorId);
  const totalPurchased = vendorEntries.filter(e => e.type === 'purchase').reduce((s, e) => s + e.amount, 0);
  const totalPaid = vendorEntries.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);
  return { totalPurchased, totalPaid, balance: totalPurchased - totalPaid };
};

export const SupervisorVendorView: React.FC = () => {
  const { currentUser } = useAuth();
  const siteId = currentUser?.assignedSiteId || '';
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('');

  useEffect(() => {
    if (!siteId) { setLoading(false); return; }
    const load = async () => {
      const [eSnap, vSnap] = await Promise.all([
        getDocs(query(collection(db, 'vendor_ledger'), where('siteId', '==', siteId), orderBy('date', 'desc'))),
        getDocs(collection(db, 'vendors')),
      ]);
      const myEntries = eSnap.docs.map(d => ({ id: d.id, ...d.data() } as VendorLedgerEntry));
      setEntries(myEntries);
      const myVendorIds = [...new Set(myEntries.map(e => e.vendorId))];
      setVendors(vSnap.docs.filter(d => myVendorIds.includes(d.id)).map(d => ({ id: d.id, name: (d.data() as any).name })));
      setLoading(false);
    };
    load();
  }, [siteId]);

  const filteredEntries = selectedVendor ? entries.filter(e => e.vendorId === selectedVendor) : entries;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vendor Purchases</h2>
          <p>Material purchases from vendors for your site (read-only)</p>
        </div>
      </div>

      {/* Vendor Balances */}
      {vendors.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
          {vendors.map(v => {
            const bal = computeBalance(entries, v.id);
            return (
              <div key={v.id} className="glass-card" style={{ padding: '16px 18px', cursor: 'pointer', border: selectedVendor === v.id ? '2px solid var(--primary-light)' : undefined }} onClick={() => setSelectedVendor(v.id === selectedVendor ? '' : v.id)}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{v.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Purchased: <strong>₹{bal.totalPurchased.toLocaleString()}</strong></span>
                  <span style={{ color: 'var(--text-muted)' }}>Balance: <strong style={{ color: bal.balance > 0 ? 'var(--danger)' : 'var(--secondary)' }}>₹{bal.balance.toLocaleString()}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        entries.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📒</div>
            <h4>No vendor purchases for your site</h4>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Vendor</th><th>Material</th><th>Qty / Rate</th><th>Amount ₹</th></tr></thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td><span className={`badge ${e.type === 'purchase' ? 'blue' : 'green'}`}>{e.type === 'purchase' ? 'Purchase' : 'Payment'}</span></td>
                    <td style={{ fontWeight: 600 }}>{e.vendorName}</td>
                    <td>{e.materialName || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{e.type === 'purchase' ? `${e.quantity} × ₹${e.rate}` : '—'}</td>
                    <td style={{ fontWeight: 700 }}>₹{e.amount.toLocaleString()}</td>
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
