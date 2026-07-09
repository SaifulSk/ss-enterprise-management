import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Users, ClipboardCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ContractorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [totalAdvances, setTotalAdvances] = useState(0);
  const [workerCount, setWorkerCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [aSnap, wSnap] = await Promise.all([
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'workers')),
      ]);
      const myAtt = aSnap.docs.map(d => d.data() as any);
      const totalHeads = myAtt.reduce((s, r) => s + (r.mistryCount||0) + (r.labourCount||0), 0);
      const totalAdv = myAtt.reduce((s, r) => s + (r.inlineAdvance||0), 0);
      setTotalAttendance(totalHeads);
      setTotalAdvances(totalAdv);
      setWorkerCount(wSnap.size);
    };
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h2>Crew Dashboard</h2><p>Welcome, {currentUser?.displayName || currentUser?.email}</p></div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon blue"><Users size={22}/></div>
          <div className="stat-content"><h3>Total Workers</h3><div className="value">{workerCount}</div></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon green"><ClipboardCheck size={22}/></div>
          <div className="stat-content"><h3>Total Attendance (All)</h3><div className="value">{totalAttendance}</div><div className="sub">Person-days logged</div></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon orange"><Wallet size={22}/></div>
          <div className="stat-content"><h3>Total Advances Paid</h3><div className="value">₹{totalAdvances.toLocaleString()}</div></div>
        </div>
      </div>

      <div className="glass-card">
        <div className="section-header"><h3>Quick Actions</h3></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12, marginTop:16 }}>
          <Link to="/contractor/attendance" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, padding:'14px', borderRadius:'var(--radius-sm)', background:'#F8FAFC', border:'1.5px solid var(--border-solid)', color:'var(--text-main)', fontWeight:500 }}>
            <span style={{ fontSize:'1.5rem' }}>📋</span> Mark Attendance
          </Link>
          <Link to="/contractor/advances" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, padding:'14px', borderRadius:'var(--radius-sm)', background:'#F8FAFC', border:'1.5px solid var(--border-solid)', color:'var(--text-main)', fontWeight:500 }}>
            <span style={{ fontSize:'1.5rem' }}>💰</span> View Advances
          </Link>
        </div>
      </div>
    </div>
  );
};
