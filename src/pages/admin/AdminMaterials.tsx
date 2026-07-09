import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

const CATEGORIES = ['Civil', 'Shuttering', 'Hardware/Consumable', 'Structural/Shed', 'PPE', 'Camp Supply', 'Other'];
const UNITS = ['Bag', 'CFT', 'Kg', 'Nos', 'Mtr', 'Sqmt', 'Litre', 'Ton', 'Set'];

interface Material {
  id: string; name: string; category: string; unit: string;
  sizeVariant: string; unitConversion: string; description: string;
}
const emptyForm = { name: '', category: 'Civil', unit: 'Bag', sizeVariant: '', unitConversion: '', description: '' };

export const AdminMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('All');

  const fetch = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'materials'));
    setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Material)));
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (m: Material) => {
    setForm({ name: m.name, category: m.category, unit: m.unit, sizeVariant: m.sizeVariant || '', unitConversion: m.unitConversion || '', description: m.description || '' });
    setEditId(m.id); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(db, 'materials', editId), { ...form });
      } else {
        await addDoc(collection(db, 'materials'), { ...form, createdAt: new Date().toISOString() });
      }
      setShowModal(false); fetch();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete material: ${name}?`)) {
      await deleteDoc(doc(db, 'materials', id));
      fetch();
    }
  };

  const filtered = filterCat === 'All' ? materials : materials.filter(m => m.category === filterCat);

  return (
    <div>
      <div className="page-header">
        <div><h2>Material Master</h2><p>Define materials, units &amp; variants used across all sites</p></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>Add Material</button>
      </div>

      {/* Category Filter Tabs */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {['All', ...CATEGORIES].map(c => (
          <button key={c} className={`tab-btn ${filterCat === c ? 'active' : ''}`} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🧱</div>
            <h4>No materials found</h4>
            <p>Add materials like Cement, Sand, TMT Rod, Shuttering Ply etc.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ borderRadius: 'var(--radius)', border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Material Name</th><th>Category</th><th>Unit</th><th>Size/Type Variant</th><th>Unit Conversion</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td><span className="badge gray">{m.category}</span></td>
                    <td><span className="badge blue">{m.unit}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.sizeVariant || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.unitConversion || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(m)}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDelete(m.id, m.name)}><Trash2 size={13}/>Delete</button>
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
            <div className="modal-header">
              <h3>{editId ? 'Edit Material' : 'Add Material'}</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label className="form-label">Material Name *</label>
                    <input className="form-control" required placeholder="e.g. TMT Rod, Cement OPC 53, Shuttering Ply" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Standard Unit *</label>
                    <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Size / Type Variant</label>
                    <input className="form-control" placeholder="e.g. 10mm, 8mm, 12mm (leave blank if N/A)" value={form.sizeVariant} onChange={e => setForm(f => ({ ...f, sizeVariant: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Unit Conversion Note</label>
                    <input className="form-control" placeholder="e.g. 1 Bag = 50 Kg, 1 Sqmt = 10.76 Sqft" value={form.unitConversion} onChange={e => setForm(f => ({ ...f, unitConversion: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Description / Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Optional notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
