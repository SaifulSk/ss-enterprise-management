import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Pencil, Wrench, Trash2 } from 'lucide-react';

interface Tool {
  id: string; name: string; type: string; ownership: 'Company' | 'Rental';
  currentSiteId: string; currentSiteName: string; condition: 'Working' | 'Damaged' | 'Under Repair';
  returnable: boolean; rentalTerms: string; notes: string;
}
interface Site { id: string; name: string; }
const emptyForm = { name: '', type: '', ownership: 'Company' as 'Company' | 'Rental', currentSiteId: 'office', condition: 'Working' as 'Working' | 'Damaged' | 'Under Repair', returnable: true, rentalTerms: '', notes: '' };

export const AdminTools: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [tSnap, sSnap] = await Promise.all([getDocs(collection(db, 'tools')), getDocs(collection(db, 'sites'))]);
    setTools(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tool)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Site)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (t: Tool) => {
    setForm({ name: t.name, type: t.type, ownership: t.ownership, currentSiteId: t.currentSiteId, condition: t.condition, returnable: t.returnable, rentalTerms: t.rentalTerms || '', notes: t.notes || '' });
    setEditId(t.id); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const site = sites.find(s => s.id === form.currentSiteId);
    const data = { ...form, currentSiteName: site?.name || (form.currentSiteId === 'office' ? 'Office Store' : form.currentSiteId), updatedAt: new Date().toISOString() };
    try {
      if (editId) {
        await updateDoc(doc(db, 'tools', editId), data);
      } else {
        await addDoc(collection(db, 'tools'), { ...data, createdAt: new Date().toISOString() });
      }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete tool: ${name}?`)) {
      await deleteDoc(doc(db, 'tools', id));
      loadAll();
    }
  };

  const condColor = (c: string) => c === 'Working' ? 'green' : c === 'Damaged' ? 'red' : 'orange';

  return (
    <div>
      <div className="page-header">
        <div><h2>Tools &amp; Equipment</h2><p>Track location, condition and ownership of all tools</p></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>Add Tool</button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        tools.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔧</div>
            <h4>No tools registered</h4>
            <p>Add machinery, equipment and tools to track their location and condition.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr><th>Tool Name</th><th>Type</th><th>Ownership</th><th>Current Location</th><th>Condition</th><th>Returnable</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {tools.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wrench size={14} color="var(--accent)"/>{t.name}</div></td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.type}</td>
                    <td><span className={`badge ${t.ownership === 'Company' ? 'blue' : 'purple'}`}>{t.ownership}</span></td>
                    <td style={{ fontWeight: 500 }}>{t.currentSiteName || t.currentSiteId}</td>
                    <td><span className={`badge ${condColor(t.condition)}`}>{t.condition}</span></td>
                    <td><span className={`badge ${t.returnable ? 'green' : 'gray'}`}>{t.returnable ? 'Yes' : 'No'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(t)}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id, t.name)}><Trash2 size={13}/>Delete</button>
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
              <h3>{editId ? 'Edit Tool' : 'Add Tool'}</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label className="form-label">Tool / Equipment Name *</label>
                    <input className="form-control" required placeholder="e.g. Concrete Mixer, Bar Bending Machine" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type / Category</label>
                    <input className="form-control" placeholder="e.g. Machinery, Hand Tool, Safety" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ownership</label>
                    <select className="form-control" value={form.ownership} onChange={e => setForm(f => ({ ...f, ownership: e.target.value as any }))}>
                      <option value="Company">Company Owned</option>
                      <option value="Rental">Rental</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Location</label>
                    <select className="form-control" value={form.currentSiteId} onChange={e => setForm(f => ({ ...f, currentSiteId: e.target.value }))}>
                      <option value="office">Office Store</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select className="form-control" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as any }))}>
                      <option>Working</option>
                      <option>Under Repair</option>
                      <option>Damaged</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Returnable?</label>
                    <select className="form-control" value={form.returnable ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, returnable: e.target.value === 'yes' }))}>
                      <option value="yes">Yes</option>
                      <option value="no">No (Consumable)</option>
                    </select>
                  </div>
                  {form.ownership === 'Rental' && (
                    <div className="form-group span-2">
                      <label className="form-label">Rental Terms</label>
                      <input className="form-control" placeholder="e.g. ₹500/day, monthly hire" value={form.rentalTerms} onChange={e => setForm(f => ({ ...f, rentalTerms: e.target.value }))} />
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
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Tool'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
