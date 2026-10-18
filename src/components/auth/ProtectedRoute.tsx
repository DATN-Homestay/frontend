import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Result, Button, Spin, Space } from 'antd';
import { HomeOutlined, SafetyCertificateOutlined, ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  requireAuthOnly?: boolean;
}

export default function ProtectedRoute({ allowedRoles, requireAuthOnly = false }: ProtectedRouteProps) {
  const { user, isAuthenticated, initializing, isHost } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Đang khôi phục phiên từ token
  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Space orientation="vertical" align="center" size="middle">
          <Spin size="large" />
          <div style={{ color: '#64748b', fontSize: 14 }}>Đang xác thực quyền truy cập StayAI...</div>
        </Space>
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển hướng tới trang Đăng nhập
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAuthOnly) {
    return <Outlet />;
  }

  // Kiểm tra vai trò của người dùng
  const hasPermission = user.roles && user.roles.some((r) => allowedRoles.includes(r));

  if (!hasPermission) {
    // 1. Trường hợp cố truy cập trang Admin mà không phải ADMIN
    if (allowedRoles.includes('ADMIN')) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 24 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: '36px 32px', maxWidth: 540, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <Result
              status="403"
              title="Truy Cập Bị Từ Chối"
              subTitle="Khu vực Quản trị viên (Admin Portal) chỉ dành riêng cho tài khoản Quản trị cấp cao. Tài khoản hiện tại của bạn không có quyền truy cập."
              extra={
                <Space size="middle" wrap style={{ justifyContent: 'center' }}>
                  <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
                    Về trang Khách hàng
                  </Button>
                  {isHost && (
                    <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate('/host')}>
                      Về Kênh Chủ nhà
                    </Button>
                  )}
                  <Button icon={<LoginOutlined />} onClick={() => navigate('/auth/login', { state: { from: '/admin' } })}>
                    Đăng nhập tài khoản khác
                  </Button>
                </Space>
              }
            />
          </div>
        </div>
      );
    }

    // 2. Trường hợp khách hàng (CUSTOMER) cố truy cập trang Host mà chưa đăng ký làm Chủ nhà
    if (allowedRoles.includes('HOST')) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: '36px 32px', maxWidth: 560, width: '100%', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <Result
              status="403"
              title="Kênh Dành Riêng Cho Chủ Nhà (Host)"
              subTitle="Tài khoản của bạn hiện là Khách du lịch (Customer) và chưa đăng ký vai trò Chủ nhà Homestay. Để đăng tin homestay, quản lý giá và doanh thu, bạn cần có tài khoản Chủ nhà."
              extra={
                <Space size="middle" wrap style={{ justifyContent: 'center' }}>
                  <Button
                    type="primary"
                    size="large"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}
                    onClick={() => navigate('/auth/register?role=HOST')}
                  >
                    Đăng ký làm Chủ nhà ngay
                  </Button>
                  <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
                    Quay về trang Khách hàng
                  </Button>
                </Space>
              }
            />
          </div>
        </div>
      );
    }

    // Các trường hợp khác
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
