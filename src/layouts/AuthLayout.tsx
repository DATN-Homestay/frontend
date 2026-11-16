import { Suspense } from 'react';
import { Spin } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { postLoginPath } from '../services/authService';
import Brand from '../components/Brand';
import PageLoading from '../components/PageLoading';
import './AuthLayout.css';

export default function AuthLayout() {
  const location = useLocation();
  const { user, initializing } = useAuth();
  if (!initializing && user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={postLoginPath(user.roles, from)} replace />;
  }
  return <div className="auth-layout">
    <aside className="auth-story">
      <img className="auth-story-photo" src="/images/retreat.jpg" alt="Một không gian nghỉ dưỡng đầy cảm hứng" />
      <Brand inverse caption="YOUR NEXT CHAPTER STARTS HERE" />
      <div className="auth-story-copy"><span className="eyebrow">MORE THAN A PLACE TO STAY</span><h1>Đi để khám phá.<br /><em>Ở để yêu thêm.</em></h1><p>Từ một góc nhỏ bình yên đến những hành trình mới. Trải nghiệm tiếp theo đang chờ bạn.</p><div className="auth-story-benefits"><span><CheckCircleOutlined /> Tìm nơi ở phù hợp</span><span><SafetyCertificateOutlined /> Thanh toán được bảo vệ</span></div></div>
      <span className="auth-story-footer">StayAI · Những chuyến đi mang dấu ấn riêng.</span>
    </aside>
    <section className="auth-main">
      <div className="auth-topbar"><Link to="/" className="auth-back"><ArrowLeftOutlined /> Về trang chủ</Link><span>VI <span>·</span> VND</span></div>
      <div className="auth-form-wrap"><div className="auth-mobile-brand"><Brand /></div><div className="auth-form">
        {initializing ? <div className="auth-loading"><Spin /></div> : <Suspense fallback={<PageLoading />}><Outlet /></Suspense>}
      </div></div>
      <div className="auth-main-footer"><SafetyCertificateOutlined /> Kết nối an toàn. Trải nghiệm trọn vẹn.</div>
    </section>
  </div>;
}
