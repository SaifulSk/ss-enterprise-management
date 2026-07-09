import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

interface Contractor { id: string; name: string; }

export const SupervisorAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const siteId = currentUser?.assignedSiteId || '';
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date:new Date().toISOString().split('T')[0], contractorId:'', mistryCount:'', labourCount:'', taskTag:'', inlineAdvance:'', notes:'' });

  const loadAll = async () => {
    setLoading(true);
    const [cSnap, aSnap] = await Promise.all([
      getDocs(collection(db, 'contractors')),
      getDocs(query(collection(db, 'attendance'), orderBy('date','desc'))),
    ]);
    setContractors(cSnap.docs.map(d=>({id:d.id,name:(d.data() as any).name})));
    setRecords(aSnap.docs.map(d=>({id:d.id,...d.data()})));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const ctr = contractors.find(c=>c.id===form.contractorId);
    const data = {
      ...form, contractorName: ctr?.name||'',
      siteAllocations: [{ siteId, count: parseFloat(form.mistryCount||'0')+parseFloat(form.labourCount||'0') }],
      mistryCount: parseFloat(form.mistryCount)||0, labourCount: parseFloat(form.labourCount)||0,
      inlineAdvance: parseFloat(form.inlineAdvance)||0,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'attendance', editId), data);
      } else {
        await addDoc(collection(db, 'attendance'), { ...data, recordedBy: currentUser?.email||'supervisor', createdAt: new Date().toISOString() });
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

  return (
    <div>
      <div className="page-header">
        <div><h2>Labour Attendance</h2><p>Mark daily attendance for your site</p></div>
        <button className="btn-primary" onClick={()=>{ setForm({date:new Date().toISOString().split('T')[0],contractorId:'',mistryCount:'',labourCount:'',taskTag:'',inlineAdvance:'',notes:''}); setEditId(null); setShowModal(true); }}><Plus size={16}/>Log Attendance</button>
      </div>

      <div className="glass-card" style={{ padding:0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        records.length===0 ? <div className="empty-state"><div className="icon">📋</div><h4>No attendance records</h4></div> :
        <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Contractor</th><th>Mistry</th><th>Labour</th><th>Total</th><th>Task</th><th>Advance ₹</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map(r=>(
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td style={{ fontWeight:600 }}>{r.contractorName}</td>
                  <td>{r.mistryCount}</td>
                  <td>{r.labourCount}</td>
                  <td style={{ fontWeight:700 }}>{(r.mistryCount||0)+(r.labourCount||0)}</td>
                  <td><span className="badge gray">{r.taskTag||'—'}</span></td>
                  <td>{r.inlineAdvance>0?`₹${r.inlineAdvance}`:'—'}</td>
                  <td>
                    {r.recordedBy === currentUser?.email && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setForm({
                            date: r.date, contractorId: r.contractorId, mistryCount: String(r.mistryCount||''),
                            labourCount: String(r.labourCount||''), taskTag: r.taskTag||'',
                            inlineAdvance: String(r.inlineAdvance||''), notes: r.notes||''
                          });
                          setEditId(r.id); setShowModal(true);
                        }}><Pencil size={13}/></button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(r.id)}>
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
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Log'} Attendance</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Contractor *</label>
                    <select className="form-control" required value={form.contractorId} onChange={e=>setForm(f=>({...f,contractorId:e.target.value}))}>
                      <option value="">Select contractor</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Mistry Count</label><input type="number" step="0.5" className="form-control" placeholder="0.5 for half-day" value={form.mistryCount} onChange={e=>setForm(f=>({...f,mistryCount:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Labour Count</label><input type="number" step="0.5" className="form-control" placeholder="0.5 for half-day" value={form.labourCount} onChange={e=>setForm(f=>({...f,labourCount:e.target.value}))} /></div>
                  <div className="form-group span-2"><label className="form-label">Task / Work Done</label><input className="form-control" placeholder="e.g. Brick laying, shuttering, electrical" value={form.taskTag} onChange={e=>setForm(f=>({...f,taskTag:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Advance Paid ₹</label><input type="number" className="form-control" value={form.inlineAdvance} onChange={e=>setForm(f=>({...f,inlineAdvance:e.target.value}))} /></div>
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
