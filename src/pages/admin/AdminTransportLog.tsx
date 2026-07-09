import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Truck, ArrowRight, Pencil, Trash2 } from 'lucide-react';

// PRD 9.12: Transport log for material/labour movement between sites
// PRD 9.3: Every stock-in and transfer transaction captures the delivering vehicle
//          (registration number or named vehicle) — supporting transport-level
//          accountability for material that goes missing in transit

interface TransportLog {
  id: string; date: string;
  type: 'Material' | 'Labour';
  fromSiteId: string; fromSiteName: string;
  toSiteId: string; toSiteName: string;
  vehicleNo: string; driverName: string;
  materialName: string; quantity: number; unit: string;
  workerCount: number; contractorName: string;
  purpose: string; notes: string;
  departureTime: string; arrivalConfirmed: boolean;
  materialId?: string; contractorId?: string;
}
interface Site { id: string; name: string; }
interface Material { id: string; name: string; unit: string; }
interface Contractor { id: string; name: string; }
interface Vehicle { id: string; regNo: string; type: string; }

export const AdminTransportLog: React.FC = () => {
  const [logs, setLogs] = useState<TransportLog[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Material' | 'Labour'>('All');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Material' as 'Material' | 'Labour',
    fromSiteId: '', toSiteId: '',
    vehicleNo: '', driverName: '',
    materialId: '', quantity: '', unit: '',
    workerCount: '', contractorId: '',
    purpose: '', notes: '', departureTime: ''
  });

  const loadAll = async () => {
    setLoading(true);
    const [lSnap, sSnap, mSnap, cSnap, vSnap] = await Promise.all([
      getDocs(query(collection(db, 'transport_logs'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'materials')),
      getDocs(collection(db, 'contractors')),
      getDocs(collection(db, 'vehicles')),
    ]);
    setLogs(lSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransportLog)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    setMaterials(mSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name, unit: (d.data() as any).unit })));
    setContractors(cSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    setVehicles(vSnap.docs.map(d => ({ id: d.id, regNo: (d.data() as any).regNo, type: (d.data() as any).type })));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fromSite = sites.find(s => s.id === form.fromSiteId);
    const toSite = sites.find(s => s.id === form.toSiteId);
    const mat = materials.find(m => m.id === form.materialId);
    const ctr = contractors.find(c => c.id === form.contractorId);
    const data = {
      date: form.date, type: form.type,
      fromSiteId: form.fromSiteId, fromSiteName: fromSite?.name || 'Office',
      toSiteId: form.toSiteId, toSiteName: toSite?.name || '',
      vehicleNo: form.vehicleNo, driverName: form.driverName,
      materialId: form.materialId || null, materialName: mat?.name || '',
      quantity: parseFloat(form.quantity) || 0, unit: mat?.unit || form.unit,
      workerCount: parseInt(form.workerCount) || 0,
      contractorId: form.contractorId || null, contractorName: ctr?.name || '',
      purpose: form.purpose, notes: form.notes,
      departureTime: form.departureTime,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'transport_logs', editId), data);
      } else {
        await addDoc(collection(db, 'transport_logs'), { ...data, arrivalConfirmed: false, createdAt: new Date().toISOString() });
      }
      setShowModal(false);
      setForm({ date: new Date().toISOString().split('T')[0], type: 'Material', fromSiteId:'', toSiteId:'', vehicleNo:'', driverName:'', materialId:'', quantity:'', unit:'', workerCount:'', contractorId:'', purpose:'', notes:'', departureTime:'' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this transport record?`)) {
      await deleteDoc(doc(db, 'transport_logs', id));
      loadAll();
    }
  };

  const confirmArrival = async (id: string) => {
    const { updateDoc, doc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'transport_logs', id), { arrivalConfirmed: true, arrivalTime: new Date().toISOString() });
    loadAll();
  };

  const filtered = logs.filter(l => filterType === 'All' || l.type === filterType);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Transport Log</h2>
          <p>Track material and labour movement between sites with vehicle accountability</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ date: new Date().toISOString().split('T')[0], type: 'Material', fromSiteId:'', toSiteId:'', vehicleNo:'', driverName:'', materialId:'', quantity:'', unit:'', workerCount:'', contractorId:'', purpose:'', notes:'', departureTime:'' }); setEditId(null); setShowModal(true); }}>
          <Plus size={16} /> Log Movement
        </button>
      </div>

      <div className="tabs">
        {(['All', 'Material', 'Labour'] as const).map(t => (
          <button key={t} className={`tab-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>{t} Movement</button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🚛</div>
            <h4>No transport records</h4>
            <p>Log material and labour movements between sites to track vehicle accountability.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Load</th>
                  <th>Arrival</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div>{l.date}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.departureTime}</div>
                    </td>
                    <td><span className={`badge ${l.type === 'Material' ? 'blue' : 'purple'}`}>{l.type}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>{l.fromSiteName || 'Office'}</span>
                        <ArrowRight size={14} color="var(--text-muted)" />
                        <span style={{ fontWeight: 600 }}>{l.toSiteName}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Truck size={14} color="var(--primary-light)" />
                        {l.vehicleNo}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.driverName || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {l.type === 'Material' ? (
                        <span>{l.materialName} — {l.quantity} {l.unit}</span>
                      ) : (
                        <span>{l.workerCount} workers ({l.contractorName})</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${l.arrivalConfirmed ? 'green' : 'orange'}`}>
                        {l.arrivalConfirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {!l.arrivalConfirmed && (
                          <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem', width: '100%' }} onClick={() => confirmArrival(l.id)}>
                            Confirm Arrival
                          </button>
                        )}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-secondary" style={{ padding: '5px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => {
                            setForm({
                              date: l.date, type: l.type, fromSiteId: l.fromSiteId, toSiteId: l.toSiteId,
                              vehicleNo: l.vehicleNo, driverName: l.driverName || '', materialId: l.materialId || '',
                              quantity: String(l.quantity), unit: l.unit || '', workerCount: String(l.workerCount),
                              contractorId: l.contractorId || '', purpose: l.purpose || '', notes: l.notes || '',
                              departureTime: l.departureTime || ''
                            });
                            setEditId(l.id); setShowModal(true);
                          }}><Pencil size={12}/> Edit</button>
                          <button className="btn-danger" style={{ padding: '5px 8px', fontSize: '0.75rem' }} onClick={() => handleDelete(l.id)}><Trash2 size={12}/></button>
                        </div>
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
          <div className="modal-card" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Log'} Transport Movement</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Movement Type *</label>
                    <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                      <option value="Material">Material</option>
                      <option value="Labour">Labour</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">From Site / Location</label>
                    <select className="form-control" value={form.fromSiteId} onChange={e => setForm(f => ({ ...f, fromSiteId: e.target.value }))}>
                      <option value="">Office / Vendor</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Site *</label>
                    <select className="form-control" required value={form.toSiteId} onChange={e => setForm(f => ({ ...f, toSiteId: e.target.value }))}>
                      <option value="">Select destination</option>
                      {sites.filter(s => s.id !== form.fromSiteId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle No. *</label>
                    <input className="form-control" required placeholder="e.g. WB 26 T 1234 or Raju Tempo" value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))}
                      list="vehicle-list" />
                    <datalist id="vehicle-list">
                      {vehicles.map(v => <option key={v.id} value={v.regNo}>{v.regNo} ({v.type})</option>)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Name</label>
                    <input className="form-control" placeholder="Driver's name" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departure Time</label>
                    <input type="time" className="form-control" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} />
                  </div>

                  {form.type === 'Material' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Material *</label>
                        <select className="form-control" required={form.type === 'Material'} value={form.materialId} onChange={e => setForm(f => ({ ...f, materialId: e.target.value }))}>
                          <option value="">Select material</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input type="number" step="0.01" className="form-control" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {form.type === 'Labour' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Contractor</label>
                        <select className="form-control" value={form.contractorId} onChange={e => setForm(f => ({ ...f, contractorId: e.target.value }))}>
                          <option value="">Select contractor</option>
                          {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Worker Count</label>
                        <input type="number" className="form-control" value={form.workerCount} onChange={e => setForm(f => ({ ...f, workerCount: e.target.value }))} />
                      </div>
                    </>
                  )}

                  <div className="form-group span-2">
                    <label className="form-label">Purpose / Notes</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Movement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
