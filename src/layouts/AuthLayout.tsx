import { ConfigProvider, Spin, Typography, theme } from 'antd';
import { CompassOutlined } from '@ant-design/icons';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postLoginPath } from '../services/authService';

const { Text } = Typography;

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initializing } = useAuth();

  // Đã đăng nhập thì không ở lại trang đăng nhập / đăng ký.
  // Cùng đích với trang Login/Register (postLoginPath) nên không xung đột khi vừa đăng nhập xong.
  if (!initializing && user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={postLoginPath(user.roles, from)} replace />;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: 'rgba(15, 23, 42, 0.55)',
          colorBorder: 'rgba(148, 163, 184, 0.28)',
          borderRadius: 10,
        },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          padding: '24px 16px',
          background:
            'radial-gradient(circle at 15% 70%, rgba(124, 58, 237, 0.35), transparent 45%),' +
            'radial-gradient(circle at 85% 30%, rgba(20, 184, 166, 0.25), transparent 40%),' +
            'linear-gradient(135deg, #0b1020 0%, #111836 50%, #1e1b4b 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', alignSelf: 'flex-start' }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.5)',
            }}
          >
            <CompassOutlined />
          </div>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
            StayAI <span style={{ fontWeight: 400, color: '#cbd5e1' }}>- Homestay &amp; Escrow Platform</span>
          </Text>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              padding: '32px 32px 24px',
              borderRadius: 18,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            {initializing ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
