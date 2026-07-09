import React, { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { db, secondaryAuth } from '../../lib/firebase';
import { Plus, X, UserCog, AlertCircle, CheckCircle } from 'lucide-react';

// KEY FIX: We use `secondaryAuth` (a separate Firebase app instance) to create
// new users. This ensures Firebase does NOT auto-login the new user and does NOT
// displace the currently logged-in admin from the primary `auth` session.

interface AppUser { id: string; email: string; displayName: string; role: string; assignedSiteId?: string; createdAt: string; }
interface Site { id: string; name: string; }

const emptyForm = { email: '', password: '', displayName: '', role: 'supervisor', assignedSiteId: '' };

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [uSnap, sSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'sites')),
    ]);
    setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)));
    setSites(sSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name } as Site)));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      // Create the user using the SECONDARY auth instance — admin stays logged in
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);

      // Optionally set displayName on the new account
      await updateProfile(cred.user, { displayName: form.displayName });

      // Write the user's role & profile to Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: form.email,
        displayName: form.displayName,
        role: form.role,
        assignedSiteId: form.assignedSiteId || null,
        createdAt: new Date().toISOString(),
      });

      // Sign out from the secondary instance — keeps it clean for next creation
      await signOut(secondaryAuth);

      setShowModal(false);
      setForm(emptyForm);
      setSuccessMsg(`User "${form.displayName || form.email}" created successfully.`);
      loadAll();
    } catch (err: any) {
      // Provide friendly messages for common Firebase errors
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('This email is already registered.');
      else if (code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else if (code === 'auth/invalid-email') setError('Please enter a valid email address.');
      else setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const roleColors: Record<string, string> = { admin: 'blue', supervisor: 'green', contractor: 'purple' };

  return (
    <div>
      <div className="page-header">
        <div><h2>User Management</h2><p>Create logins for Supervisors and Contractors</p></div>
        <button className="btn-primary" onClick={() => { setShowModal(true); setError(''); setSuccessMsg(''); setForm(emptyForm); }}>
          <Plus size={16} />Create User
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="info-box green" style={{ marginBottom: 16 }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={14} /></button>
        </div>
      )}

      <div className="info-box blue" style={{ marginBottom: 16 }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>Creating a new user will <strong>not</strong> log you out. The new user's login credentials should be shared with them securely.</span>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div>
        : users.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👤</div>
            <h4>No users yet</h4>
            <p>Create supervisor or contractor accounts to get started.</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => { setShowModal(true); setError(''); }}><Plus size={16} />Create First User</button>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius)' }}>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned Site</th><th>Created</th></tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const site = sites.find(s => s.id === u.assignedSiteId);
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCog size={14} color="var(--primary-light)" />
                          {u.displayName || '—'}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td><span className={`badge ${roleColors[u.role] || 'gray'}`}>{u.role}</span></td>
                      <td>{site?.name || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && (
                  <div className="error-message" style={{ marginBottom: 16 }}>
                    <AlertCircle size={15} />{error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" required placeholder="e.g. Rahul Kumar" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" required placeholder="user@ssent.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-control" required minLength={6} placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-control" required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Company Admin</option>
                    <option value="supervisor">Site Supervisor</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
                {form.role === 'supervisor' && (
                  <div className="form-group">
                    <label className="form-label">Assigned Site</label>
                    <select className="form-control" value={form.assignedSiteId} onChange={e => setForm(f => ({ ...f, assignedSiteId: e.target.value }))}>
                      <option value="">No specific site</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
