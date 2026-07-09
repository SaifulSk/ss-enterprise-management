import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Wallet, Pencil, Trash2 } from 'lucide-react';

interface Worker { id: string; name: string; role: string; }
interface AdvanceEntry { id: string; date: string; workerId: string; workerName: string; amount: number; reason: string; contractorId?: string; }

export const ContractorAdvances: React.FC = () => {
  const { currentUser } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [advances, setAdvances] = useState<AdvanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date:new Date().toISOString().split('T')[0], workerId:'', amount:'', reason:'' });

  const loadAll = async () => {
    setLoading(true);
    const [wSnap, aSnap] = await Promise.all([
      getDocs(collection(db, 'workers')),
      getDocs(query(collection(db, 'contractor_advances'), orderBy('date','desc'))),
    ]);
    setWorkers(wSnap.docs.map(d=>({id:d.id,name:(d.data() as any).name,role:(d.data() as any).role})));
    setAdvances(aSnap.docs.map(d=>({id:d.id,...d.data()} as AdvanceEntry)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const worker = workers.find(w=>w.id===form.workerId);
    const data = {
      ...form, workerName: worker?.name||'', amount: parseFloat(form.amount)||0,
      contractorId: currentUser?.uid, contractorName: currentUser?.displayName||currentUser?.email,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'contractor_advances', editId), data);
      } else {
        await addDoc(collection(db, 'contractor_advances'), { ...data, createdAt: new Date().toISOString() });
      }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this advance record?`)) {
      await deleteDoc(doc(db, 'contractor_advances', id));
      loadAll();
    }
  };

  const totalAdvances = advances.reduce((s,a)=>s+a.amount,0);

  return (
    <div>
      <div className="page-header">
        <div><h2>Advances</h2><p>Track advance payments given to your crew</p></div>
        <button className="btn-primary" onClick={()=>{ setForm({date:new Date().toISOString().split('T')[0],workerId:'',amount:'',reason:''}); setEditId(null); setShowModal(true); }}><Plus size={16}/>Record Advance</button>
      </div>

      <div className="glass-card stat-card" style={{ marginBottom:24, maxWidth:300 }}>
        <div className="stat-icon orange"><Wallet size={22}/></div>
        <div className="stat-content"><h3>Total Advances Paid</h3><div className="value">₹{totalAdvances.toLocaleString()}</div></div>
      </div>

      <div className="glass-card" style={{ padding:0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        advances.length===0 ? <div className="empty-state"><div className="icon">💸</div><h4>No advances recorded</h4></div> :
        <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Worker</th><th>Amount ₹</th><th>Reason</th><th>Actions</th></tr></thead>
            <tbody>
              {advances.map(a=>(
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td style={{ fontWeight:600 }}>{a.workerName}</td>
                  <td style={{ fontWeight:700, color:'var(--danger)' }}>₹{a.amount.toLocaleString()}</td>
                  <td style={{ color:'var(--text-muted)' }}>{a.reason||'—'}</td>
                  <td>
                    {a.contractorId === currentUser?.uid && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setForm({ date: a.date, workerId: a.workerId, amount: String(a.amount), reason: a.reason||'' });
                          setEditId(a.id); setShowModal(true);
                        }}><Pencil size={13}/></button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(a.id)}>
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
          <div className="modal-card" style={{ maxWidth:440 }}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Record'} Advance</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Worker *</label>
                  <select className="form-control" required value={form.workerId} onChange={e=>setForm(f=>({...f,workerId:e.target.value}))}>
                    <option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Amount ₹ *</label><input type="number" className="form-control" required value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Reason</label><input className="form-control" placeholder="e.g. Festival advance, Emergency" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving...':'Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
