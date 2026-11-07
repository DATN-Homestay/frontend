import {
  AuditOutlined, CalendarOutlined, DashboardOutlined, DollarOutlined, GlobalOutlined,
  HomeOutlined, MessageOutlined, SafetyCertificateOutlined, SettingOutlined,
  ShoppingOutlined, SyncOutlined, TeamOutlined, UndoOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons';
import PortalLayout, { type PortalNavGroup } from './PortalLayout';

const groups: PortalNavGroup[] = [
  { label: 'TỔNG QUAN', items: [
    { path: '/admin', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { path: '/admin/messages', icon: <MessageOutlined />, label: 'Tin nhắn' },
  ] },
  { label: 'QUẢN LÝ NỀN TẢNG', items: [
    { path: '/admin/users', icon: <TeamOutlined />, label: 'Người dùng' },
    { path: '/admin/hosts', icon: <UserOutlined />, label: 'Chủ nhà' },
    { path: '/admin/host-verifications', icon: <SafetyCertificateOutlined />, label: 'Duyệt xác thực' },
    { path: '/admin/homestays', icon: <HomeOutlined />, label: 'Chỗ nghỉ' },
    { path: '/admin/bookings', icon: <CalendarOutlined />, label: 'Quản lý booking' },
  ] },
  { label: 'TÀI CHÍNH', items: [
    { path: '/admin/revenues', icon: <DollarOutlined />, label: 'Doanh thu & hoa hồng' },
    { path: '/admin/payouts', icon: <WalletOutlined />, label: 'Đối soát & chi trả' },
    { path: '/admin/refunds', icon: <UndoOutlined />, label: 'Yêu cầu hoàn tiền' },
  ] },
  { label: 'DỮ LIỆU & HỆ THỐNG', items: [
    { path: '/admin/dropship-orders', icon: <ShoppingOutlined />, label: 'Đơn Dropship B2B' },
    { path: '/admin/dropship', icon: <GlobalOutlined />, label: 'Đặt phòng Booking.com' },
    { path: '/admin/sync-market-data', icon: <SyncOutlined />, label: 'Đồng bộ thị trường' },
    { path: '/admin/configs', icon: <SettingOutlined />, label: 'Cấu hình hệ thống' },
    { path: '/admin/audit-logs', icon: <AuditOutlined />, label: 'Nhật ký hoạt động' },
  ] },
];

export default function AdminLayout() {
  return <PortalLayout role="ADMIN" groups={groups} />;
}
