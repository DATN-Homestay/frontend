import { Layout, Menu, Button, Space, Typography, Tag, Avatar } from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  WalletOutlined,
  UserOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;
const { Title, Text } = Typography;

export default function HostLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { key: '/host', icon: <DashboardOutlined />, label: 'Tổng quan (Dashboard)' },
    { key: '/host/listings', icon: <HomeOutlined />, label: 'Quản lý Homestay' },
    { key: '/host/pricing', icon: <DollarOutlined />, label: 'Lịch giá & AI Đề xuất' },
    { key: '/host/verification', icon: <SafetyCertificateOutlined />, label: 'Xác thực 4 lớp Chính chủ' },
    { key: '/host/bookings', icon: <CalendarOutlined />, label: 'Đơn đặt phòng & Check-in' },
    { key: '/host/payouts', icon: <WalletOutlined />, label: 'Doanh thu & Rút tiền' },
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
            <Button onClick={() => navigate('/admin')} type="dashed">
              Chuyển sang Admin Portal
            </Button>

            <Space style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
              <Text strong>{user?.full_name || 'Chủ nhà'}</Text>
            </Space>
          </Space>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
