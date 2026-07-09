import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, ShieldCheck, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

const COMPLIANCE_TYPES = ['GST Valuation Renewal', 'Udyog/MSME Registration', 'Vehicle Tax', 'Pollution Certificate', 'Labour License', 'Shop Act', 'Other'];

interface ComplianceItem {
  id: string; type: string; entityName: string; dueDate: string; status: 'Upcoming' | 'Overdue' | 'Done'; notes: string;
}
const emptyForm = { type: 'GST Valuation Renewal', entityName: '', dueDate: '', status: 'Upcoming' as const, notes: '' };

export const AdminCompliance: React.FC = () => {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'compliance_items'));
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ComplianceItem)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) { await updateDoc(doc(db, 'compliance_items', editId), { ...form }); }
      else { await addDoc(collection(db, 'compliance_items'), { ...form, createdAt: new Date().toISOString() }); }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteDoc(doc(db, 'compliance_items', id));
      loadAll();
    }
  };

  const isOverdue = (d: string) => d && new Date(d) < new Date();
  const isDueSoon = (d: string) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - new Date().getTime();
    return diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const sorted = [...items].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  const alerts = sorted.filter(i => isOverdue(i.dueDate) || isDueSoon(i.dueDate));

  return (
    <div>
      <div className="page-header">
        <div><h2>Compliance Calendar</h2><p>Track renewal dates for all regulatory compliance items</p></div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}><Plus size={16}/>Add Item</button>
      </div>

      {alerts.length > 0 && (
        <div className="info-box red" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }}/>
          <div>
            <strong>{alerts.length} compliance item(s) are overdue or due within 30 days:</strong>{' '}
            {alerts.map(a => a.entityName || a.type).join(', ')}
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        items.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📅</div>
            <h4>No compliance items</h4>
            <p>Add renewal deadlines for GST, Udyog, vehicle tax, pollution certificates etc.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Entity / Description</th><th>Due Date</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
              <tbody>
                {sorted.map(item => (
                  <tr key={item.id}>
                    <td><span className="badge blue">{item.type}</span></td>
                    <td style={{ fontWeight: 500 }}>{item.entityName}</td>
                    <td style={{ color: isOverdue(item.dueDate) ? 'var(--danger)' : isDueSoon(item.dueDate) ? 'var(--accent)' : 'inherit', fontWeight: 600 }}>
                      {item.dueDate}
                      {isOverdue(item.dueDate) && <span className="badge red" style={{ marginLeft: 6 }}>Overdue</span>}
                      {!isOverdue(item.dueDate) && isDueSoon(item.dueDate) && <span className="badge orange" style={{ marginLeft: 6 }}>Due Soon</span>}
                    </td>
                    <td><span className={`badge ${item.status === 'Done' ? 'green' : item.status === 'Overdue' ? 'red' : 'blue'}`}>{item.status}</span></td>
                    <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{item.notes||'—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:'0.78rem' }} onClick={() => { setForm({ type:item.type,entityName:item.entityName,dueDate:item.dueDate,status:item.status,notes:item.notes||'' }); setEditId(item.id); setShowModal(true); }}><Pencil size={13}/>Edit</button>
                        {item.status !== 'Done' && <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:'0.78rem', color:'var(--secondary)' }} onClick={() => { updateDoc(doc(db,'compliance_items',item.id),{status:'Done'}); loadAll(); }}>Mark Done</button>}
                        <button className="btn-danger" style={{ padding:'5px 10px', fontSize:'0.78rem' }} onClick={() => handleDelete(item.id, item.entityName)}><Trash2 size={13}/></button>
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
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Add'} Compliance Item</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={() => setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Compliance Type *</label>
                  <select className="form-control" required value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                    {COMPLIANCE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Entity / Description *</label><input className="form-control" required placeholder="e.g. Company GST, Vehicle WB26T1234" value={form.entityName} onChange={e => setForm(f=>({...f,entityName:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Due / Expiry Date *</label><input type="date" className="form-control" required value={form.dueDate} onChange={e => setForm(f=>({...f,dueDate:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value as any}))}>
                    <option value="Upcoming">Upcoming</option><option value="Done">Done</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
