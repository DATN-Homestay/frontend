import { Layout, Menu, Avatar, Dropdown, theme, Badge, Button } from 'antd';
import { useState } from 'react';
import {
    DashboardOutlined,
    TeamOutlined,
    SafetyCertificateOutlined,
    HomeOutlined,
    DollarOutlined,
    SettingOutlined,
    AuditOutlined,
    LogoutOutlined,
    BellOutlined,
    UserOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    GlobalOutlined,
    SyncOutlined,
    ShoppingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/users', icon: <TeamOutlined />, label: 'Quản lý người dùng' },
    { key: '/admin/hosts', icon: <UserOutlined />, label: 'Quản lý Host' },
    { key: '/admin/host-verifications', icon: <SafetyCertificateOutlined />, label: 'Duyệt KYC Host' },
    { key: '/admin/homestays', icon: <HomeOutlined />, label: 'Quản lý Homestay' },
    {
        key: 'finance',
        icon: <DollarOutlined />,
        label: 'Tài chính',
        children: [
            { key: '/admin/revenues', label: 'Doanh thu & Hoa hồng' },
            { key: '/admin/payouts', label: 'Đối soát Payout' },
            { key: '/admin/refunds', label: 'Yêu cầu hoàn tiền' },
        ],
    },
    {
        key: 'data',
        icon: <GlobalOutlined />,
        label: 'Dữ liệu & Tự động',
        children: [
            { key: '/admin/dropship-orders', icon: <ShoppingOutlined />, label: 'Đơn Dropship B2B' },
            { key: '/admin/dropship', icon: <GlobalOutlined />, label: 'Dropship Booking.com (MoR & Affiliate)' },
            { key: '/admin/sync-market-data', icon: <SyncOutlined />, label: 'Đồng bộ RapidAPI' },
        ],
    },
    { key: '/admin/configs', icon: <SettingOutlined />, label: 'Cấu hình hệ thống' },
    { key: '/admin/audit-logs', icon: <AuditOutlined />, label: 'Nhật ký Audit' },
];
export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider 
                trigger={null} 
                collapsible 
                collapsed={collapsed}
                theme="dark" 
                width={260}
                collapsedWidth={80}
                breakpoint="lg"
                onBreakpoint={(broken) => {
                    if (broken) {
                        setCollapsed(true);
                    }
                }}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    height: '100vh',
                    overflow: 'auto',
                    zIndex: 100,
                }}
            >
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: collapsed ? 0 : 20,
                    overflow: 'hidden',
                    transition: 'font-size 0.2s',
                    whiteSpace: 'nowrap'
                }}>
                    Homestay Admin
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={['finance', 'data']}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
                <Header style={{
                    background: token.colorBgContainer,
                    padding: '0 24px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 4px 0 rgba(0, 0, 0, 0.08)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 99,
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: '16px',
                            width: 64,
                            height: 64,
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingRight: 24 }}>
                        <Badge count={5} size="small">
                            <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: token.colorTextSecondary }} />
                        </Badge>
                        <Dropdown menu={{
                            items: [
                                { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
                                { type: 'divider' as const },
                                { key: 'customer', icon: <HomeOutlined />, label: 'Về trang Khách hàng', onClick: () => navigate('/') },
                                { key: 'host', icon: <SafetyCertificateOutlined />, label: 'Kênh Chủ nhà Homestay', onClick: () => navigate('/host') },
                                { type: 'divider' as const },
                                {
                                    key: 'logout',
                                    label: 'Đăng xuất',
                                    icon: <LogoutOutlined />,
                                    danger: true,
                                    onClick: async () => {
                                        await logout();
                                        navigate('/auth/login');
                                    },
                                },
                            ],
                        }}>
                            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                                <span style={{ fontWeight: 500 }}>{user?.full_name ?? 'Super Admin'}</span>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content style={{ margin: '24px 24px 0', overflow: 'initial' }}>
                    <div style={{
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        padding: 24,
                        minHeight: 'calc(100vh - 112px)',
                    }}>
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
