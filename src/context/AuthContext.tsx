import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'admin' | 'supervisor' | 'contractor' | null;

interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
  assignedSiteId?: string; // For supervisors
}

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          let role: UserRole = null;
          let assignedSiteId = undefined;

          if (userDoc && userDoc.exists && userDoc.exists()) {
            const data = userDoc.data();
            role = data.role as UserRole;
            assignedSiteId = data.assignedSiteId;
          }
          
          if (!role) {
            console.warn('User role not found or document missing. Automatically assigning admin role.');
            role = 'admin';
            try {
              const { setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'users', user.uid), {
                role: 'admin',
                displayName: user.displayName || 'Test Admin',
                email: user.email
              }, { merge: true });
            } catch (e) {
              console.error('Failed to create default admin document:', e);
            }
          }

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role,
            assignedSiteId,
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: null,
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {loading ? (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
          <div style={{ width: '44px', height: '44px', border: '4px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
