import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, where, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Wrench } from 'lucide-react';

interface Tool { id: string; name: string; type: string; condition: string; currentSiteId: string; currentSiteName: string; }

export const SupervisorTools: React.FC = () => {
  const { currentUser } = useAuth();
  const siteId = currentUser?.assignedSiteId || '';
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'tools'));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tool));
    setTools(all.filter(t => t.currentSiteId === siteId));
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const returnToOffice = async (toolId: string) => {
    const cond = prompt('Enter current condition when returning (Working / Damaged / Under Repair):');
    if (!cond) return;
    await updateDoc(doc(db, 'tools', toolId), {
      currentSiteId: 'office', currentSiteName: 'Office Store',
      condition: cond, updatedAt: new Date().toISOString()
    });
    loadAll();
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Tools at My Site</h2><p>View and return tools assigned to your site</p></div>
      </div>
      <div className="glass-card" style={{ padding:0 }}>
        {loading ? <div className="empty-state"><p>Loading...</p></div> :
        tools.length===0 ? <div className="empty-state"><div className="icon">🔧</div><h4>No tools at this site</h4><p>All tools are at the office or other sites.</p></div> :
        <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius)' }}>
          <table className="data-table">
            <thead><tr><th>Tool Name</th><th>Type</th><th>Condition</th><th>Action</th></tr></thead>
            <tbody>
              {tools.map(t=>(
                <tr key={t.id}>
                  <td style={{ fontWeight:600 }}><div style={{ display:'flex',alignItems:'center',gap:6 }}><Wrench size={14} color="var(--accent)"/>{t.name}</div></td>
                  <td>{t.type||'—'}</td>
                  <td><span className={`badge ${t.condition==='Working'?'green':t.condition==='Damaged'?'red':'orange'}`}>{t.condition}</span></td>
                  <td><button className="btn-secondary" style={{ padding:'6px 12px', fontSize:'0.8rem' }} onClick={()=>returnToOffice(t.id)}>Return to Office</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
};
