import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Box, CreditCard, Users, MapPin } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Welcome, {currentUser?.displayName || 'Admin'}</h2>
      
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon blue">
            <MapPin />
          </div>
          <div className="stat-content">
            <h3>Active Sites</h3>
            <div className="value">8</div>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon green">
            <CreditCard />
          </div>
          <div className="stat-content">
            <h3>Total Capital Issued</h3>
            <div className="value">₹1,24,000</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon orange">
            <Box />
          </div>
          <div className="stat-content">
            <h3>Low Stock Alerts</h3>
            <div className="value">12</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon purple">
            <Users />
          </div>
          <div className="stat-content">
            <h3>Total Workers Today</h3>
            <div className="value">45</div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '16px' }}>Recent Alerts</h3>
        <p style={{ color: 'var(--text-muted)' }}>No critical alerts at this time.</p>
      </div>
    </div>
  );
};
