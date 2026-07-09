import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, AlertCircle, Wallet, Pencil, Trash2 } from 'lucide-react';

const EXPENSE_CATS = ['Grocery/Food', 'Hardware', 'Labour Payment', 'Travel', 'Miscellaneous/Consumable', 'Vendor Lump-sum', 'Other'];

interface CapitalEntry { id: string; date: string; siteId: string; siteName: string; amount: number; notes: string; type: 'capital_in'; }
interface ExpenseEntry { id: string; date: string; siteId: string; siteName: string; amount: number; category: string; notes: string; type: 'expense'; }
type LedgerEntry = CapitalEntry | ExpenseEntry;
interface Site { id: string; name: string; }

export const AdminCapitalExpenses: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'capital' | 'expense'>('all');
  const [showModal, setShowModal] = useState<'capital' | 'expense' | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterSite, setFilterSite] = useState('');

  const [capForm, setCapForm] = useState({ date: new Date().toISOString().split('T')[0], siteId: '', amount: '', notes: '' });
  const [expForm, setExpForm] = useState({ date: new Date().toISOString().split('T')[0], siteId: '', amount: '', category: 'Grocery/Food', notes: '' });

  const loadAll = async () => {
    setLoading(true);
    const [capSnap, expSnap, sSnap] = await Promise.all([
      getDocs(query(collection(db, 'capital_transfers'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'site_expenses'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'sites')),
    ]);
    const caps: CapitalEntry[] = capSnap.docs.map(d => ({ id: d.id, type: 'capital_in', ...d.data() } as CapitalEntry));
    const exps: ExpenseEntry[] = expSnap.docs.map(d => ({ id: d.id, type: 'expense', ...d.data() } as ExpenseEntry));
    setEntries([...caps, ...exps].sort((a, b) => b.date.localeCompare(a.date)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Site)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleCapital = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const site = sites.find(s => s.id === capForm.siteId);
    const data = { ...capForm, siteName: site?.name || '', amount: parseFloat(capForm.amount) || 0, type: 'capital_in', updatedAt: new Date().toISOString() };
    try {
      if (editId) { await updateDoc(doc(db, 'capital_transfers', editId), data); }
      else { await addDoc(collection(db, 'capital_transfers'), { ...data, createdAt: new Date().toISOString() }); }
      setShowModal(null); loadAll();
    } finally { setSaving(false); }
  };

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const site = sites.find(s => s.id === expForm.siteId);
    const data = { ...expForm, siteName: site?.name || '', amount: parseFloat(expForm.amount) || 0, type: 'expense', updatedAt: new Date().toISOString() };
    try {
      if (editId) { await updateDoc(doc(db, 'site_expenses', editId), data); }
      else { await addDoc(collection(db, 'site_expenses'), { ...data, createdAt: new Date().toISOString() }); }
      setShowModal(null); loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, type: 'capital_in' | 'expense') => {
    if (window.confirm(`Are you sure you want to delete this entry?`)) {
      await deleteDoc(doc(db, type === 'capital_in' ? 'capital_transfers' : 'site_expenses', id));
      loadAll();
    }
  };

  const filtered = entries
    .filter(e => !filterSite || e.siteId === filterSite)
    .filter(e => tab === 'all' || e.type === (tab === 'capital' ? 'capital_in' : 'expense'));

  const totalCapital = entries.filter(e => (!filterSite || e.siteId === filterSite) && e.type === 'capital_in').reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => (!filterSite || e.siteId === filterSite) && e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div><h2>Capital &amp; Expenses</h2><p>Site capital transfers and daily expense ledger</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ background: 'var(--secondary)' }} onClick={() => { setEditId(null); setCapForm({ date: new Date().toISOString().split('T')[0], siteId: '', amount: '', notes: '' }); setShowModal('capital'); }}><Plus size={16}/>Issue Capital</button>
          <button className="btn-primary" onClick={() => { setEditId(null); setExpForm({ date: new Date().toISOString().split('T')[0], siteId: '', amount: '', category: 'Grocery/Food', notes: '' }); setShowModal('expense'); }}><Plus size={16}/>Log Expense</button>
        </div>
      </div>

      <div className="info-box blue" style={{ marginBottom: 16 }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span><strong>Double-count prevention:</strong> Capital transfers are always recorded separately from expenses. Capital issued to a site is "Capital In", not an expense.</span>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: 20 }}>
        <div className="glass-card stat-card">
          <div className="stat-icon green"><Wallet size={22}/></div>
          <div className="stat-content"><h3>Total Capital Issued</h3><div className="value">₹{totalCapital.toLocaleString()}</div></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon orange"><Wallet size={22}/></div>
          <div className="stat-content"><h3>Total Expenses</h3><div className="value">₹{totalExpense.toLocaleString()}</div></div>
        </div>
        <div className="glass-card stat-card">
          <div className={`stat-icon ${totalCapital - totalExpense >= 0 ? 'green' : 'red'}`}><Wallet size={22}/></div>
          <div className="stat-content"><h3>Net Balance</h3><div className="value">₹{(totalCapital - totalExpense).toLocaleString()}</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-control" style={{ width: 200 }} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
          <button className={`tab-btn ${tab === 'capital' ? 'active' : ''}`} onClick={() => setTab('capital')}>Capital In</button>
          <button className={`tab-btn ${tab === 'expense' ? 'active' : ''}`} onClick={() => setTab('expense')}>Expenses</button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">💰</div><h4>No entries</h4><p>Issue capital to sites or log expenses.</p></div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Site</th><th>Category</th><th>Amount ₹</th><th>Notes</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td><span className={`badge ${e.type === 'capital_in' ? 'green' : 'orange'}`}>{e.type === 'capital_in' ? 'Capital In' : 'Expense'}</span></td>
                    <td style={{ fontWeight: 500 }}>{e.siteName}</td>
                    <td>{(e as ExpenseEntry).category || '—'}</td>
                    <td style={{ fontWeight: 700 }}>₹{e.amount.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setEditId(e.id);
                          if (e.type === 'capital_in') {
                            setCapForm({ date: e.date, siteId: e.siteId, amount: String(e.amount), notes: e.notes || '' });
                            setShowModal('capital');
                          } else {
                            setExpForm({ date: e.date, siteId: e.siteId, amount: String(e.amount), category: (e as ExpenseEntry).category, notes: e.notes || '' });
                            setShowModal('expense');
                          }
                        }}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(e.id, e.type)}><Trash2 size={13}/>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Capital Modal */}
      {showModal === 'capital' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Issue'} Capital to Site</h3><button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(null)}><X size={16}/></button></div>
            <form onSubmit={handleCapital}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={capForm.date} onChange={e => setCapForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Site *</label>
                  <select className="form-control" required value={capForm.siteId} onChange={e => setCapForm(f => ({ ...f, siteId: e.target.value }))}>
                    <option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Amount ₹ *</label><input type="number" className="form-control" required placeholder="Amount transferred to site" value={capForm.amount} onChange={e => setCapForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={capForm.notes} onChange={e => setCapForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Issue Capital'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showModal === 'expense' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Log'} Site Expense</h3><button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(null)}><X size={16}/></button></div>
            <form onSubmit={handleExpense}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Site *</label>
                  <select className="form-control" required value={expForm.siteId} onChange={e => setExpForm(f => ({ ...f, siteId: e.target.value }))}>
                    <option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Category *</label>
                  <select className="form-control" required value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                    {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Amount ₹ *</label><input type="number" className="form-control" required value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} placeholder="Description of what was spent" value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
