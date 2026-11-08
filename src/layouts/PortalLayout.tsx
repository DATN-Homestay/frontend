import { useState, type CSSProperties, type ReactNode } from 'react';
import { Avatar, Badge, Button, Drawer, Dropdown, Grid, Layout, Menu, Tooltip } from 'antd';
import {
  ArrowUpOutlined, DownOutlined, HomeOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MessageOutlined,
  SafetyCertificateOutlined, SwapOutlined, UserOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import PageLoading from '../components/PageLoading';
import { useAuth } from '../contexts/useAuth';
import { useChat } from '../features/chat/ChatContext';
import ChatNavBadge from '../features/chat/ChatNavBadge';
import './PortalLayout.css';

export interface PortalNavItem { path: string; label: string; icon: ReactNode }
export interface PortalNavGroup { label: string; items: PortalNavItem[] }

export default function PortalLayout({ role, groups }: { role: 'HOST' | 'ADMIN'; groups: PortalNavGroup[] }) {
  const { user, isAdmin, isHost, logout } = useAuth();
  const { conversations } = useChat();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const desktop = screens.lg === true;
  const base = role === 'HOST' ? '/host' : '/admin';
  const portalName = role === 'HOST' ? 'Kênh chủ nhà' : 'Quản trị hệ thống';
  const items = groups.flatMap((group) => group.items);
  const current = [...items].sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)) ?? items[0];
  const unread = conversations
    .filter((conversation) => conversation.participants.some((person) => person.id === user?.id && person.role === role))
    .reduce((count, conversation) => count + conversation.unread_count, 0);
  const compact = desktop && collapsed;
  const messagesPage = pathname === `${base}/messages`;
  const layoutStyle = { '--portal-sidebar-width': collapsed ? '76px' : '248px' } as CSSProperties;

  const go = (path: string) => { setDrawerOpen(false); navigate(path); };
  const switchItems = [
    { key: '/', label: 'Trang khách hàng', icon: <HomeOutlined />, onClick: () => go('/') },
    ...(role !== 'HOST' && (isHost || isAdmin)
      ? [{ key: '/host', label: 'Kênh chủ nhà', icon: <HomeOutlined />, onClick: () => go('/host') }] : []),
    ...(role !== 'ADMIN' && isAdmin
      ? [{ key: '/admin', label: 'Quản trị hệ thống', icon: <SafetyCertificateOutlined />, onClick: () => go('/admin') }] : []),
  ];

  const navigation = <div className={`portal-navigation${compact ? ' is-compact' : ''}`}>
    <Link to={base} className="portal-brand" aria-label={`StayAI · ${portalName}`} onClick={() => setDrawerOpen(false)}>
      <span className="portal-brand-mark">S<span /></span>
      {!compact && <span className="portal-brand-copy"><strong>StayAI<span> workspace</span></strong><small>{portalName}</small></span>}
    </Link>
    <nav className="portal-nav-scroll" aria-label={`Điều hướng ${portalName.toLowerCase()}`}>
      <Menu theme="dark" mode="inline" inlineCollapsed={compact} selectedKeys={[current.path]}
        items={groups.map((group) => ({
          key: group.label, type: 'group' as const, label: group.label,
          children: group.items.map((item) => ({
            key: item.path, icon: item.icon, title: item.label,
            label: <span aria-current={current.path === item.path ? 'page' : undefined}>
              {item.path === `${base}/messages` ? <ChatNavBadge role={role} /> : item.label}
            </span>,
          })),
        }))} onClick={({ key }) => go(key)} />
    </nav>
    <div className="portal-sidebar-footer">
      {!compact && <span className="portal-footer-label">KHÔNG GIAN LÀM VIỆC</span>}
      <Dropdown menu={{ items: switchItems }} trigger={['click']} placement="topLeft">
        <button type="button" className="portal-switcher" aria-label="Chuyển không gian làm việc" title={compact ? 'Chuyển không gian làm việc' : undefined}>
          <SwapOutlined />{!compact && <><span><strong>{portalName}</strong><small>Chuyển không gian</small></span><DownOutlined /></>}
        </button>
      </Dropdown>
    </div>
  </div>;

  return <Layout className={`portal-layout portal-layout--${role.toLowerCase()}`} style={layoutStyle}>
    {desktop && <Layout.Sider className="portal-sidebar" width={248} collapsedWidth={76} collapsed={collapsed} trigger={null}>{navigation}</Layout.Sider>}
    {!desktop && <Drawer className="portal-drawer" title="Menu điều hướng" placement="left" size={272}
      open={drawerOpen} onClose={() => setDrawerOpen(false)}
      styles={{ body: { padding: 0 }, header: { background: '#11182b', color: '#fff' } }}
    >{navigation}</Drawer>}
    <Layout className="portal-main">
      <Layout.Header className="portal-header">
        <div className="portal-header-start">
          <Tooltip title={desktop ? (collapsed ? 'Mở rộng menu' : 'Thu gọn menu') : 'Mở menu'}>
            <Button type="text" className="portal-menu-toggle"
              aria-label={desktop ? (collapsed ? 'Mở rộng menu' : 'Thu gọn menu') : 'Mở menu điều hướng'}
              aria-expanded={desktop ? !collapsed : drawerOpen}
              icon={desktop ? (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />) : <MenuOutlined />}
              onClick={() => desktop ? setCollapsed((value) => !value) : setDrawerOpen(true)} />
          </Tooltip>
          <div className="portal-page-title"><span>{portalName}</span><h1>{current.label}</h1></div>
        </div>
        <div className="portal-header-actions">
          <Link to="/" className="portal-website-link" aria-label="Xem trang khách hàng"><span>Xem website</span><ArrowUpOutlined rotate={45} /></Link>
          <Tooltip title="Tin nhắn">
            <Button type="text" className="portal-message-button" aria-label={`Tin nhắn${unread ? `, ${unread} chưa đọc` : ''}`} onClick={() => go(`${base}/messages`)}>
              <Badge count={unread} size="small" overflowCount={99}><MessageOutlined /></Badge>
            </Button>
          </Tooltip>
          <span className="portal-header-divider" />
          <Dropdown trigger={['click']} menu={{ items: [
            { key: 'profile', label: 'Hồ sơ cá nhân', icon: <UserOutlined />, onClick: () => go('/profile') },
            { type: 'divider' as const },
            { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true,
              onClick: async () => { await logout(); navigate('/auth/login'); } },
          ] }}>
            <button type="button" className="portal-account" aria-label={`Tài khoản ${user?.full_name || portalName}`}>
              <Avatar size={36} src={user?.avatar_url} icon={<UserOutlined />} />
              <span><strong>{user?.full_name || (role === 'HOST' ? 'Chủ nhà' : 'Quản trị viên')}</strong><small>{role === 'HOST' ? 'Chủ nhà' : 'Quản trị viên'}</small></span>
              <DownOutlined />
            </button>
          </Dropdown>
        </div>
      </Layout.Header>
      <Layout.Content className={`portal-content${messagesPage ? ' portal-content--messages' : ''}`}><Suspense fallback={<PageLoading />}><Outlet /></Suspense></Layout.Content>
    </Layout>
  </Layout>;
}
