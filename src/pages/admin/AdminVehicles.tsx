import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, Car, AlertCircle, Pencil, Trash2 } from 'lucide-react';

interface Vehicle { id: string; regNo: string; type: string; make: string; taxExpiry: string; pollutionExpiry: string; serviceNextDue: string; currentOdometer: number; notes: string; }
interface FuelLog { id: string; vehicleId: string; date: string; liters: number; costPerLtr: number; odometer: number; notes: string; }

export const AdminVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vehicles' | 'fuel'>('vehicles');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [vForm, setVForm] = useState({ regNo:'', type:'Truck', make:'', taxExpiry:'', pollutionExpiry:'', serviceNextDue:'', currentOdometer:'', notes:'' });
  const [fForm, setFForm] = useState({ vehicleId:'', date: new Date().toISOString().split('T')[0], liters:'', costPerLtr:'', odometer:'', notes:'' });

  const loadAll = async () => {
    setLoading(true);
    const [vSnap, fSnap] = await Promise.all([getDocs(collection(db, 'vehicles')), getDocs(collection(db, 'fuel_logs'))]);
    setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    setFuelLogs(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as FuelLog)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const data = { ...vForm, currentOdometer: parseFloat(vForm.currentOdometer as any)||0 };
    try {
      if (editId) { await updateDoc(doc(db, 'vehicles', editId), data); }
      else { await addDoc(collection(db, 'vehicles'), { ...data, createdAt: new Date().toISOString() }); }
      setShowVehicleModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await addDoc(collection(db, 'fuel_logs'), {
        vehicleId: fForm.vehicleId, date: fForm.date, notes: fForm.notes,
        liters: parseFloat(fForm.liters)||0, costPerLtr: parseFloat(fForm.costPerLtr)||0, odometer: parseFloat(fForm.odometer)||0,
        totalCost: (parseFloat(fForm.liters)||0) * (parseFloat(fForm.costPerLtr)||0), createdAt: new Date().toISOString()
      });
      setShowFuelModal(false); loadAll();
    } finally { setSaving(false); }
  };

  const handleDeleteVehicle = async (id: string, regNo: string) => {
    if (window.confirm(`Delete vehicle ${regNo}?`)) {
      await deleteDoc(doc(db, 'vehicles', id));
      loadAll();
    }
  };

  const handleDeleteFuelLog = async (id: string) => {
    if (window.confirm(`Delete this fuel log?`)) {
      await deleteDoc(doc(db, 'fuel_logs', id));
      loadAll();
    }
  };

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (d.getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Fleet Management</h2><p>Vehicle master, fuel logs and servicing schedule</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          {tab === 'vehicles' ? (
            <button className="btn-primary" onClick={() => { setEditId(null); setVForm({ regNo:'',type:'Truck',make:'',taxExpiry:'',pollutionExpiry:'',serviceNextDue:'',currentOdometer:'',notes:'' }); setShowVehicleModal(true); }}><Plus size={16}/>Add Vehicle</button>
          ) : (
            <button className="btn-primary" onClick={() => { setFForm({ vehicleId:'',date:new Date().toISOString().split('T')[0],liters:'',costPerLtr:'',odometer:'',notes:'' }); setShowFuelModal(true); }}><Plus size={16}/>Log Fuel</button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}>Vehicles</button>
        <button className={`tab-btn ${tab === 'fuel' ? 'active' : ''}`} onClick={() => setTab('fuel')}>Fuel Log</button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        tab === 'vehicles' ? (
          vehicles.length === 0 ? (
            <div className="empty-state"><div className="icon">🚛</div><h4>No vehicles registered</h4></div>
          ) : (
            <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
              <table className="data-table">
                <thead><tr><th>Reg. No.</th><th>Type</th><th>Make</th><th>Tax Expiry</th><th>Pollution Expiry</th><th>Service Due</th><th>Odometer</th><th>Actions</th></tr></thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Car size={14} color="var(--primary-light)"/>{v.regNo}</div></td>
                      <td>{v.type}</td>
                      <td>{v.make || '—'}</td>
                      <td><span className={`badge ${isExpiringSoon(v.taxExpiry) ? 'red' : 'green'}`}>{v.taxExpiry || '—'}</span></td>
                      <td><span className={`badge ${isExpiringSoon(v.pollutionExpiry) ? 'red' : 'green'}`}>{v.pollutionExpiry || '—'}</span></td>
                      <td><span className={`badge ${isExpiringSoon(v.serviceNextDue) ? 'orange' : 'gray'}`}>{v.serviceNextDue || '—'}</span></td>
                      <td>{v.currentOdometer?.toLocaleString() || '—'} km</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => { setVForm({ regNo:v.regNo,type:v.type,make:v.make||'',taxExpiry:v.taxExpiry||'',pollutionExpiry:v.pollutionExpiry||'',serviceNextDue:v.serviceNextDue||'',currentOdometer:String(v.currentOdometer||''),notes:v.notes||'' }); setEditId(v.id); setShowVehicleModal(true); }}><Pencil size={13}/>Edit</button>
                          <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDeleteVehicle(v.id, v.regNo)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          fuelLogs.length === 0 ? (
            <div className="empty-state"><div className="icon">⛽</div><h4>No fuel logs</h4></div>
          ) : (
            <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Vehicle</th><th>Litres</th><th>Rate ₹/L</th><th>Total ₹</th><th>Odometer</th><th>Notes</th><th>Actions</th></tr></thead>
                <tbody>
                  {fuelLogs.sort((a,b)=>b.date.localeCompare(a.date)).map(l => {
                    const veh = vehicles.find(v => v.id === l.vehicleId);
                    return (
                      <tr key={l.id}>
                        <td>{l.date}</td>
                        <td style={{ fontWeight: 600 }}>{veh?.regNo || '—'}</td>
                        <td>{l.liters}L</td>
                        <td>₹{l.costPerLtr}</td>
                        <td style={{ fontWeight: 700 }}>₹{(l.liters * l.costPerLtr).toLocaleString()}</td>
                        <td>{l.odometer?.toLocaleString()} km</td>
                        <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{l.notes||'—'}</td>
                        <td>
                          <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDeleteFuelLog(l.id)}><Trash2 size={13}/>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showVehicleModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVehicleModal(false)}>
          <div className="modal-card">
            <div className="modal-header"><h3>{editId ? 'Edit' : 'Add'} Vehicle</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={() => setShowVehicleModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSaveVehicle}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Registration No. *</label><input className="form-control" required placeholder="WB 26 T 1234" value={vForm.regNo} onChange={e => setVForm(f=>({...f,regNo:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Type</label>
                    <select className="form-control" value={vForm.type} onChange={e => setVForm(f=>({...f,type:e.target.value}))}>
                      {['Truck','Lorry','Tempo','Car','Bike','Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Make / Model</label><input className="form-control" placeholder="e.g. Tata 407" value={vForm.make} onChange={e => setVForm(f=>({...f,make:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Current Odometer (km)</label><input type="number" className="form-control" value={vForm.currentOdometer} onChange={e => setVForm(f=>({...f,currentOdometer:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Tax Expiry Date</label><input type="date" className="form-control" value={vForm.taxExpiry} onChange={e => setVForm(f=>({...f,taxExpiry:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Pollution Cert. Expiry</label><input type="date" className="form-control" value={vForm.pollutionExpiry} onChange={e => setVForm(f=>({...f,pollutionExpiry:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Next Service Due Date</label><input type="date" className="form-control" value={vForm.serviceNextDue} onChange={e => setVForm(f=>({...f,serviceNextDue:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={vForm.notes} onChange={e => setVForm(f=>({...f,notes:e.target.value}))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowVehicleModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFuelModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFuelModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header"><h3>Log Fuel Fill</h3><button className="btn-secondary" style={{ padding:'6px' }} onClick={() => setShowFuelModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSaveFuel}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Date *</label><input type="date" className="form-control" required value={fForm.date} onChange={e => setFForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Vehicle *</label>
                  <select className="form-control" required value={fForm.vehicleId} onChange={e => setFForm(f=>({...f,vehicleId:e.target.value}))}>
                    <option value="">Select vehicle</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.regNo} ({v.type})</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Litres *</label><input type="number" step="0.01" className="form-control" required value={fForm.liters} onChange={e => setFForm(f=>({...f,liters:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Cost per Litre ₹ *</label><input type="number" step="0.01" className="form-control" required value={fForm.costPerLtr} onChange={e => setFForm(f=>({...f,costPerLtr:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Odometer Reading (km)</label><input type="number" className="form-control" value={fForm.odometer} onChange={e => setFForm(f=>({...f,odometer:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={fForm.notes} onChange={e => setFForm(f=>({...f,notes:e.target.value}))} /></div>
                {fForm.liters && fForm.costPerLtr && <div className="info-box green">Total: ₹{(parseFloat(fForm.liters)*parseFloat(fForm.costPerLtr)).toFixed(2)}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFuelModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Fuel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
