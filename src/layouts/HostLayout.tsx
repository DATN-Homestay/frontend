import {
  CalendarOutlined, DashboardOutlined, DollarOutlined, GiftOutlined,
  HomeOutlined, MessageOutlined, SafetyCertificateOutlined, WalletOutlined,
} from '@ant-design/icons';
import PortalLayout, { type PortalNavGroup } from './PortalLayout';

const groups: PortalNavGroup[] = [
  { label: 'KHÔNG GIAN CHỦ NHÀ', items: [
    { path: '/host', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { path: '/host/messages', icon: <MessageOutlined />, label: 'Tin nhắn' },
  ] },
  { label: 'QUẢN LÝ CHỖ NGHỈ', items: [
    { path: '/host/listings', icon: <HomeOutlined />, label: 'Chỗ nghỉ của tôi' },
    { path: '/host/bookings', icon: <CalendarOutlined />, label: 'Đơn đặt phòng' },
    { path: '/host/pricing', icon: <DollarOutlined />, label: 'Lịch giá & gợi ý AI' },
    { path: '/host/verification', icon: <SafetyCertificateOutlined />, label: 'Xác thực chủ nhà' },
  ] },
  { label: 'KINH DOANH', items: [
    { path: '/host/payouts', icon: <WalletOutlined />, label: 'Doanh thu & rút tiền' },
    { path: '/host/coupons', icon: <GiftOutlined />, label: 'Ưu đãi & mã giảm giá' },
  ] },
];

export default function HostLayout() {
  return <PortalLayout role="HOST" groups={groups} />;
}
