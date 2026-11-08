import { lazy, Suspense } from 'react';
import PageLoading from './components/PageLoading';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import ChatProvider from './features/chat/ChatProvider';
const ChatPage = lazy(() => import('./features/chat/ChatPage'));

import ProtectedRoute from './components/auth/ProtectedRoute';
import SessionRevokedModal from './components/auth/SessionRevokedModal';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
const HostLayout = lazy(() => import('./layouts/HostLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/Login'));
const RegisterPage = lazy(() => import('./pages/auth/Register'));

// Customer Pages (Member 1)
import HomePage from './pages/customer/Home';
const HomestayDetailPage = lazy(() => import('./pages/customer/HomestayDetail'));
const CheckoutPage = lazy(() => import('./pages/customer/Checkout'));
const MyTripsPage = lazy(() => import('./pages/customer/MyTrips'));
const ProfilePage = lazy(() => import('./pages/account/Profile'));
const PaymentResultPage = lazy(() => import('./pages/customer/PaymentResult'));
const FavoritesPage = lazy(() => import('./pages/customer/Favorites'));
import RequireAuth from './components/RequireAuth';

// Host Pages (Member 2)
const HostDashboardPage = lazy(() => import('./pages/host/Dashboard'));
const MyListingsPage = lazy(() => import('./pages/host/MyListings'));
const PriceCalendarPage = lazy(() => import('./pages/host/PriceCalendar'));
const VerificationPage = lazy(() => import('./pages/host/Verification'));
const HostBookingsPage = lazy(() => import('./pages/host/Bookings'));
const AdminBookingsPage = lazy(() => import('./pages/admin/Bookings'));
const HostPayoutsPage = lazy(() => import('./pages/host/Payouts'));
const HostCouponsPage = lazy(() => import('./pages/host/Coupons'));

// Admin Pages (Member 3 - Intact)
const DashboardPage = lazy(() => import('./pages/admin/Dashboard'));
const UsersPage = lazy(() => import('./pages/admin/Users'));
const HostsPage = lazy(() => import('./pages/admin/Hosts'));
const HostVerificationsPage = lazy(() => import('./pages/admin/HostVerifications'));
const HomestaysPage = lazy(() => import('./pages/admin/Homestays'));
const RevenuesPage = lazy(() => import('./pages/admin/Revenues'));
const PayoutsPage = lazy(() => import('./pages/admin/Payouts'));
const RefundsPage = lazy(() => import('./pages/admin/Refunds'));
const ConfigsPage = lazy(() => import('./pages/admin/Configs'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogs'));
const DropshipOrdersPage = lazy(() => import('./pages/admin/DropshipOrders'));
const SyncMarketDataPage = lazy(() => import('./pages/admin/SyncMarketData'));


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
            <FavoritesProvider>
              <ChatProvider>
              <BrowserRouter>
                <SessionRevokedModal />
                <Suspense fallback={<PageLoading />}>
                <Routes>
                  {/* PHÂN HỆ 1: KHÁCH HÀNG (CUSTOMER PORTAL) */}
                  <Route path="/" element={<CustomerLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="homestay/:id" element={<HomestayDetailPage />} />
                    <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
                    <Route path="payment-result" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
                    <Route path="favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
                    <Route path="trips" element={<RequireAuth><MyTripsPage /></RequireAuth>} />
                    <Route path="messages" element={<RequireAuth><ChatPage portalRole="CUSTOMER" /></RequireAuth>} />
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
                      <Route path="messages" element={<ChatPage portalRole="HOST" />} />
                    </Route>
                  </Route>

                  {/* PHÂN HỆ 3: QUẢN TRỊ VIÊN (ADMIN PORTAL) - CHỈ TÀI KHOẢN ADMIN MỚI VÀO ĐƯỢC */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="dropship" element={<DropshipOrdersPage />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="bookings" element={<AdminBookingsPage />} />
                      <Route path="hosts" element={<HostsPage />} />
                      <Route path="host-verifications" element={<HostVerificationsPage />} />
                      <Route path="homestays" element={<HomestaysPage />} />
                      <Route path="revenues" element={<RevenuesPage />} />
                      <Route path="payouts" element={<PayoutsPage />} />
                      <Route path="refunds" element={<RefundsPage />} />
                      <Route path="configs" element={<ConfigsPage />} />
                      <Route path="audit-logs" element={<AuditLogsPage />} />
                      <Route path="dropship-orders" element={<DropshipOrdersPage />} />
                      <Route path="sync-market-data" element={<SyncMarketDataPage />} />
                      <Route path="messages" element={<ChatPage portalRole="ADMIN" />} />
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
                </Suspense>
              </BrowserRouter>
            </ChatProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}
