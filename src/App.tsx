
// v3 - all PRD modules implemented
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Auth
import { Login } from './pages/Login';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminSites } from './pages/admin/AdminSites';
import { AdminMaterials } from './pages/admin/AdminMaterials';
import { AdminVendors } from './pages/admin/AdminVendors';
import { AdminStock } from './pages/admin/AdminStock';
import { AdminTools } from './pages/admin/AdminTools';
import { AdminLabour } from './pages/admin/AdminLabour';
import { AdminAttendance } from './pages/admin/AdminAttendance';
import { AdminCapitalExpenses } from './pages/admin/AdminCapitalExpenses';
import { AdminBillingReconciliation } from './pages/admin/AdminBillingReconciliation';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminVehicles } from './pages/admin/AdminVehicles';
import { AdminCompliance } from './pages/admin/AdminCompliance';
import { AdminOfficeStore } from './pages/admin/AdminOfficeStore';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminVendorLedger } from './pages/admin/AdminVendorLedger';
import { AdminLabourCamp } from './pages/admin/AdminLabourCamp';
import { AdminTransportLog } from './pages/admin/AdminTransportLog';
import { AdminStockBalance } from './pages/admin/AdminStockBalance';

// Supervisor Pages
import { SupervisorDashboard } from './pages/supervisor/SupervisorDashboard';
import { SupervisorStock } from './pages/supervisor/SupervisorStock';
import { SupervisorExpenses } from './pages/supervisor/SupervisorExpenses';
import { SupervisorAttendance } from './pages/supervisor/SupervisorAttendance';
import { SupervisorTools } from './pages/supervisor/SupervisorTools';
import { SupervisorVendorView } from './pages/supervisor/SupervisorVendorView';

// Contractor Pages
import { ContractorDashboard } from './pages/contractor/ContractorDashboard';
import { ContractorAttendance } from './pages/contractor/ContractorAttendance';
import { ContractorAdvances } from './pages/contractor/ContractorAdvances';

const RootRoute = () => {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
  if (currentUser.role === 'supervisor') return <Navigate to="/supervisor" replace />;
  if (currentUser.role === 'contractor') return <Navigate to="/contractor" replace />;
  return <Navigate to="/unauthorized" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<RootRoute />} />

            {/* ── Admin Routes ── */}
            <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="admin/sites" element={<ProtectedRoute allowedRoles={['admin']}><AdminSites /></ProtectedRoute>} />
            <Route path="admin/materials" element={<ProtectedRoute allowedRoles={['admin']}><AdminMaterials /></ProtectedRoute>} />
            <Route path="admin/vendors" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendors /></ProtectedRoute>} />
            <Route path="admin/stock" element={<ProtectedRoute allowedRoles={['admin']}><AdminStock /></ProtectedRoute>} />
            <Route path="admin/tools" element={<ProtectedRoute allowedRoles={['admin']}><AdminTools /></ProtectedRoute>} />
            <Route path="admin/labour" element={<ProtectedRoute allowedRoles={['admin']}><AdminLabour /></ProtectedRoute>} />
            <Route path="admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
            <Route path="admin/capital-expenses" element={<ProtectedRoute allowedRoles={['admin']}><AdminCapitalExpenses /></ProtectedRoute>} />
            <Route path="admin/reconciliation" element={<ProtectedRoute allowedRoles={['admin']}><AdminBillingReconciliation /></ProtectedRoute>} />
            <Route path="admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
            <Route path="admin/vehicles" element={<ProtectedRoute allowedRoles={['admin']}><AdminVehicles /></ProtectedRoute>} />
            <Route path="admin/compliance" element={<ProtectedRoute allowedRoles={['admin']}><AdminCompliance /></ProtectedRoute>} />
            <Route path="admin/office-store" element={<ProtectedRoute allowedRoles={['admin']}><AdminOfficeStore /></ProtectedRoute>} />
            <Route path="admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="admin/vendor-ledger" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorLedger /></ProtectedRoute>} />
            <Route path="admin/labour-camp" element={<ProtectedRoute allowedRoles={['admin']}><AdminLabourCamp /></ProtectedRoute>} />
            <Route path="admin/transport" element={<ProtectedRoute allowedRoles={['admin']}><AdminTransportLog /></ProtectedRoute>} />
            <Route path="admin/stock-balance" element={<ProtectedRoute allowedRoles={['admin']}><AdminStockBalance /></ProtectedRoute>} />

            {/* ── Supervisor Routes ── */}
            <Route path="supervisor" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
            <Route path="supervisor/stock" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorStock /></ProtectedRoute>} />
            <Route path="supervisor/expenses" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorExpenses /></ProtectedRoute>} />
            <Route path="supervisor/attendance" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorAttendance /></ProtectedRoute>} />
            <Route path="supervisor/tools" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorTools /></ProtectedRoute>} />
            <Route path="supervisor/vendors" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorVendorView /></ProtectedRoute>} />

            {/* ── Contractor Routes ── */}
            <Route path="contractor" element={<ProtectedRoute allowedRoles={['admin','contractor']}><ContractorDashboard /></ProtectedRoute>} />
            <Route path="contractor/attendance" element={<ProtectedRoute allowedRoles={['admin','contractor']}><ContractorAttendance /></ProtectedRoute>} />
            <Route path="contractor/advances" element={<ProtectedRoute allowedRoles={['admin','contractor']}><ContractorAdvances /></ProtectedRoute>} />

            <Route path="unauthorized" element={
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>Unauthorized</h2>
                <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view this page.</p>
              </div>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
