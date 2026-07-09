import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Pencil, Users, Trash2 } from 'lucide-react';

interface Worker {
  id: string; name: string; role: 'Mistry' | 'Labour'; contractorId: string; contractorName: string;
  sarderName: string; dailyRate: number; phone: string; homeAddress: string;
}
interface Contractor {
  id: string; name: string; contact: string; specialty: string; notes: string;
}
type TabType = 'workers' | 'contractors';

export const AdminLabour: React.FC = () => {
  const [tab, setTab] = useState<TabType>('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Worker form
  const [wForm, setWForm] = useState({ name: '', role: 'Labour' as 'Labour' | 'Mistry', contractorId: '', sarderName: '', dailyRate: '', phone: '', homeAddress: '' });
  // Contractor form
  const [cForm, setCForm] = useState({ name: '', contact: '', specialty: '', notes: '' });

  const loadAll = async () => {
    setLoading(true);
    const [wSnap, cSnap] = await Promise.all([getDocs(collection(db, 'workers')), getDocs(collection(db, 'contractors'))]);
    setWorkers(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Worker)));
    setContractors(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contractor)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const ctr = contractors.find(c => c.id === wForm.contractorId);
    const data = { ...wForm, contractorName: ctr?.name || '', dailyRate: parseFloat(wForm.dailyRate as any) || 0, updatedAt: new Date().toISOString() };
    try {
      if (editId) { await updateDoc(doc(db, 'workers', editId), data); }
      else { await addDoc(collection(db, 'workers'), { ...data, createdAt: new Date().toISOString() }); }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleSaveContractor = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) { await updateDoc(doc(db, 'contractors', editId), { ...cForm, updatedAt: new Date().toISOString() }); }
      else { await addDoc(collection(db, 'contractors'), { ...cForm, createdAt: new Date().toISOString() }); }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDeleteContractor = async (id: string, name: string) => {
    if (window.confirm(`Delete contractor: ${name}? This does not delete their assigned workers.`)) {
      await deleteDoc(doc(db, 'contractors', id));
      loadAll();
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    if (window.confirm(`Delete worker: ${name}?`)) {
      await deleteDoc(doc(db, 'workers', id));
      loadAll();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Labour Master</h2><p>Manage workers, contractors and crew structure</p></div>
        <button className="btn-primary" onClick={() => { setEditId(null); setWForm({ name:'',role:'Labour',contractorId:'',sarderName:'',dailyRate:'',phone:'',homeAddress:'' }); setCForm({name:'',contact:'',specialty:'',notes:''}); setShowModal(true); }}>
          <Plus size={16}/>{tab === 'workers' ? 'Add Worker' : 'Add Contractor'}
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'contractors' ? 'active' : ''}`} onClick={() => setTab('contractors')}>Contractors ({contractors.length})</button>
        <button className={`tab-btn ${tab === 'workers' ? 'active' : ''}`} onClick={() => setTab('workers')}>Workers ({workers.length})</button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :

        tab === 'contractors' ? (
          contractors.length === 0 ? (
            <div className="empty-state"><div className="icon">👷</div><h4>No contractors</h4><p>Add contractors first, then add workers under them.</p></div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
              <table className="data-table">
                <thead><tr><th>Contractor Name</th><th>Contact</th><th>Specialty</th><th>Workers</th><th>Actions</th></tr></thead>
                <tbody>
                  {contractors.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} color="var(--purple)"/>{c.name}</div></td>
                      <td>{c.contact || '—'}</td>
                      <td>{c.specialty || '—'}</td>
                      <td>{workers.filter(w => w.contractorId === c.id).length}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setCForm({ name: c.name, contact: c.contact||'', specialty: c.specialty||'', notes: c.notes||'' }); setEditId(c.id); setShowModal(true); }}>
                            <Pencil size={13}/>Edit
                          </button>
                          <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteContractor(c.id, c.name)}>
                            <Trash2 size={13}/>Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          workers.length === 0 ? (
            <div className="empty-state"><div className="icon">🦺</div><h4>No workers</h4><p>Add workers and assign them to contractors.</p></div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
              <table className="data-table">
                <thead><tr><th>Worker Name</th><th>Role/Trade</th><th>Contractor</th><th>Sarder (Crew Lead)</th><th>Daily Rate (₹)</th><th>Phone</th><th>Actions</th></tr></thead>
                <tbody>
                  {workers.map(w => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>{w.name}</td>
                      <td><span className={`badge ${w.role === 'Mistry' ? 'orange' : 'gray'}`}>{w.role}</span></td>
                      <td>{w.contractorName || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{w.sarderName || '—'}</td>
                      <td>₹{w.dailyRate || '—'}</td>
                      <td>{w.phone || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setWForm({ name: w.name, role: w.role, contractorId: w.contractorId, sarderName: w.sarderName||'', dailyRate: String(w.dailyRate||''), phone: w.phone||'', homeAddress: w.homeAddress||'' }); setEditId(w.id); setShowModal(true); }}>
                            <Pencil size={13}/>Edit
                          </button>
                          <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteWorker(w.id, w.name)}>
                            <Trash2 size={13}/>Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Add'} {tab === 'workers' ? 'Worker' : 'Contractor'}</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            {tab === 'contractors' ? (
              <form onSubmit={handleSaveContractor}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group span-2"><label className="form-label">Name *</label><input className="form-control" required value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Contact</label><input className="form-control" value={cForm.contact} onChange={e => setCForm(f => ({ ...f, contact: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Specialty</label><input className="form-control" placeholder="e.g. Masonry, Shuttering, Electrical" value={cForm.specialty} onChange={e => setCForm(f => ({ ...f, specialty: e.target.value }))} /></div>
                    <div className="form-group span-2"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={cForm.notes} onChange={e => setCForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Contractor'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveWorker}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group span-2"><label className="form-label">Worker Name *</label><input className="form-control" required value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Trade / Role *</label>
                      <select className="form-control" value={wForm.role} onChange={e => setWForm(f => ({ ...f, role: e.target.value as any }))}>
                        <option value="Labour">Labour (General)</option>
                        <option value="Mistry">Mistry (Skilled)</option>
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Contractor</label>
                      <select className="form-control" value={wForm.contractorId} onChange={e => setWForm(f => ({ ...f, contractorId: e.target.value }))}>
                        <option value="">No contractor</option>
                        {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Sarder (Crew Lead)</label><input className="form-control" placeholder="Name of crew lead" value={wForm.sarderName} onChange={e => setWForm(f => ({ ...f, sarderName: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Daily Rate ₹</label><input type="number" className="form-control" value={wForm.dailyRate} onChange={e => setWForm(f => ({ ...f, dailyRate: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={wForm.phone} onChange={e => setWForm(f => ({ ...f, phone: e.target.value }))} /></div>
                    <div className="form-group span-2"><label className="form-label">Home Address</label><input className="form-control" value={wForm.homeAddress} onChange={e => setWForm(f => ({ ...f, homeAddress: e.target.value }))} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Worker'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
