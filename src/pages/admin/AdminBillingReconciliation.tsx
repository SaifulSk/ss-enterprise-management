import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ReconciliationEntry {
  id: string; siteId: string; siteName: string; materialId: string; materialName: string;
  structuralElement: string; billedQty: number; issuedQty: number; unit: string;
  wastageTolerancePct: number; variance: number; variancePct: number;
  flagStatus: 'Normal' | 'Flagged' | 'Reviewed'; reviewNotes: string; date: string;
}
interface Site { id: string; name: string; }
interface Material { id: string; name: string; unit: string; }

const ELEMENTS = ['Wall', 'Footing/Foundation', 'Beam', 'Slab', 'Column', 'Plinth Beam', 'Shuttering', 'Other'];

export const AdminBillingReconciliation: React.FC = () => {
  const [entries, setEntries] = useState<ReconciliationEntry[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], siteId: '', materialId: '', structuralElement: 'Slab', billedQty: '', issuedQty: '', wastageTolerancePct: '5' });

  const loadAll = async () => {
    setLoading(true);
    const [rSnap, sSnap, mSnap] = await Promise.all([
      getDocs(query(collection(db, 'billing_reconciliation'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'materials')),
    ]);
    setEntries(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as ReconciliationEntry)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Site)));
    setMaterials(mSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name, unit: (d.data() as any).unit } as Material)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const site = sites.find(s => s.id === form.siteId);
    const mat = materials.find(m => m.id === form.materialId);
    const billed = parseFloat(form.billedQty) || 0;
    const issued = parseFloat(form.issuedQty) || 0;
    const tolerance = parseFloat(form.wastageTolerancePct) || 5;
    const variance = issued - billed;
    const variancePct = billed > 0 ? (variance / billed) * 100 : 0;
    const flagStatus: ReconciliationEntry['flagStatus'] = variancePct > tolerance ? 'Flagged' : 'Normal';
    try {
      await addDoc(collection(db, 'billing_reconciliation'), {
        ...form, siteName: site?.name || '', materialName: mat?.name || '', unit: mat?.unit || '',
        billedQty: billed, issuedQty: issued, wastageTolerancePct: tolerance,
        variance, variancePct: parseFloat(variancePct.toFixed(2)), flagStatus,
        reviewNotes: '', createdAt: new Date().toISOString()
      });
      setShowModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const markReviewed = async (id: string, notes: string) => {
    await updateDoc(doc(db, 'billing_reconciliation', id), { flagStatus: 'Reviewed', reviewNotes: notes });
    loadAll();
  };

  const flagged = entries.filter(e => e.flagStatus === 'Flagged').length;

  return (
    <div>
      <div className="page-header">
        <div><h2>Billing Reconciliation</h2><p>Compare issued qty vs client-billed qty — flag wastage/misuse</p></div>
        <button className="btn-primary" onClick={() => { setForm({ date: new Date().toISOString().split('T')[0], siteId:'',materialId:'',structuralElement:'Slab',billedQty:'',issuedQty:'',wastageTolerancePct:'5' }); setShowModal(true); }}>
          <Plus size={16}/>Add Entry
        </button>
      </div>

      {flagged > 0 && (
        <div className="info-box red" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span><strong>{flagged} entries flagged</strong> for possible misuse or excess wastage beyond tolerance. Review them below.</span>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        entries.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⚖️</div>
            <h4>No reconciliation entries</h4>
            <p>Enter billed vs issued quantities for each structural element to detect wastage.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Site</th><th>Material</th><th>Element</th><th>Billed</th><th>Issued</th><th>Variance</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td style={{ fontWeight: 500 }}>{e.siteName}</td>
                    <td>{e.materialName}</td>
                    <td><span className="badge gray">{e.structuralElement}</span></td>
                    <td>{e.billedQty} {e.unit}</td>
                    <td>{e.issuedQty} {e.unit}</td>
                    <td style={{ color: e.variance > 0 ? 'var(--danger)' : 'var(--secondary)', fontWeight: 700 }}>
                      {e.variance > 0 ? '+' : ''}{e.variance.toFixed(2)} ({e.variancePct}%)
                    </td>
                    <td>
                      <span className={`badge ${e.flagStatus === 'Flagged' ? 'red' : e.flagStatus === 'Reviewed' ? 'blue' : 'green'}`}>
                        {e.flagStatus === 'Flagged' && <AlertTriangle size={11} style={{ marginRight: 3 }} />}
                        {e.flagStatus === 'Reviewed' && <CheckCircle size={11} style={{ marginRight: 3 }} />}
                        {e.flagStatus}
                      </span>
                    </td>
                    <td>
                      {e.flagStatus === 'Flagged' && (
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => {
                          const n = prompt('Enter review notes:');
                          if (n !== null) markReviewed(e.id, n);
                        }}>Mark Reviewed</button>
                      )}
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
            <div className="modal-header"><h3>Add Reconciliation Entry</h3><button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Site *</label>
                    <select className="form-control" required value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}>
                      <option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Material *</label>
                    <select className="form-control" required value={form.materialId} onChange={e => setForm(f => ({ ...f, materialId: e.target.value }))}>
                      <option value="">Select material</option>{materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Structural Element *</label>
                    <select className="form-control" required value={form.structuralElement} onChange={e => setForm(f => ({ ...f, structuralElement: e.target.value }))}>
                      {ELEMENTS.map(el => <option key={el}>{el}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Billed / Abstract Qty *</label><input type="number" step="0.01" className="form-control" required placeholder="From engineering drawing / client bill" value={form.billedQty} onChange={e => setForm(f => ({ ...f, billedQty: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Actual Issued Qty *</label><input type="number" step="0.01" className="form-control" required placeholder="Qty issued from stock-out records" value={form.issuedQty} onChange={e => setForm(f => ({ ...f, issuedQty: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Wastage Tolerance %</label><input type="number" className="form-control" value={form.wastageTolerancePct} onChange={e => setForm(f => ({ ...f, wastageTolerancePct: e.target.value }))} /></div>
                  {form.billedQty && form.issuedQty && (
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                      <div className={`info-box ${parseFloat(form.issuedQty) > parseFloat(form.billedQty) * (1 + parseFloat(form.wastageTolerancePct)/100) ? 'red' : 'green'}`} style={{ margin: 0 }}>
                        Variance: {(parseFloat(form.issuedQty) - parseFloat(form.billedQty)).toFixed(2)} units
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
