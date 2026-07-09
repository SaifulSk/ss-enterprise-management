import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, X, TrendingDown, TrendingUp, CreditCard, AlertCircle, Pencil, Trash2 } from 'lucide-react';

// Vendor Ledger: tracks per-vendor purchase entries with running balance
// PRD 9.11: "Vendor master; purchase entries recording vendor, material, quantity, rate, and amount"
// PRD 9.3: "Multiple vendors can contribute to a single stock-in requirement; each vendor's
//           delivered quantity, rate, and amount are tracked on a separate running ledger"

interface VendorLedgerEntry {
  id: string;
  date: string;
  vendorId: string;
  vendorName: string;
  siteId: string;
  siteName: string;
  materialId: string;
  materialName: string;
  type: 'purchase' | 'payment';  // purchase = goods received, payment = money paid to vendor
  quantity: number;
  unit: string;
  rate: number;
  amount: number;  // quantity * rate for purchases, payment amount for payments
  vehicleNo: string;
  invoiceRef: string;
  notes: string;
}

interface Vendor { id: string; name: string; hasFormalInvoice: boolean; }
interface Site { id: string; name: string; }
interface Material { id: string; name: string; unit: string; }

// Compute running balance for a vendor: sum of purchases - sum of payments
const computeBalance = (entries: VendorLedgerEntry[], vendorId: string) => {
  const vendorEntries = entries.filter(e => e.vendorId === vendorId);
  const totalPurchased = vendorEntries.filter(e => e.type === 'purchase').reduce((s, e) => s + e.amount, 0);
  const totalPaid = vendorEntries.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);
  return { totalPurchased, totalPaid, balance: totalPurchased - totalPaid };
};

