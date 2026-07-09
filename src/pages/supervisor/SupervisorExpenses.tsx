import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Wallet, Pencil, Trash2 } from 'lucide-react';

const CATS = ['Grocery/Food', 'Hardware', 'Labour Payment', 'Travel', 'Miscellaneous/Consumable', 'Other'];
interface Expense { id: string; date: string; category: string; amount: number; notes: string; recordedBy?: string; }

export const SupervisorExpenses: React.FC = () => {
  const { currentUser } = useAuth();
  const siteId = currentUser?.assignedSiteId || '';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [capital, setCapital] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category:'Grocery/Food', amount:'', notes:'' });

  const loadAll = async () => {
    setLoading(true);
    if (!siteId) { setLoading(false); return; }
    const [expSnap, capSnap] = await Promise.all([
      getDocs(query(collection(db, 'site_expenses'), where('siteId','==',siteId), orderBy('date','desc'))),
      getDocs(query(collection(db, 'capital_transfers'), where('siteId','==',siteId))),
    ]);
    setExpenses(expSnap.docs.map(d=>({id:d.id,...d.data()} as Expense)));
    const totalCap = capSnap.docs.reduce((s,d)=>s+((d.data() as any).amount||0), 0);
    const totalExp = expSnap.docs.reduce((s,d)=>s+((d.data() as any).amount||0), 0);
    setCapital(totalCap - totalExp);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const data = {
      ...form, siteId, siteName:'', amount: parseFloat(form.amount)||0,
      type:'expense', updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'site_expenses', editId), data);
      } else {
        await addDoc(collection(db, 'site_expenses'), { ...data, recordedBy: currentUser?.email||'supervisor', createdAt: new Date().toISOString() });
      }
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this expense?`)) {
      await deleteDoc(doc(db, 'site_expenses', id));
      loadAll();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Daily Expenses</h2><p>Log site expenses against your capital balance</p></div>
        <button className="btn-primary" onClick={()=>{ setForm({date:new Date().toISOString().split('T')[0],category:'Grocery/Food',amount:'',notes:''}); setEditId(null); setShowModal(true); }}><Plus size={16}/>Log Expense</button>
      </div>

      <div className="glass-card stat-card" style={{ marginBottom:24, maxWidth:300 }}>
        <div className={`stat-icon ${capital>=0?'green':'red'}`}><Wallet size={22}/></div>
        <div className="stat-content"><h3>Current Capital Balance</h3><div className="value">₹{capital.toLocaleString()}</div></div>
      </div>

      <div className="glass-card" style={{ padding:0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        expenses.length===0 ? <div className="empty-state"><div className="icon">💰</div><h4>No expenses logged yet</h4></div> :
        <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Amount ₹</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {expenses.map(e=>(
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td><span className="badge gray">{e.category}</span></td>
                  <td style={{ fontWeight:700 }}>₹{e.amount.toLocaleString()}</td>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{e.notes||'—'}</td>
                  <td>
                    {e.recordedBy === currentUser?.email && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setForm({ date: e.date, category: e.category, amount: String(e.amount), notes: e.notes||'' });
                          setEditId(e.id); setShowModal(true);
                        }}><Pencil size={13}/></button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(e.id)}>
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
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Log'} Expense</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Category *</label>
                  <select className="form-control" required value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Amount ₹ *</label><input type="number" className="form-control" required value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={3} placeholder="What was this expense for?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving...':'Log Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
