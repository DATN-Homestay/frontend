import { Layout, Menu, Button, Space, Typography, Tag, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  WalletOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  CompassOutlined,
  SwapOutlined,
  LogoutOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;
const { Title, Text } = Typography;

export default function HostLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const hostUserMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
    {
      key: 'customer-mode',
      icon: <CompassOutlined style={{ color: '#6366f1' }} />,
      label: <span style={{ color: '#6366f1', fontWeight: 600 }}>Chuyển sang trang Khách hàng</span>,
      onClick: () => navigate('/'),
    },
    ...(isAdmin
      ? [
          { type: 'divider' as const },
          {
            key: 'admin-mode',
            icon: <SwapOutlined style={{ color: '#ef4444' }} />,
            label: <span style={{ color: '#ef4444', fontWeight: 600 }}>Trang Quản trị (Admin)</span>,
            onClick: () => navigate('/admin'),
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: async () => {
        await logout();
        navigate('/');
      },
    },
  ];

  const menuItems = [
    { key: '/host', icon: <DashboardOutlined />, label: 'Tổng quan (Dashboard)' },
    { key: '/host/listings', icon: <HomeOutlined />, label: 'Quản lý Homestay' },
    { key: '/host/pricing', icon: <DollarOutlined />, label: 'Lịch giá & AI Đề xuất' },
    { key: '/host/verification', icon: <SafetyCertificateOutlined />, label: 'Xác thực 4 lớp Chính chủ' },
    { key: '/host/bookings', icon: <CalendarOutlined />, label: 'Đơn đặt phòng & Check-in' },
    { key: '/host/payouts', icon: <WalletOutlined />, label: 'Doanh thu & Rút tiền' },
    { key: '/host/coupons', icon: <GiftOutlined />, label: 'Mã giảm giá & Ưu đãi' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        width={250}
        style={{
          background: '#090d16',
          boxShadow: '2px 0 8px 0 rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            H
          </div>
          <div>
            <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 16 }}>
              Host Portal
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>Kênh dành cho Chủ nhà</Text>
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', padding: '0 8px' }}
        />

        <div style={{ position: 'absolute', bottom: 20, width: '100%', padding: '0 16px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ color: '#94a3b8', width: '100%', textAlign: 'left' }}
          >
            Về trang Khách hàng
          </Button>
        </div>
      </Sider>

      <Layout style={{ background: '#f8fafc' }}>
        <Header
          style={{
            background: '#ffffff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <div>
            <Tag color="purple">Chủ nhà đã liên kết Escrow</Tag>
          </div>

          <Space size="middle">
            {/* Nút chuyển đổi sang trang Khách hàng nhanh chóng */}
            <Button
              type="default"
              icon={<CompassOutlined />}
              onClick={() => navigate('/')}
              style={{ borderColor: '#6366f1', color: '#6366f1', fontWeight: 500 }}
            >
              Về trang Khách hàng
            </Button>

            {/* Chỉ tài khoản ADMIN mới thấy nút này */}
            {isAdmin && (
              <Button onClick={() => navigate('/admin')} type="dashed" danger>
                Vào Admin Portal
              </Button>
            )}

            <Dropdown menu={{ items: hostUserMenuItems }}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                  <Text strong>{user?.full_name || 'Chủ nhà'}</Text>
                  <Text type="secondary" style={{ fontSize: 11, color: '#6366f1' }}>
                    Chủ nhà Homestay
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
