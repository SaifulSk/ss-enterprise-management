import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

interface Material { id: string; name: string; unit: string; }
interface Vendor { id: string; name: string; }
interface StockTx { id: string; date: string; type: string; materialId: string; materialName: string; quantity: number; unit: string; vendorId?: string; vendorName?: string; vehicleNo?: string; locationTag?: string; purpose?: string; costAmount?: number; notes?: string; recordedBy?: string; }
const LOC_TAGS = ['Wall', 'Footing/Foundation', 'Beam', 'Slab', 'Column', 'Shuttering', 'Above GL', 'Below GL', 'Plinth Beam', 'Other'];

export const SupervisorStock: React.FC = () => {
  const { currentUser } = useAuth();
  const siteId = currentUser?.assignedSiteId || '';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<StockTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], materialId:'', type:'In', quantity:'', vendorId:'', vehicleNo:'', locationTag:'', purpose:'', costAmount:'', notes:'' });

  const loadAll = async () => {
    setLoading(true);
    const [mSnap, vSnap, txSnap] = await Promise.all([
      getDocs(collection(db, 'materials')),
      getDocs(collection(db, 'vendors')),
      siteId ? getDocs(query(collection(db, 'stock_transactions'), where('siteId','==',siteId), orderBy('date','desc'))) : Promise.resolve({ docs: [] as any[] }),
    ]);
    setMaterials(mSnap.docs.map(d => ({ id:d.id, name:(d.data() as any).name, unit:(d.data() as any).unit })));
    setVendors(vSnap.docs.map(d => ({ id:d.id, name:(d.data() as any).name })));
    setTransactions((txSnap as any).docs.map((d: any) => ({ id:d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const mat = materials.find(m => m.id === form.materialId);
    const vend = vendors.find(v => v.id === form.vendorId);
    const data = {
      date: form.date, siteId, siteName: currentUser?.displayName || '',
      materialId: form.materialId, materialName: mat?.name || '', type: form.type,
      quantity: parseFloat(form.quantity)||0, unit: mat?.unit||'',
      vendorId: form.vendorId||null, vendorName: vend?.name||null,
      vehicleNo: form.vehicleNo||null, locationTag: form.locationTag||null,
      purpose: form.purpose||null, costAmount: form.costAmount ? parseFloat(form.costAmount) : null,
      notes: form.notes, updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'stock_transactions', editId), data);
      } else {
        await addDoc(collection(db, 'stock_transactions'), { ...data, recordedBy: currentUser?.email||'supervisor', createdAt: new Date().toISOString() });
      }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this stock transaction?`)) {
      await deleteDoc(doc(db, 'stock_transactions', id));
      loadAll();
    }
  };

  const filtered = transactions.filter(t => filterType === 'All' || t.type === filterType);

  return (
    <div>
      <div className="page-header">
        <div><h2>Stock Entry</h2><p>Record material in, out and transfers for your site</p></div>
        <button className="btn-primary" onClick={() => { setForm({ date:new Date().toISOString().split('T')[0],materialId:'',type:'In',quantity:'',vendorId:'',vehicleNo:'',locationTag:'',purpose:'',costAmount:'',notes:'' }); setEditId(null); setShowModal(true); }}><Plus size={16}/>Record Stock</button>
      </div>
      <div className="tabs">
        {['All','In','Out','Transfer'].map(t => <button key={t} className={`tab-btn ${filterType===t?'active':''}`} onClick={()=>setFilterType(t)}>{t}</button>)}
      </div>
      <div className="glass-card" style={{ padding:0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? <div className="empty-state"><div className="icon">📦</div><h4>No transactions yet</h4></div> :
        <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Material</th><th>Qty</th><th>Vendor</th><th>Vehicle</th><th>Location</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td><span className={`badge ${t.type==='In'?'green':t.type==='Out'?'red':'orange'}`}>{t.type}</span></td>
                  <td style={{ fontWeight:600 }}>{t.materialName}</td>
                  <td>{t.quantity} {t.unit}</td>
                  <td style={{ color:'var(--text-muted)' }}>{t.vendorName||'—'}</td>
                  <td style={{ color:'var(--text-muted)' }}>{t.vehicleNo||'—'}</td>
                  <td><span className={t.locationTag?'badge gray':''}>{t.locationTag||'—'}</span></td>
                  <td>
                    {t.recordedBy === currentUser?.email && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setForm({
                            date: t.date, materialId: t.materialId, type: t.type, quantity: String(t.quantity),
                            vendorId: t.vendorId || '', vehicleNo: t.vehicleNo || '', locationTag: t.locationTag || '',
                            purpose: t.purpose || '', costAmount: t.costAmount ? String(t.costAmount) : '', notes: t.notes || ''
                          });
                          setEditId(t.id); setShowModal(true);
                        }}><Pencil size={13}/></button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id)}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal-card">
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Record'} Stock Transaction</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Type *</label>
                    <select className="form-control" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                      <option value="In">Stock In</option><option value="Out">Stock Out</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Material *</label>
                    <select className="form-control" required value={form.materialId} onChange={e=>setForm(f=>({...f,materialId:e.target.value}))}>
                      <option value="">Select material</option>{materials.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Quantity *</label><input type="number" step="0.5" className="form-control" required value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} /></div>
                  {form.type==='In' && <div className="form-group"><label className="form-label">Vendor</label>
                    <select className="form-control" value={form.vendorId} onChange={e=>setForm(f=>({...f,vendorId:e.target.value}))}>
                      <option value="">Select vendor</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>}
                  <div className="form-group"><label className="form-label">Vehicle No.</label><input className="form-control" placeholder="e.g. WB 26 T 1234" value={form.vehicleNo} onChange={e=>setForm(f=>({...f,vehicleNo:e.target.value}))} /></div>
                  {form.type==='Out' && <>
                    <div className="form-group"><label className="form-label">Location Tag *</label>
                      <select className="form-control" required={form.type==='Out'} value={form.locationTag} onChange={e=>setForm(f=>({...f,locationTag:e.target.value}))}>
                        <option value="">Select location</option>{LOC_TAGS.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Purpose</label><input className="form-control" placeholder="e.g. Ground floor slab" value={form.purpose} onChange={e=>setForm(f=>({...f,purpose:e.target.value}))} /></div>
                  </>}
                  <div className="form-group"><label className="form-label">Cost ₹ (hardware/consumable)</label><input type="number" className="form-control" value={form.costAmount} onChange={e=>setForm(f=>({...f,costAmount:e.target.value}))} /></div>
                  <div className="form-group span-2"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving...':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
