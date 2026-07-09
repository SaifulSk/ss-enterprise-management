import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Pencil, AlertCircle, Trash2 } from 'lucide-react';

interface Vendor {
  id: string; name: string; contact: string; address: string;
  hasFormalInvoice: boolean; notes: string;
}
const emptyForm = { name: '', contact: '', address: '', hasFormalInvoice: true, notes: '' };

export const AdminVendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'vendors'));
    setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (v: Vendor) => {
    setForm({ name: v.name, contact: v.contact || '', address: v.address || '', hasFormalInvoice: v.hasFormalInvoice, notes: v.notes || '' });
    setEditId(v.id); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(db, 'vendors', editId), { ...form });
      } else {
        await addDoc(collection(db, 'vendors'), { ...form, createdAt: new Date().toISOString() });
      }
      setShowModal(false); fetch();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete vendor: ${name}?`)) {
      await deleteDoc(doc(db, 'vendors', id));
      fetch();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Vendors & Suppliers</h2><p>Track all material suppliers and their invoice status</p></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>Add Vendor</button>
      </div>

      <div className="info-box orange" style={{ marginBottom: 20 }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>Vendors without a formal invoice are tracked with an informal running balance until a proper bill is available. Formal transactions are handled in Tally.</span>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : vendors.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏪</div>
            <h4>No vendors yet</h4>
            <p>Add suppliers like sand vendors, cement dealers, iron traders etc.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ borderRadius: 'var(--radius)', border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Vendor Name</th><th>Contact</th><th>Address</th><th>Invoice Type</th><th>Notes</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td>{v.contact || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 180 }}>{v.address || '—'}</td>
                    <td>
                      <span className={`badge ${v.hasFormalInvoice ? 'green' : 'orange'}`}>
                        {v.hasFormalInvoice ? 'Formal Invoice' : 'Informal (Khata)'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{v.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(v)}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDelete(v.id, v.name)}><Trash2 size={13}/>Delete</button>
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
              <h3>{editId ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label className="form-label">Vendor / Supplier Name *</label>
                    <input className="form-control" required placeholder="e.g. Raju Sand Supplier, M/s Iron Traders" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input className="form-control" placeholder="Phone number" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Type</label>
                    <select className="form-control" value={form.hasFormalInvoice ? 'formal' : 'informal'} onChange={e => setForm(f => ({ ...f, hasFormalInvoice: e.target.value === 'formal' }))}>
                      <option value="formal">Formal Invoice</option>
                      <option value="informal">Informal (Khata / Running Balance)</option>
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Address</label>
                    <input className="form-control" placeholder="Vendor address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} placeholder="e.g. Local syndicate vendor, supplies sand only" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Vendor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
