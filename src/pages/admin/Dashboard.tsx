import {
  Card,
  Col,
  Row,
  Statistic,
  Tag,
  Spin,
  Alert,
  Badge,
  Progress,
  Divider,
  Tooltip,
  Button,
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminService, type DashboardStats } from '../../services/adminService';
import { adminApi, mockDashboard } from '../../services/adminMock';

// Màu cho trạng thái booking
const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#f59e0b',
  PAID_ESCROW: '#3b82f6',
  CHECKED_IN: '#8b5cf6',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
  EXPIRED: '#94a3b8',
  DISPUTED: '#f97316',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID_ESCROW: 'Đã thanh toán',
  CHECKED_IN: 'Đang lưu trú',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  DISPUTED: 'Khiếu nại',
};

function formatVnd(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ ₫`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} triệu ₫`;
  return amount.toLocaleString('vi-VN') + ' ₫';
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
      setUsingMock(false);
    } catch {
      // Fallback về mock khi backend chưa chạy
      setStats({
        users: { total: mockDashboard.totalCustomers + mockDashboard.totalHosts },
        homestays: { total: mockDashboard.totalHomestays },
        bookings: {
          total: mockDashboard.totalBookings,
          by_status: {
            COMPLETED: 2800,
            PAID_ESCROW: 350,
            CHECKED_IN: 120,
            PENDING_PAYMENT: 80,
            CANCELLED: 60,
            EXPIRED: 10,
          },
        },
        revenue: {
          total_confirmed_vnd: mockDashboard.monthlyGrossRevenue,
          platform_commission_vnd: mockDashboard.monthlyCommissionEarned,
        },
        pending_actions: {
          payouts_waiting: 3,
          claims_waiting: mockDashboard.pendingVerifications,
        },
      });
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  const totalBookings = stats?.bookings.total ?? 0;
  const completedBookings = (stats?.bookings.by_status?.COMPLETED ?? 0) + (stats?.bookings.by_status?.CHECKED_IN ?? 0);
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
            Tổng quan hệ thống
          </h2>
          <p style={{ margin: 0, color: '#64748b', marginTop: 4 }}>
            Dữ liệu thống kê toàn nền tảng Homestay All-in-One
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {usingMock && (
            <Tag color="orange" icon={<ClockCircleOutlined />}>
              Mock Data (Backend offline)
            </Tag>
          )}
          {!usingMock && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Live Data
            </Tag>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Làm mới
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />
      )}

      {/* METRIC CARDS ROW 1 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            styles={{ body: { padding: '20px 24px' } }}
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Tổng người dùng</p>
                <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                  {(stats?.users.total ?? 0).toLocaleString()}
                </p>
              </div>
              <div style={{ background: '#ede9fe', borderRadius: 10, padding: 10 }}>
                <UserOutlined style={{ fontSize: 22, color: '#7c3aed' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            styles={{ body: { padding: '20px 24px' } }}
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Tổng Homestay</p>
                <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                  {(stats?.homestays.total ?? 0).toLocaleString()}
                </p>
              </div>
              <div style={{ background: '#d1fae5', borderRadius: 10, padding: 10 }}>
                <HomeOutlined style={{ fontSize: 22, color: '#059669' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            styles={{ body: { padding: '20px 24px' } }}
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Doanh thu đã xác nhận</p>
                <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, color: '#059669', lineHeight: 1 }}>
                  {formatVnd(stats?.revenue.total_confirmed_vnd ?? 0)}
                </p>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: 10, padding: 10 }}>
                <DollarOutlined style={{ fontSize: 22, color: '#d97706' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            styles={{ body: { padding: '20px 24px' } }}
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Hoa hồng sàn (7.5%)</p>
                <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, color: '#7c3aed', lineHeight: 1 }}>
                  {formatVnd(stats?.revenue.platform_commission_vnd ?? 0)}
                </p>
              </div>
              <div style={{ background: '#ede9fe', borderRadius: 10, padding: 10 }}>
                <RiseOutlined style={{ fontSize: 22, color: '#7c3aed' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ROW 2: BOOKING STATS + PENDING ACTIONS */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Booking theo trạng thái */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Phân bổ Booking theo Trạng thái</span>
                <Tag color="blue">{totalBookings.toLocaleString()} tổng</Tag>
              </div>
            }
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {Object.entries(stats?.bookings.by_status ?? {}).map(([status, count]) => {
                const pct = totalBookings > 0 ? Math.round(((count as number) / totalBookings) * 100) : 0;
                return (
                  <div key={status} style={{ flex: '1 1 45%', minWidth: 180 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>
                        {STATUS_LABEL[status] ?? status}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[status] ?? '#6b7280' }}>
                        {(count as number).toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={STATUS_COLOR[status] ?? '#6b7280'}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>

            <Divider style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Tỷ lệ hoàn thành tổng:</span>
              <Progress
                percent={completionRate}
                size="small"
                strokeColor="#10b981"
                style={{ flex: 1 }}
              />
              <span style={{ color: '#10b981', fontWeight: 600 }}>{completionRate}%</span>
            </div>
          </Card>
        </Col>

        {/* Pending actions */}
        <Col xs={24} lg={10}>
          <Card
            title="Cần xử lý ngay"
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
          >
            {/* Payouts chờ duyệt */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: (stats?.pending_actions.payouts_waiting ?? 0) > 0 ? '#fff7ed' : '#f8fafc',
                borderRadius: 10,
                border: (stats?.pending_actions.payouts_waiting ?? 0) > 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <DollarOutlined style={{ fontSize: 18, color: '#d97706' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Giải ngân Payout</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Chờ Admin phê duyệt chuyển khoản</p>
                </div>
              </div>
              <Badge
                count={stats?.pending_actions.payouts_waiting ?? 0}
                style={{ backgroundColor: '#d97706' }}
                showZero
              />
            </div>

            {/* Claims KYC chờ duyệt */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: (stats?.pending_actions.claims_waiting ?? 0) > 0 ? '#f0fdf4' : '#f8fafc',
                borderRadius: 10,
                border: (stats?.pending_actions.claims_waiting ?? 0) > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <SafetyCertificateOutlined style={{ fontSize: 18, color: '#059669' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Xác thực KYC Chính Chủ</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Trust Score 70-99: chờ duyệt thủ công</p>
                </div>
              </div>
              <Badge
                count={stats?.pending_actions.claims_waiting ?? 0}
                style={{ backgroundColor: '#059669' }}
                showZero
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="Tổng cần xử lý"
                value={(stats?.pending_actions.payouts_waiting ?? 0) + (stats?.pending_actions.claims_waiting ?? 0)}
                valueStyle={{ color: '#7c3aed', fontSize: 28 }}
                suffix="việc"
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}