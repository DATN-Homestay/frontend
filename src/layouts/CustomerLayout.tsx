import { Layout, Menu, Button, Space, Typography, Tag, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined,
  CompassOutlined,
  CalendarOutlined,
  UserOutlined,
  SwapOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, switchRoleMock, logout } = useAuth();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Khám phá Homestay' },
    { key: '/trips', icon: <CalendarOutlined />, label: 'Chuyến đi của tôi' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header
        style={{
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
            }}
          >
            <CompassOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700, letterSpacing: -0.5 }}>
              StayAI
            </Title>
          </div>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, maxWidth: 350, borderBottom: 'none', marginLeft: 32 }}
        />

        <Space size="middle">
          {/* Quick Role Switcher for pairwise test */}
          <Tag color="cyan" style={{ cursor: 'pointer', padding: '4px 8px' }} onClick={() => switchRoleMock('HOST')}>
            <SwapOutlined /> Đang là: <strong>{role}</strong> (Click đổi)
          </Tag>

          <Button type="default" onClick={() => navigate('/host')}>
            Chuyển sang Chế độ Chủ nhà (Host)
          </Button>

          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'trips', icon: <CalendarOutlined />, label: 'Chuyến đi của tôi', onClick: () => navigate('/trips') },
                  { type: 'divider' },
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
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar src={user.avatar_url ?? undefined} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                <Text strong>{user.full_name}</Text>
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Button onClick={() => navigate('/auth/register', { state: { from: location.pathname } })}>Đăng ký</Button>
              <Button
                type="primary"
                icon={<UserOutlined />}
                onClick={() => navigate('/auth/login', { state: { from: location.pathname } })}
              >
                Đăng nhập
              </Button>
            </Space>
          )}
        </Space>
      </Header>

      <Content style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center', background: '#ffffff', borderTop: '1px solid #e2e8f0', color: '#64748b' }}>
        <Text strong style={{ color: '#6366f1' }}>StayAI</Text> - Nền tảng Đặt Homestay Thông minh tích hợp AI & Escrow 24h © 2026
      </Footer>
    </Layout>
  );
}
