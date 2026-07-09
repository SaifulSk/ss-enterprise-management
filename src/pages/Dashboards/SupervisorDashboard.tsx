import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Box, CreditCard, Clock } from 'lucide-react';

export const SupervisorDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Welcome, {currentUser?.displayName || 'Supervisor'}</h2>
      
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon green">
            <CreditCard />
          </div>
          <div className="stat-content">
            <h3>Site Capital Balance</h3>
            <div className="value">₹12,500</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon blue">
            <Box />
          </div>
          <div className="stat-content">
            <h3>Recent Materials Received</h3>
            <div className="value">3 Deliveries</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon orange">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>Pending Reconciliations</h3>
            <div className="value">2</div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
        <p style={{ color: 'var(--text-muted)' }}>Use the sidebar to log stock or expenses.</p>
      </div>
    </div>
  );
};
