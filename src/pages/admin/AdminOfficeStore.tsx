import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Archive, Pencil, Trash2 } from 'lucide-react';

interface StoreAsset {
  id: string; description: string; assetCode: string; quantity: number;
  issuedTo: string; issuedDate: string; returnable: boolean; returnStatus: 'Not Issued' | 'Issued' | 'Returned' | 'Lost'; notes: string;
}
const emptyForm = { description:'', assetCode:'', quantity:'1', issuedTo:'', issuedDate:'', returnable: true, returnStatus: 'Not Issued' as const, notes:'' };

export const AdminOfficeStore: React.FC = () => {
  const [assets, setAssets] = useState<StoreAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'store_assets'));
    setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreAsset)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const data = { ...form, quantity: parseInt(form.quantity as any)||1, updatedAt: new Date().toISOString() };
    try {
      if (editId) { await updateDoc(doc(db, 'store_assets', editId), data); }
      else { await addDoc(collection(db, 'store_assets'), { ...data, createdAt: new Date().toISOString() }); }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete asset ${name}?`)) {
      await deleteDoc(doc(db, 'store_assets', id));
      loadAll();
    }
  };

  const statusColor = (s: string) =>
    s === 'Returned' ? 'green' : s === 'Issued' ? 'orange' : s === 'Lost' ? 'red' : 'gray';

  return (
    <div>
      <div className="page-header">
        <div><h2>Office Store &amp; Asset Register</h2><p>Track all office equipment, machinery and issued items</p></div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}><Plus size={16}/>Add Asset</button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        assets.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🗄️</div>
            <h4>No assets registered</h4>
            <p>Track office equipment, tools and consumables with this register.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
            <table className="data-table">
              <thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Issued To</th><th>Issue Date</th><th>Returnable</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td><code style={{ background:'#F1F5F9', padding:'2px 6px', borderRadius:4, fontSize:'0.8rem' }}>{a.assetCode || '—'}</code></td>
                    <td style={{ fontWeight: 600 }}><div style={{ display:'flex', alignItems:'center', gap:6 }}><Archive size={14} color="var(--accent)"/>{a.description}</div></td>
                    <td>{a.quantity}</td>
                    <td>{a.issuedTo || '—'}</td>
                    <td style={{ color:'var(--text-muted)' }}>{a.issuedDate || '—'}</td>
                    <td><span className={`badge ${a.returnable ? 'blue' : 'gray'}`}>{a.returnable ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${statusColor(a.returnStatus)}`}>{a.returnStatus}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:'0.8rem' }} onClick={() => { setForm({ description:a.description,assetCode:a.assetCode||'',quantity:String(a.quantity),issuedTo:a.issuedTo||'',issuedDate:a.issuedDate||'',returnable:a.returnable,returnStatus:a.returnStatus,notes:a.notes||'' }); setEditId(a.id); setShowModal(true); }}>
                          <Pencil size={13}/>Edit
                        </button>
                        <button className="btn-danger" style={{ padding:'5px 10px', fontSize:'0.8rem' }} onClick={() => handleDelete(a.id, a.description)}>
                          <Trash2 size={13}/>Delete
                        </button>
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
          <div className="modal-card">
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Add'} Asset</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={() => setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group span-2"><label className="form-label">Description *</label><input className="form-control" required placeholder="e.g. Concrete Mixer, Drill Machine, Laptop" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Asset Code</label><input className="form-control" placeholder="e.g. EQP-001" value={form.assetCode} onChange={e => setForm(f=>({...f,assetCode:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Quantity *</label><input type="number" className="form-control" required value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Issued To</label><input className="form-control" placeholder="Name of person / site" value={form.issuedTo} onChange={e => setForm(f=>({...f,issuedTo:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Issue Date</label><input type="date" className="form-control" value={form.issuedDate} onChange={e => setForm(f=>({...f,issuedDate:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Returnable?</label>
                    <select className="form-control" value={form.returnable ? 'yes':'no'} onChange={e => setForm(f=>({...f,returnable:e.target.value==='yes'}))}>
                      <option value="yes">Yes</option><option value="no">No (Consumable)</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Return Status</label>
                    <select className="form-control" value={form.returnStatus} onChange={e => setForm(f=>({...f,returnStatus:e.target.value as any}))}>
                      <option>Not Issued</option><option>Issued</option><option>Returned</option><option>Lost</option>
                    </select>
                  </div>
                  <div className="form-group span-2"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
