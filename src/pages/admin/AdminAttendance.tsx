import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

interface AttendanceRecord {
  id: string; date: string; contractorId: string; contractorName: string;
  mistryCount: number; labourCount: number; taskTag: string;
  siteAllocations: { siteId: string; siteName: string; count: number }[];
  inlineAdvance: number; advanceReason: string; notes: string;
}
interface Site { id: string; name: string; }
interface Contractor { id: string; name: string; }

export const AdminAttendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocations, setAllocations] = useState<{ siteId: string; count: string }[]>([{ siteId: '', count: '' }]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], contractorId: '',
    mistryCount: '', labourCount: '', taskTag: '', inlineAdvance: '', advanceReason: '', notes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    const [aSnap, sSnap, cSnap] = await Promise.all([
      getDocs(query(collection(db, 'attendance'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'contractors')),
    ]);
    setRecords(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Site)));
    setContractors(cSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Contractor)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const ctr = contractors.find(c => c.id === form.contractorId);
    const allocs = allocations.filter(a => a.siteId && a.count).map(a => {
      const site = sites.find(s => s.id === a.siteId);
      return { siteId: a.siteId, siteName: site?.name || '', count: parseFloat(a.count) };
    });
    const data = {
      ...form, contractorName: ctr?.name || '',
      mistryCount: parseFloat(form.mistryCount as any) || 0,
      labourCount: parseFloat(form.labourCount as any) || 0,
      inlineAdvance: parseFloat(form.inlineAdvance as any) || 0,
      siteAllocations: allocs, updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'attendance', editId), data);
      } else {
        await addDoc(collection(db, 'attendance'), { ...data, createdAt: new Date().toISOString() });
      }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this attendance record?`)) {
      await deleteDoc(doc(db, 'attendance', id));
      loadAll();
    }
  };

  const filtered = records.filter(r => !filterDate || r.date === filterDate);

  return (
    <div>
      <div className="page-header">
        <div><h2>Daily Attendance</h2><p>Record labour attendance with multi-site allocation</p></div>
        <button className="btn-primary" onClick={() => { setForm({ date: new Date().toISOString().split('T')[0], contractorId:'',mistryCount:'',labourCount:'',taskTag:'',inlineAdvance:'',advanceReason:'',notes:'' }); setAllocations([{siteId:'',count:''}]); setEditId(null); setShowModal(true); }}>
          <Plus size={16}/>Log Attendance
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input type="date" className="form-control" style={{ width: 220 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h4>No attendance for this date</h4>
            <p>Log daily attendance for each contractor's crew.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Contractor</th><th>Mistry</th><th>Labour</th><th>Total</th><th>Task</th><th>Site Allocations</th><th>Advance ₹</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ fontWeight: 600 }}>{r.contractorName}</td>
                    <td>{r.mistryCount}</td>
                    <td>{r.labourCount}</td>
                    <td style={{ fontWeight: 700 }}>{(r.mistryCount || 0) + (r.labourCount || 0)}</td>
                    <td><span className="badge gray">{r.taskTag || '—'}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {r.siteAllocations?.map(a => `${a.siteName}: ${a.count}`).join(', ') || '—'}
                    </td>
                    <td>{r.inlineAdvance > 0 ? `₹${r.inlineAdvance.toLocaleString()}` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setForm({
                            date: r.date, contractorId: r.contractorId, mistryCount: String(r.mistryCount||''), labourCount: String(r.labourCount||''), taskTag: r.taskTag||'', inlineAdvance: String(r.inlineAdvance||''), advanceReason: r.advanceReason||'', notes: r.notes||''
                          });
                          setAllocations(r.siteAllocations?.length ? r.siteAllocations.map(a => ({ siteId: a.siteId, count: String(a.count) })) : [{ siteId: '', count: '' }]);
                          setEditId(r.id); setShowModal(true);
                        }}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(r.id)}><Trash2 size={13}/>Delete</button>
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
          <div className="modal-card" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Log'} Attendance Entry</h3>
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
                    <label className="form-label">Contractor *</label>
                    <select className="form-control" required value={form.contractorId} onChange={e => setForm(f => ({ ...f, contractorId: e.target.value }))}>
                      <option value="">Select contractor</option>
                      {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mistry (Skilled) Count</label>
                    <input type="number" step="0.5" className="form-control" placeholder="0 or 0.5 for half-day" value={form.mistryCount} onChange={e => setForm(f => ({ ...f, mistryCount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Labour (General) Count</label>
                    <input type="number" step="0.5" className="form-control" placeholder="0 or 0.5 for half-day" value={form.labourCount} onChange={e => setForm(f => ({ ...f, labourCount: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Task Tag</label>
                    <input className="form-control" placeholder="e.g. Masonry, Electrical work, Shuttering removal" value={form.taskTag} onChange={e => setForm(f => ({ ...f, taskTag: e.target.value }))} />
                  </div>

                  <div className="form-group span-2">
                    <label className="form-label">Site Allocations (who worked where)</label>
                    {allocations.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select className="form-control" value={a.siteId} onChange={e => setAllocations(al => al.map((x, j) => j === i ? { ...x, siteId: e.target.value } : x))}>
                          <option value="">Select site</option>
                          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="number" step="0.5" className="form-control" style={{ width: 100, flexShrink: 0 }} placeholder="Count" value={a.count} onChange={e => setAllocations(al => al.map((x, j) => j === i ? { ...x, count: e.target.value } : x))} />
                        {allocations.length > 1 && <button type="button" className="btn-danger" onClick={() => setAllocations(al => al.filter((_, j) => j !== i))}>✕</button>}
                      </div>
                    ))}
                    <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => setAllocations(al => [...al, { siteId: '', count: '' }])}>+ Add Site</button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Inline Advance ₹</label>
                    <input type="number" className="form-control" placeholder="Advance paid today" value={form.inlineAdvance} onChange={e => setForm(f => ({ ...f, inlineAdvance: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Advance Reason</label>
                    <input className="form-control" placeholder="e.g. Festival advance" value={form.advanceReason} onChange={e => setForm(f => ({ ...f, advanceReason: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
