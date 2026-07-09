import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Clock, CheckCircle } from 'lucide-react';

export const ContractorDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Welcome, {currentUser?.displayName || 'Contractor'}</h2>
      
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon purple">
            <Users />
          </div>
          <div className="stat-content">
            <h3>Total Crew Members</h3>
            <div className="value">15</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon orange">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>Pending Attendance</h3>
            <div className="value">Today</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon green">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <h3>Last Payment</h3>
            <div className="value">₹45,000</div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '16px' }}>Crew Management</h3>
        <p style={{ color: 'var(--text-muted)' }}>Use the sidebar to log daily attendance and site allocations.</p>
      </div>
    </div>
  );
};
