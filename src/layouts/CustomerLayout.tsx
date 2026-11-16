import { Suspense, useState } from 'react';
import { Avatar, Badge, Button, Drawer, Dropdown } from 'antd';
import { ArrowRightOutlined, CalendarOutlined, DownOutlined, HeartOutlined, HomeOutlined, LogoutOutlined, MenuOutlined, MessageOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useFavorites } from '../contexts/useFavorites';
import ChatNavBadge from '../features/chat/ChatNavBadge';
import Brand from '../components/Brand';
import PageLoading from '../components/PageLoading';
import './CustomerLayout.css';

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isHost, isAdmin, logout } = useAuth();
  const { favoritesCount } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';
  const links = [
    { to: '/', label: 'Khám phá', icon: <HomeOutlined /> },
    { to: '/search', label: 'Chỗ nghỉ', icon: <CalendarOutlined /> },
    { to: '/favorites', label: <>Yêu thích {favoritesCount > 0 && <Badge count={favoritesCount} size="small" />}</>, icon: <HeartOutlined /> },
    { to: '/trips', label: 'Chuyến đi', icon: <CalendarOutlined /> },
    ...(user ? [{ to: '/messages', label: <ChatNavBadge role={isAdmin ? 'ADMIN' : 'CUSTOMER'} />, icon: <MessageOutlined /> }] : []),
  ];
  const accountItems = [
    { key: 'profile', label: 'Hồ sơ của tôi', icon: <UserOutlined />, onClick: () => navigate('/profile') },
    { key: 'trips', label: 'Chuyến đi của tôi', icon: <CalendarOutlined />, onClick: () => navigate('/trips') },
    { key: 'favorites', label: 'Homestay yêu thích', icon: <HeartOutlined />, onClick: () => navigate('/favorites') },
    ...(isHost ? [{ key: 'host', label: 'Kênh chủ nhà', icon: <HomeOutlined />, onClick: () => navigate('/host') }] : []),
    ...(isAdmin ? [{ key: 'admin', label: 'Quản trị hệ thống', icon: <SafetyCertificateOutlined />, onClick: () => navigate('/admin') }] : []),
    { type: 'divider' as const },
    { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true, onClick: async () => { await logout(); navigate('/'); } },
  ];
  const nav = (mobile = false) => <nav className={mobile ? 'customer-mobile-links' : 'customer-links'} aria-label={mobile ? 'Điều hướng di động' : 'Điều hướng chính'}>
    {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setMenuOpen(false)}>
      {mobile && link.icon}<span>{link.label}</span>
    </NavLink>)}
  </nav>;

  return <div className={`customer-layout${location.pathname === '/messages' ? ' chat-route-layout' : ''}`}>
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <header className="customer-header">
      <div className="customer-header-inner">
        <Brand />
        {nav()}
        <div className="customer-actions">
          <Link className="customer-host-link" to={isHost ? '/host' : '/auth/register?role=HOST'}>{isHost ? 'Kênh chủ nhà' : 'Trở thành chủ nhà'} <ArrowRightOutlined /></Link>
          {user ? <Dropdown trigger={['click']} menu={{ items: accountItems }}>
            <button className="customer-account" aria-label={`Tài khoản ${user.full_name}`} type="button">
              <Avatar src={user.avatar_url} icon={<UserOutlined />} size={34} /><span>{user.full_name.split(' ').at(-1)}</span><DownOutlined />
            </button>
          </Dropdown> : <>
            <Link className="customer-register-link" to="/auth/register" state={{ from: location.pathname }}>Đăng ký</Link>
            <Button type="primary" onClick={() => navigate('/auth/login', { state: { from: location.pathname } })}>Đăng nhập</Button>
          </>}
          <Button className="customer-menu-toggle" type="text" icon={<MenuOutlined />} aria-label="Mở menu điều hướng" onClick={() => setMenuOpen(true)} />
        </div>
      </div>
    </header>
    <Drawer title={<Brand />} placement="right" open={menuOpen} onClose={() => setMenuOpen(false)} size={310}>
      {nav(true)}
      <div className="customer-mobile-actions">
        <Link to={isHost ? '/host' : '/auth/register?role=HOST'} onClick={() => setMenuOpen(false)}><HomeOutlined /> {isHost ? 'Kênh chủ nhà' : 'Trở thành chủ nhà'} <ArrowRightOutlined /></Link>
        {!user && <Link to="/auth/register" onClick={() => setMenuOpen(false)}>Tạo tài khoản mới</Link>}
      </div>
    </Drawer>
    <main id="main-content" className={`customer-content${isHome ? ' customer-content--home' : ''}`}>
      <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
    </main>
    <footer className="customer-footer">
      <div className="customer-footer-inner">
        <div className="footer-brand-column"><Brand /><p>Những nơi ở mang dấu ấn riêng.<br />Những chuyến đi thật đáng nhớ.</p><span className="footer-locale">Việt Nam <span>·</span> Tiếng Việt <span>·</span> VND</span></div>
        <div className="footer-links"><h3>Khám phá StayAI</h3><Link to="/search">Tất cả chỗ nghỉ</Link><Link to="/favorites">Bộ sưu tập yêu thích</Link><Link to="/trips">Chuyến đi của bạn</Link></div>
        <div className="footer-links"><h3>Dành cho chủ nhà</h3><Link to="/auth/register?role=HOST">Bắt đầu đón khách</Link><Link to="/host">Quản lý chỗ nghỉ</Link><Link to="/host/pricing">Lịch giá & gợi ý AI</Link></div>
        <div className="footer-promise"><SafetyCertificateOutlined /><h3>An tâm trên mỗi hành trình</h3><p>Thông tin rõ ràng. Thanh toán có bảo vệ. Đội ngũ StayAI luôn sẵn sàng hỗ trợ.</p><Link to="/messages">Liên hệ hỗ trợ <ArrowRightOutlined /></Link></div>
      </div>
      <div className="customer-footer-bottom"><span>© {new Date().getFullYear()} StayAI. All rights reserved.</span><span>Made for memorable stays <span className="footer-dot" /></span></div>
    </footer>
  </div>;
}