export const AdminVendorLedger: React.FC = () => {
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [showModal, setShowModal] = useState<'purchase' | 'payment' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vendorId: '', siteId: '', materialId: '',
    quantity: '', rate: '', vehicleNo: '', invoiceRef: '', notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vendorId: '', siteId: '', amount: '', notes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    const [eSnap, vSnap, sSnap, mSnap] = await Promise.all([
      getDocs(query(collection(db, 'vendor_ledger'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'vendors')),
      getDocs(collection(db, 'sites')),
      getDocs(collection(db, 'materials')),
    ]);
    setEntries(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as VendorLedgerEntry)));
    setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
    setMaterials(mSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name, unit: (d.data() as any).unit })));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const vendor = vendors.find(v => v.id === purchaseForm.vendorId);
    const site = sites.find(s => s.id === purchaseForm.siteId);
    const mat = materials.find(m => m.id === purchaseForm.materialId);
    const qty = parseFloat(purchaseForm.quantity) || 0;
    const rate = parseFloat(purchaseForm.rate) || 0;
    const amount = qty * rate;
    const data = {
      date: purchaseForm.date, type: 'purchase' as const,
      vendorId: purchaseForm.vendorId, vendorName: vendor?.name || '',
      siteId: purchaseForm.siteId, siteName: site?.name || '',
      materialId: purchaseForm.materialId, materialName: mat?.name || '',
      quantity: qty, unit: mat?.unit || '', rate, amount,
      vehicleNo: purchaseForm.vehicleNo || null,
      invoiceRef: purchaseForm.invoiceRef || null,
      notes: purchaseForm.notes,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'vendor_ledger', editId), data);
      } else {
        await addDoc(collection(db, 'vendor_ledger'), { ...data, createdAt: new Date().toISOString() });
        // Create stock transaction ONLY on new purchase, updating it is too complex for this MVP
        await addDoc(collection(db, 'stock_transactions'), {
          date: purchaseForm.date, type: 'In',
          siteId: purchaseForm.siteId, siteName: site?.name || '',
          materialId: purchaseForm.materialId, materialName: mat?.name || '',
          quantity: qty, unit: mat?.unit || '',
          vendorId: purchaseForm.vendorId, vendorName: vendor?.name || '',
          vehicleNo: purchaseForm.vehicleNo || null,
          costAmount: amount, notes: `Auto-created from Vendor Ledger. ${purchaseForm.notes}`,
          recordedBy: 'admin', createdAt: new Date().toISOString()
        });
      }
      setShowModal(null);
      setPurchaseForm({ date: new Date().toISOString().split('T')[0], vendorId:'', siteId:'', materialId:'', quantity:'', rate:'', vehicleNo:'', invoiceRef:'', notes:'' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const vendor = vendors.find(v => v.id === paymentForm.vendorId);
    const site = sites.find(s => s.id === paymentForm.siteId);
    const data = {
      date: paymentForm.date, type: 'payment' as const,
      vendorId: paymentForm.vendorId, vendorName: vendor?.name || '',
      siteId: paymentForm.siteId, siteName: site?.name || '',
      materialId: null, materialName: null,
      quantity: 0, unit: '', rate: 0,
      amount: parseFloat(paymentForm.amount) || 0,
      notes: paymentForm.notes,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editId) {
        await updateDoc(doc(db, 'vendor_ledger', editId), data);
      } else {
        await addDoc(collection(db, 'vendor_ledger'), { ...data, createdAt: new Date().toISOString() });
      }
      setShowModal(null);
      setPaymentForm({ date: new Date().toISOString().split('T')[0], vendorId:'', siteId:'', amount:'', notes:'' });
      loadAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this ledger entry?`)) {
      await deleteDoc(doc(db, 'vendor_ledger', id));
      loadAll();
    }
  };

  const filteredEntries = selectedVendor
    ? entries.filter(e => e.vendorId === selectedVendor)
    : entries;

  const vendorBalances = vendors.map(v => ({
    ...v,
    ...computeBalance(entries, v.id)
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vendor Ledger</h2>
          <p>Track purchases per vendor with running payment balance</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ background: 'var(--secondary)' }} onClick={() => { setEditId(null); setPaymentForm({ date: new Date().toISOString().split('T')[0], vendorId:'', siteId:'', amount:'', notes:'' }); setShowModal('payment'); }}>
            <CreditCard size={16} /> Record Payment
          </button>
          <button className="btn-primary" onClick={() => { setEditId(null); setPurchaseForm({ date: new Date().toISOString().split('T')[0], vendorId:'', siteId:'', materialId:'', quantity:'', rate:'', vehicleNo:'', invoiceRef:'', notes:'' }); setShowModal('purchase'); }}>
            <Plus size={16} /> Record Purchase
          </button>
        </div>
      </div>

      {/* Vendor Balance Summary Cards */}
      {vendorBalances.filter(v => v.totalPurchased > 0).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
          {vendorBalances.filter(v => v.totalPurchased > 0).map(v => (
            <div
              key={v.id}
              className="glass-card"
              style={{ padding: '18px 20px', cursor: 'pointer', border: selectedVendor === v.id ? '2px solid var(--primary-light)' : undefined }}
              onClick={() => setSelectedVendor(v.id === selectedVendor ? '' : v.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v.name}</div>
                <span className={`badge ${v.hasFormalInvoice ? 'green' : 'orange'}`} style={{ fontSize: '0.7rem' }}>
                  {v.hasFormalInvoice ? 'Formal' : 'Khata'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>Total Purchased</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>₹{v.totalPurchased.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>Paid</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--secondary)' }}>₹{v.totalPaid.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>Balance Due</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: v.balance > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                    ₹{v.balance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select className="form-control" style={{ width: 240 }} value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {selectedVendor && (
          <button className="btn-secondary" style={{ padding: '8px 14px' }} onClick={() => setSelectedVendor('')}>
            Clear Filter
          </button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        filteredEntries.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📒</div>
            <h4>No ledger entries yet</h4>
            <p>Record vendor purchases (goods received) and payments to maintain running balances.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Vendor</th>
                  <th>Site</th>
                  <th>Material</th>
                  <th>Qty / Rate</th>
                  <th>Amount ₹</th>
                  <th>Vehicle</th>
                  <th>Invoice Ref</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td>
                      <span className={`badge ${e.type === 'purchase' ? 'blue' : 'green'}`}>
                        {e.type === 'purchase' ? <><TrendingUp size={11} style={{ marginRight: 3 }} />Purchase</> : <><TrendingDown size={11} style={{ marginRight: 3 }} />Payment</>}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.vendorName}</td>
                    <td>{e.siteName}</td>
                    <td>{e.materialName || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {e.type === 'purchase' ? `${e.quantity} × ₹${e.rate}` : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: e.type === 'purchase' ? 'var(--danger)' : 'var(--secondary)' }}>
                      ₹{e.amount.toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.vehicleNo || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.invoiceRef || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setEditId(e.id);
                          if (e.type === 'purchase') {
                            setPurchaseForm({ date: e.date, vendorId: e.vendorId, siteId: e.siteId, materialId: e.materialId, quantity: String(e.quantity), rate: String(e.rate), vehicleNo: e.vehicleNo || '', invoiceRef: e.invoiceRef || '', notes: e.notes || '' });
                            setShowModal('purchase');
                          } else {
                            setPaymentForm({ date: e.date, vendorId: e.vendorId, siteId: e.siteId, amount: String(e.amount), notes: e.notes || '' });
                            setShowModal('payment');
                          }
                        }}><Pencil size={13}/>Edit</button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(e.id)}><Trash2 size={13}/>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showModal === 'purchase' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Record'} Vendor Purchase</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePurchase}>
              <div className="modal-body">
                <div className="info-box blue" style={{ marginBottom: 16 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>This will automatically create a <strong>Stock In</strong> entry at the receiving site as well.</span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required value={purchaseForm.date} onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vendor *</label>
                    <select className="form-control" required value={purchaseForm.vendorId} onChange={e => setPurchaseForm(f => ({ ...f, vendorId: e.target.value }))}>
                      <option value="">Select vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Receiving Site *</label>
                    <select className="form-control" required value={purchaseForm.siteId} onChange={e => setPurchaseForm(f => ({ ...f, siteId: e.target.value }))}>
                      <option value="">Select site</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Material *</label>
                    <select className="form-control" required value={purchaseForm.materialId} onChange={e => setPurchaseForm(f => ({ ...f, materialId: e.target.value }))}>
                      <option value="">Select material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" step="0.01" className="form-control" required placeholder="e.g. 100" value={purchaseForm.quantity} onChange={e => setPurchaseForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate per Unit ₹ *</label>
                    <input type="number" step="0.01" className="form-control" required placeholder="e.g. 450" value={purchaseForm.rate} onChange={e => setPurchaseForm(f => ({ ...f, rate: e.target.value }))} />
                  </div>
                  {purchaseForm.quantity && purchaseForm.rate && (
                    <div className="form-group span-2">
                      <div className="info-box green" style={{ margin: 0 }}>
                        <strong>Total Amount: ₹{(parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.rate)).toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Vehicle / Transport No.</label>
                    <input className="form-control" placeholder="e.g. WB 26 T 1234" value={purchaseForm.vehicleNo} onChange={e => setPurchaseForm(f => ({ ...f, vehicleNo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice / Khata Ref.</label>
                    <input className="form-control" placeholder="Invoice no. or khata reference" value={purchaseForm.invoiceRef} onChange={e => setPurchaseForm(f => ({ ...f, invoiceRef: e.target.value }))} />
                  </div>
                  <div className="form-group span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={purchaseForm.notes} onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Purchase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal === 'payment' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Record'} Vendor Payment</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-control" required value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor *</label>
                  <select className="form-control" required value={paymentForm.vendorId} onChange={e => setPaymentForm(f => ({ ...f, vendorId: e.target.value }))}>
                    <option value="">Select vendor</option>
                    {vendors.map(v => {
                      const bal = computeBalance(entries, v.id);
                      return <option key={v.id} value={v.id}>{v.name} (Balance: ₹{bal.balance.toLocaleString()})</option>;
                    })}
                  </select>
                </div>
                {paymentForm.vendorId && (
                  <div className="info-box orange" style={{ marginBottom: 12 }}>
                    Current balance due: <strong>₹{computeBalance(entries, paymentForm.vendorId).balance.toLocaleString()}</strong>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Site (where goods were received)</label>
                  <select className="form-control" value={paymentForm.siteId} onChange={e => setPaymentForm(f => ({ ...f, siteId: e.target.value }))}>
                    <option value="">Select site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Amount ₹ *</label>
                  <input type="number" className="form-control" required value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} placeholder="e.g. Cash payment, partial payment, UPI" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
