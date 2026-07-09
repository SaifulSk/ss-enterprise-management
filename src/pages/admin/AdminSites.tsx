import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Plus, X, Pencil, Trash2 } from 'lucide-react';

interface Site {
  id: string; siteCode: string; name: string; address: string;
  status: 'Active' | 'Completed' | 'On Hold'; type: 'Own' | 'Managed';
}
interface SiteForm {
  siteCode: string; name: string; address: string;
  status: 'Active' | 'Completed' | 'On Hold'; type: 'Own' | 'Managed';
}
const emptyForm: SiteForm = { siteCode: '', name: '', address: '', status: 'Active', type: 'Own' };

export const AdminSites: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'sites'));
    setSites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Site)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (s: Site) => {
    setForm({
      siteCode: s.siteCode || '',
      name: s.name || '',
      address: s.address || '',
      status: s.status || 'Active',
      type: s.type || 'Own',
    });
    setEditId(s.id); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await updateDoc(doc(db, 'sites', editId), { ...form });
      else await addDoc(collection(db, 'sites'), { ...form, createdAt: new Date().toISOString() });
      setShowModal(false); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await deleteDoc(doc(db, 'sites', deleteId)); setDeleteId(null); load(); }
    finally { setDeleting(false); }
  };

  const statusBadge = (s: string) => s === 'Active' ? 'green' : s === 'Completed' ? 'blue' : 'orange';

  return (
    <div>
      <div className="page-header">
        <div><h2>Sites Master</h2><p>Manage all project sites</p></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} />Add Site</button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div>
        : sites.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏗️</div>
            <h4>No sites yet</h4>
            <p>Click "Add Site" to register your first project site.</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={16} />Add First Site</button>
          </div>
        ) : (
          <div className="table-wrapper" style={{ borderRadius: 'var(--radius)', border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Site Name</th><th>Address</th><th>Type</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id}>
                    <td><code style={{ background: '#F1F5F9', padding: '2px 7px', borderRadius: 4, fontSize: '0.8rem' }}>{s.siteCode}</code></td>
                    <td style={{ fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color="var(--primary-light)" />{s.name}</div></td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 220 }}>{s.address || '—'}</td>
                    <td><span className={`badge ${s.type === 'Own' ? 'blue' : 'purple'}`}>{s.type}</span></td>
                    <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(s)}><Pencil size={13} />Edit</button>
                        <button className="btn-danger" style={{ padding: '6px 12px' }} onClick={() => setDeleteId(s.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editId ? 'Edit Site' : 'Add New Site'}</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Site Code *</label>
                    <input className="form-control" required placeholder="e.g. SLPR-01" value={form.siteCode} onChange={e => setForm(f => ({ ...f, siteCode: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                      <option value="Own">Own Property</option>
                      <option value="Managed">Managed for Others</option>
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Site Name *</label>
                    <input className="form-control" required placeholder="e.g. Salapuria Ramkrishnapur" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Address</label>
                    <input className="form-control" placeholder="Full address of the site" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                      <option>Active</option><option>On Hold</option><option>Completed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Site' : 'Add Site'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h3>Delete Site</h3><button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setDeleteId(null)}><X size={16} /></button></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{sites.find(s => s.id === deleteId)?.name}</strong>? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-danger" style={{ padding: '10px 20px' }} onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete Site'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
