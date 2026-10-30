import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';

import ProtectedRoute from './components/auth/ProtectedRoute';
import OtaModeSwitcher from './components/OtaModeSwitcher';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import HostLayout from './layouts/HostLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';

// Customer Pages (Member 1)
import HomePage from './pages/customer/Home';
import HomestayDetailPage from './pages/customer/HomestayDetail';
import CheckoutPage from './pages/customer/Checkout';
import MyTripsPage from './pages/customer/MyTrips';
import ProfilePage from './pages/account/Profile';
import PaymentResultPage from './pages/customer/PaymentResult';
import RequireAuth from './components/RequireAuth';

// Host Pages (Member 2)
import HostDashboardPage from './pages/host/Dashboard';
import MyListingsPage from './pages/host/MyListings';
import PriceCalendarPage from './pages/host/PriceCalendar';
import VerificationPage from './pages/host/Verification';
import HostBookingsPage from './pages/host/Bookings';
import HostPayoutsPage from './pages/host/Payouts';
import HostCouponsPage from './pages/host/Coupons';

// Admin Pages (Member 3 - Intact)
import DashboardPage from './pages/admin/Dashboard';
import UsersPage from './pages/admin/Users';
import HostVerificationsPage from './pages/admin/HostVerifications';
import HomestaysPage from './pages/admin/Homestays';
import RevenuesPage from './pages/admin/Revenues';
import PayoutsPage from './pages/admin/Payouts';
import RefundsPage from './pages/admin/Refunds';
import ConfigsPage from './pages/admin/Configs';
import AuditLogsPage from './pages/admin/AuditLogs';
import DropshipOrdersPage from './pages/admin/DropshipOrders';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          colorInfo: '#3b82f6',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 8,
          wireframe: false,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgBase: '#f8fafc',
          colorBgContainer: '#ffffff',
          boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        components: {
          Layout: {
            siderBg: '#0f172a',
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
          },
        },
      }}
    >
      <AntApp>
        <ErrorBoundary>
          <AuthProvider>
            <BrowserRouter>
          <Routes>
            {/* PHÂN HỆ 1: KHÁCH HÀNG (CUSTOMER PORTAL) */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<HomePage />} />
              <Route path="homestay/:id" element={<HomestayDetailPage />} />
              <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
              <Route path="payment-result" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
              <Route path="trips" element={<RequireAuth><MyTripsPage /></RequireAuth>} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* PHÂN HỆ 2: CHỦ NHÀ (HOST PORTAL) - CHỈ TÀI KHOẢN ĐĂNG KÝ LÀM HOST MỚI VÀO ĐƯỢC */}
            <Route element={<ProtectedRoute allowedRoles={['HOST', 'ADMIN']} />}>
              <Route path="/host" element={<HostLayout />}>
                <Route index element={<HostDashboardPage />} />
                <Route path="listings" element={<MyListingsPage />} />
                <Route path="pricing" element={<PriceCalendarPage />} />
                <Route path="verification" element={<VerificationPage />} />
                <Route path="bookings" element={<HostBookingsPage />} />
                <Route path="payouts" element={<HostPayoutsPage />} />
                <Route path="coupons" element={<HostCouponsPage />} />
              </Route>
            </Route>

            {/* PHÂN HỆ 3: QUẢN TRỊ VIÊN (ADMIN PORTAL) - CHỈ TÀI KHOẢN ADMIN MỚI VÀO ĐƯỢC */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="dropship" element={<DropshipOrdersPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="host-verifications" element={<HostVerificationsPage />} />
                <Route path="homestays" element={<HomestaysPage />} />
                <Route path="revenues" element={<RevenuesPage />} />
                <Route path="payouts" element={<PayoutsPage />} />
                <Route path="refunds" element={<RefundsPage />} />
                <Route path="configs" element={<ConfigsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>
            </Route>

            {/* PHÂN HỆ AUTHENTICATION */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
            </Route>

            {/* MẶC ĐỊNH CHUYỂN HƯỚNG VỀ TRANG CHỦ KHÁCH HÀNG */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <OtaModeSwitcher />
              </BrowserRouter>
            </AuthProvider>
          </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}