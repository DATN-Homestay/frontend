import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/Dashboard';
import UsersPage from './pages/admin/Users';
import HostVerificationsPage from './pages/admin/HostVerifications';
import HomestaysPage from './pages/admin/Homestays';
import RevenuesPage from './pages/admin/Revenues';
import PayoutsPage from './pages/admin/Payouts';
import RefundsPage from './pages/admin/Refunds';
import ConfigsPage from './pages/admin/Configs';
import AuditLogsPage from './pages/admin/AuditLogs';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1', // Vibrant indigo
          colorInfo: '#3b82f6',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 8,
          wireframe: false,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          colorBgBase: '#f8fafc', // Light slate background for app
          colorBgContainer: '#ffffff',
          boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        components: {
          Layout: {
            siderBg: '#0f172a', // Sleek dark slate for sider
            headerBg: '#ffffff',
          },
          Menu: {
            darkItemBg: '#0f172a',
            darkItemSelectedBg: '#6366f1',
          },
          Table: {
            headerBg: '#f1f5f9',
            headerColor: '#475569',
            rowHoverBg: '#f8fafc',
          },
          Card: {
            boxShadowTertiary: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          }
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="host-verifications" element={<HostVerificationsPage />} />
            <Route path="homestays" element={<HomestaysPage />} />
            <Route path="revenues" element={<RevenuesPage />} />
            <Route path="payouts" element={<PayoutsPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="configs" element={<ConfigsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}