import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { LogIn, AlertCircle, UserPlus } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const from = location.state?.from?.pathname || '/';

  // Automatically redirect when currentUser state is populated
  useEffect(() => {
    if (currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation is now handled by the useEffect watching currentUser
    } catch (err: any) {
      console.error(err);
      setError('Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTestAdmin = async () => {
    if (!email || !password) {
      setError('Please enter an email and password to create an account.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // Set as admin in Firestore
      await setDoc(doc(db, 'users', userCred.user.uid), {
        role: 'admin',
        displayName: 'Test Admin',
        email: email
      });
      // Navigation is now handled by the useEffect watching currentUser
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="SS Enterprise Logo" style={{ margin: '0 auto 16px auto', height: '80px', display: 'block' }} />
          <h1>Welcome Back</h1>
          <p>Login to SS Enterprise Management System</p>
        </div>
        
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="form-control" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Wait...' : (
                <>
                  <LogIn size={20} />
                  Sign In
                </>
              )}
            </button>
            <button type="button" onClick={handleRegisterTestAdmin} className="btn-primary" disabled={loading} style={{ flex: 1, background: 'var(--secondary)' }}>
              <UserPlus size={20} />
              Register (Test)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
