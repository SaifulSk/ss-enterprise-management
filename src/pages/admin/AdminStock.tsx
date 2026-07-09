import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, ArrowUp, ArrowDown, ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';

interface StockTx {
  id: string; date: string; siteId: string; siteName: string;
  materialId: string; materialName: string; type: 'In' | 'Out' | 'Transfer';
  quantity: number; unit: string; vendorId?: string; vendorName?: string;
  vehicleNo?: string; locationTag?: string; purpose?: string;
  costAmount?: number; toSiteId?: string; toSiteName?: string;
  recordedBy: string; notes: string;
}
interface Site { id: string; name: string; }
interface Material { id: string; name: string; unit: string; }
interface Vendor { id: string; name: string; }

const emptyForm = {
  date: new Date().toISOString().split('T')[0], siteId: '', materialId: '', type: 'In' as 'In' | 'Out' | 'Transfer',
  quantity: '', unit: '', vendorId: '', vehicleNo: '', locationTag: '', purpose: '',
  costAmount: '', toSiteId: '', notes: ''
};

const LOC_TAGS = ['Wall', 'Footing/Foundation', 'Beam', 'Slab', 'Column', 'Shuttering', 'Above GL', 'Below GL', 'Plinth Beam', 'Other'];

export const AdminStock: React.FC = () => {
  const [transactions, setTransactions] = useState<StockTx[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [txSnap, siteSnap, matSnap, vendSnap] = await Promise.all([
      getDocs(query(collection(db, 'stock_transactions'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'materials')),
      getDocs(collection(db, 'vendors')),
    ]);
    setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as StockTx)));
    setSites(siteSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Site)));
    setMaterials(matSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name, unit: (d.data() as any).unit } as Material)));
    setVendors(vendSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Vendor)));
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const site = sites.find(s => s.id === form.siteId);
    const mat = materials.find(m => m.id === form.materialId);
    const vend = vendors.find(v => v.id === form.vendorId);
    const toSite = sites.find(s => s.id === form.toSiteId);
    const data = {
      date: form.date, siteId: form.siteId, siteName: site?.name || '',
      materialId: form.materialId, materialName: mat?.name || '', type: form.type,
      quantity: parseFloat(form.quantity as any) || 0, unit: mat?.unit || form.unit,
      vendorId: form.vendorId || null, vendorName: vend?.name || null,
      vehicleNo: form.vehicleNo || null, locationTag: form.locationTag || null,
      purpose: form.purpose || null, costAmount: form.costAmount ? parseFloat(form.costAmount as any) : null,
      toSiteId: form.toSiteId || null, toSiteName: toSite?.name || null,
      notes: form.notes, updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'stock_transactions', editId), data);
      } else {
        await addDoc(collection(db, 'stock_transactions'), { ...data, recordedBy: 'Admin', createdAt: new Date().toISOString() });
      }
      setShowModal(false); setForm(emptyForm); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this stock transaction?`)) {
      await deleteDoc(doc(db, 'stock_transactions', id));
      loadAll();
    }
  };

  const filtered = transactions
    .filter(t => !filterSite || t.siteId === filterSite)
    .filter(t => filterType === 'All' || t.type === filterType);

  const typeIcon = (t: string) =>
    t === 'In' ? <ArrowDown size={14} color="var(--secondary)"/> :
    t === 'Out' ? <ArrowUp size={14} color="var(--danger)"/> :
    <ArrowLeftRight size={14} color="var(--accent)"/>;

  return (
    <div>
      <div className="page-header">
        <div><h2>Stock Ledger</h2><p>All site stock transactions — In, Out &amp; Transfers</p></div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}><Plus size={16}/>Record Transaction</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="form-control" style={{ width: 200 }} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="tabs" style={{ margin: 0 }}>
          {['All','In','Out','Transfer'].map(t => <button key={t} className={`tab-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>{t}</button>)}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h4>No transactions found</h4>
            <p>Record stock-in when materials arrive, stock-out when used.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Site</th><th>Material</th><th>Qty</th><th>Vendor/Vehicle</th><th>Location Tag</th><th>Cost (₹)</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{t.date}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: '0.82rem' }}>{typeIcon(t.type)}{t.type}</span></td>
                    <td style={{ fontWeight: 500 }}>{t.siteName}</td>
                    <td>{t.materialName}</td>
                    <td><strong>{t.quantity}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.unit}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {t.vendorName && <div>{t.vendorName}</div>}
                      {t.vehicleNo && <div>🚛 {t.vehicleNo}</div>}
                    </td>
                    <td><span className={t.locationTag ? 'badge gray' : ''}>{t.locationTag || '—'}</span></td>
                    <td>{t.costAmount ? `₹${t.costAmount.toLocaleString()}` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setForm({
                            date: t.date, siteId: t.siteId, materialId: t.materialId, type: t.type,
                            quantity: String(t.quantity), unit: t.unit, vendorId: t.vendorId || '',
                            vehicleNo: t.vehicleNo || '', locationTag: t.locationTag || '', purpose: t.purpose || '',
                            costAmount: t.costAmount ? String(t.costAmount) : '', toSiteId: t.toSiteId || '', notes: t.notes || ''
                          });
                          setEditId(t.id); setShowModal(true);
                        }}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id)}><Trash2 size={13}/>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Record'} Stock Transaction</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Transaction Type *</label>
                    <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                      <option value="In">Stock In (Received)</option>
                      <option value="Out">Stock Out (Used)</option>
                      <option value="Transfer">Transfer (Site to Site)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site *</label>
                    <select className="form-control" required value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}>
                      <option value="">Select site</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {form.type === 'Transfer' && (
                    <div className="form-group">
                      <label className="form-label">Destination Site *</label>
                      <select className="form-control" required value={form.toSiteId} onChange={e => setForm(f => ({ ...f, toSiteId: e.target.value }))}>
                        <option value="">Select destination</option>
                        {sites.filter(s => s.id !== form.siteId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Material *</label>
                    <select className="form-control" required value={form.materialId} onChange={e => setForm(f => ({ ...f, materialId: e.target.value }))}>
                      <option value="">Select material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" step="0.5" className="form-control" required placeholder="e.g. 50" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  {form.type === 'In' && (
                    <div className="form-group">
                      <label className="form-label">Vendor</label>
                      <select className="form-control" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                        <option value="">Select vendor (optional)</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Vehicle / Transport No.</label>
                    <input className="form-control" placeholder="e.g. WB 26 T 1234 or Raju Tempo" value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} />
                  </div>
                  {form.type === 'Out' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Location / Structural Tag *</label>
                        <select className="form-control" required={form.type === 'Out'} value={form.locationTag} onChange={e => setForm(f => ({ ...f, locationTag: e.target.value }))}>
                          <option value="">Select location</option>
                          {LOC_TAGS.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Purpose / Task</label>
                        <input className="form-control" placeholder="e.g. Ground floor slab concreting" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label className="form-label">Cost Amount ₹ (for hardware/consumables)</label>
                    <input type="number" className="form-control" placeholder="Leave blank if N/A" value={form.costAmount} onChange={e => setForm(f => ({ ...f, costAmount: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Any additional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
