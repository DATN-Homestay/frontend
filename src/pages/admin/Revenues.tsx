import { Card, Col, Row, Statistic, Table, Tag, Spin, Alert, Button } from 'antd';
import { DollarOutlined, RiseOutlined, ReloadOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminService, type DashboardStats } from '../../services/adminService';

function formatVnd(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ ₫`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} triệu ₫`;
  return amount.toLocaleString('vi-VN') + ' ₫';
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID_ESCROW: 'Đã thanh toán',
  CHECKED_IN: 'Đang lưu trú',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  DISPUTED: 'Khiếu nại',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'warning',
  PAID_ESCROW: 'blue',
  CHECKED_IN: 'purple',
  COMPLETED: 'success',
  CANCELLED: 'error',
  EXPIRED: 'default',
  DISPUTED: 'orange',
};

export default function RevenuesPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải dữ liệu doanh thu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" tip="Đang tải dữ liệu doanh thu..." />
      </div>
    );
  }

  const bookingRows = Object.entries(stats?.bookings?.by_status ?? {}).map(
    ([status, count], idx) => ({
      key: idx,
      status,
      count: count as number,
    })
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
          Doanh thu &amp; Hoa hồng
        </h2>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Làm mới
        </Button>
      </div>

      {error && (
        <Alert
          type="warning"
          message="Không thể kết nối backend"
          description={error}
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* METRIC CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card styles={{ body: { padding: '20px 24px' } }} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Doanh thu đã xác nhận (hệ thống)"
              value={stats?.revenue.total_confirmed_vnd ?? 0}
              formatter={(v) => formatVnd(Number(v))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#059669', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card styles={{ body: { padding: '20px 24px' } }} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Hoa hồng sàn thu được (7.5%)"
              value={stats?.revenue.platform_commission_vnd ?? 0}
              formatter={(v) => formatVnd(Number(v))}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#7c3aed', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card styles={{ body: { padding: '20px 24px' } }} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Tổng đơn đặt phòng"
              value={stats?.bookings.total ?? 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1e40af', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* BOOKING BY STATUS TABLE */}
      <Card
        title="Phân bổ Booking theo Trạng thái"
        style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
      >
        <Table
          dataSource={bookingRows}
          pagination={false}
          size="middle"
          columns={[
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (s: string) => (
                <Tag color={STATUS_COLOR[s] ?? 'default'}>
                  {STATUS_LABEL[s] ?? s}
                </Tag>
              ),
            },
            {
              title: 'Số lượng đơn',
              dataIndex: 'count',
              render: (v: number) => <strong>{v.toLocaleString()}</strong>,
            },
            {
              title: 'Tỷ lệ',
              render: (_: any, r: { count: number }) => {
                const total = stats?.bookings.total ?? 1;
                const pct = total > 0 ? ((r.count / total) * 100).toFixed(1) : '0';
                return `${pct}%`;
              },
            },
          ]}
          locale={{ emptyText: 'Chưa có dữ liệu booking' }}
        />
      </Card>
    </div>
  );
}