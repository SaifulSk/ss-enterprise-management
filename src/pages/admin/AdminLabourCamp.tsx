import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Package, Gift } from 'lucide-react';

// PRD 9.8: Camp supply stock (food, gas, bedding) tracked with running balance,
//          optionally linked to site cost.
//          Personal product/PPE distribution logged by item, quantity, and recipient
//          (worker or bulk site-level)

const CAMP_CATEGORIES = ['Food / Grocery', 'Gas Cylinder', 'Bedding / Linen', 'Cooking Utensil', 'Electrical', 'Other Camp Supply'];
const PPE_ITEMS = ['Helmet', 'Safety Jacket', 'Safety Shoes', 'Gloves', 'Raincoat / Poncho', 'Safety Goggles', 'Face Mask', 'Other PPE'];

interface CampEntry {
  id: string; date: string; siteId: string; siteName: string;
  tab: 'camp' | 'ppe';
  itemCategory: string; itemName: string;
  quantity: number; unit: string; costAmount: number;
  issuedTo: string;  // worker name or 'Bulk - Site Level'
  notes: string;
}
interface Site { id: string; name: string; }
interface Worker { id: string; name: string; }

export const AdminLabourCamp: React.FC = () => {
  const [entries, setEntries] = useState<CampEntry[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'camp' | 'ppe'>('camp');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSite, setFilterSite] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    siteId: '', itemCategory: 'Food / Grocery', itemName: '',
    quantity: '', unit: 'Nos', costAmount: '', issuedTo: 'Bulk - Site Level', notes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    const [eSnap, sSnap, wSnap] = await Promise.all([
      getDocs(query(collection(db, 'labour_camp'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'workers')),
    ]);
    setEntries(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as CampEntry)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    setWorkers(wSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const site = sites.find(s => s.id === form.siteId);
    try {
      await addDoc(collection(db, 'labour_camp'), {
        ...form,
        tab: activeTab,
        siteName: site?.name || '',
        quantity: parseFloat(form.quantity) || 0,
        costAmount: parseFloat(form.costAmount) || 0,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setForm({ date: new Date().toISOString().split('T')[0], siteId:'', itemCategory:'Food / Grocery', itemName:'', quantity:'', unit:'Nos', costAmount:'', issuedTo:'Bulk - Site Level', notes:'' });
      loadAll();
    } finally { setSaving(false); }
  };

  const filtered = entries
    .filter(e => e.tab === activeTab)
    .filter(e => !filterSite || e.siteId === filterSite);

  const totalCampCost = entries.filter(e => e.tab === 'camp' && (!filterSite || e.siteId === filterSite))
    .reduce((s, e) => s + e.costAmount, 0);
  const totalPPECost = entries.filter(e => e.tab === 'ppe' && (!filterSite || e.siteId === filterSite))
    .reduce((s, e) => s + e.costAmount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Labour Camp &amp; PPE</h2>
          <p>Track camp supply stock and PPE distribution to workers</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ date: new Date().toISOString().split('T')[0], siteId:'', itemCategory: activeTab === 'camp' ? 'Food / Grocery' : 'Helmet', itemName:'', quantity:'', unit:'Nos', costAmount:'', issuedTo:'Bulk - Site Level', notes:'' }); setShowModal(true); }}>
          <Plus size={16} />{activeTab === 'camp' ? 'Log Camp Supply' : 'Issue PPE'}
        </button>
      </div>

      {/* Summary */}
      <div className="dashboard-grid" style={{ marginBottom: 20 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon green"><Package size={22} /></div>
          <div className="stat-content">
            <h3>Camp Supply Cost</h3>
            <div className="value">₹{totalCampCost.toLocaleString()}</div>
            <div className="sub">Food, gas, bedding, etc.</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon orange"><Gift size={22} /></div>
          <div className="stat-content">
            <h3>PPE Distribution Cost</h3>
            <div className="value">₹{totalPPECost.toLocaleString()}</div>
            <div className="sub">Helmets, jackets, shoes, etc.</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-control" style={{ width: 220 }} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab-btn ${activeTab === 'camp' ? 'active' : ''}`} onClick={() => setActiveTab('camp')}>Camp Supplies</button>
          <button className={`tab-btn ${activeTab === 'ppe' ? 'active' : ''}`} onClick={() => setActiveTab('ppe')}>PPE / Personal Items</button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">{activeTab === 'camp' ? '🏕️' : '⛑️'}</div>
            <h4>No {activeTab === 'camp' ? 'camp supply' : 'PPE'} records</h4>
            <p>{activeTab === 'camp' ? 'Log food, gas, bedding and other camp supplies.' : 'Record PPE issued to workers like helmets, jackets, safety shoes.'}</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Site</th>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Qty</th>
                  {activeTab === 'ppe' && <th>Issued To</th>}
                  <th>Cost ₹</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td style={{ fontWeight: 500 }}>{e.siteName}</td>
                    <td><span className="badge gray">{e.itemCategory}</span></td>
                    <td style={{ fontWeight: 600 }}>{e.itemName || e.itemCategory}</td>
                    <td>{e.quantity} {e.unit}</td>
                    {activeTab === 'ppe' && <td style={{ color: 'var(--text-muted)' }}>{e.issuedTo || 'Bulk - Site Level'}</td>}
                    <td style={{ fontWeight: 700 }}>{e.costAmount > 0 ? `₹${e.costAmount.toLocaleString()}` : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{activeTab === 'camp' ? 'Log Camp Supply' : 'Issue PPE / Personal Item'}</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site *</label>
                    <select className="form-control" required value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}>
                      <option value="">Select site</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-control" required value={form.itemCategory} onChange={e => setForm(f => ({ ...f, itemCategory: e.target.value }))}>
                      {(activeTab === 'camp' ? CAMP_CATEGORIES : PPE_ITEMS).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Item Name / Description</label>
                    <input className="form-control" placeholder={activeTab === 'camp' ? 'e.g. Rice 50kg' : 'e.g. Blue helmet, Brand X'} value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" step="0.5" className="form-control" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      {['Nos', 'Kg', 'Litre', 'Set', 'Pair', 'Pack', 'Cylinder'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost ₹</label>
                    <input type="number" className="form-control" placeholder="Total cost" value={form.costAmount} onChange={e => setForm(f => ({ ...f, costAmount: e.target.value }))} />
                  </div>
                  {activeTab === 'ppe' && (
                    <div className="form-group">
                      <label className="form-label">Issued To</label>
                      <select className="form-control" value={form.issuedTo} onChange={e => setForm(f => ({ ...f, issuedTo: e.target.value }))}>
                        <option value="Bulk - Site Level">Bulk - Site Level</option>
                        {workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
