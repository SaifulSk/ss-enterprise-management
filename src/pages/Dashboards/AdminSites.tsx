import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Plus, Loader2 } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  address: string;
  status: 'Active' | 'Completed' | 'On Hold';
  type: 'Own' | 'Managed';
}

export const AdminSites: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', address: '', type: 'Own' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sites'));
      const fetchedSites: Site[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSites.push({ id: doc.id, ...doc.data() } as Site);
      });
      setSites(fetchedSites);
    } catch (error) {
      console.error("Error fetching sites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'sites'), {
        ...newSite,
        status: 'Active',
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewSite({ name: '', address: '', type: 'Own' });
      fetchSites();
    } catch (error) {
      console.error("Error adding site:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Sites Management</h2>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowModal(true)}>
          <Plus size={20} /> Add Site
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading sites...</div>
        ) : sites.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No sites found. Click "Add Site" to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Site Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Address</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(site => (
                <tr key={site.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color="var(--primary)" />
                      <span style={{ fontWeight: 500 }}>{site.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{site.address}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: site.type === 'Own' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)', color: site.type === 'Own' ? 'var(--secondary)' : 'var(--primary)' }}>
                      {site.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>{site.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--surface-solid)' }}>
            <h3 style={{ marginBottom: '20px' }}>Add New Site</h3>
            <form onSubmit={handleAddSite}>
              <div className="form-group">
                <label className="form-label">Site Name</label>
                <input type="text" className="form-control" required value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" required value={newSite.address} onChange={e => setNewSite({...newSite, address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-control" value={newSite.type} onChange={e => setNewSite({...newSite, type: e.target.value as any})}>
                  <option value="Own">Own Property</option>
                  <option value="Managed">Managed for Others</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="btn-primary" style={{ background: '#E5E7EB', color: '#374151' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
