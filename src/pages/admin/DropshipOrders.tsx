import {
  Table,
  Tag,
  Button,
  Space,
  Alert,
  Typography,
  Tooltip,
  Badge,
  Modal,
  message,
} from 'antd';
import {
  ReloadOutlined,
  GlobalOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminService, type DropshipOrder } from '../../services/adminService';

const { Text, Paragraph } = Typography;

const B2B_STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING:         { color: 'warning',  icon: <ClockCircleOutlined />,    label: 'Đang chờ' },
  BOOKED:          { color: 'success',  icon: <CheckCircleOutlined />,    label: 'Đã đặt B2B' },
  FAILED:          { color: 'error',    icon: <CloseCircleOutlined />,    label: 'Thất bại' },
  CANCELLED:       { color: 'default',  icon: <CloseCircleOutlined />,    label: 'Đã hủy' },
  NOT_APPLICABLE:  { color: 'default',  icon: <ExclamationCircleOutlined />, label: 'N/A' },
};

export default function DropshipOrdersPage() {
  const [data, setData] = useState<DropshipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getDropshipOrders();
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải danh sách đơn dropship');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = (bookingId: string) => {
    Modal.confirm({
      title: 'Thử lại đặt phòng B2B?',
      content: (
        <Paragraph>
          Hệ thống sẽ gọi lại <strong>Booking.com Demand API</strong> để đặt phòng cho booking{' '}
          <Text code>#{bookingId}</Text>. Tiếp tục?
        </Paragraph>
      ),
      icon: <SyncOutlined style={{ color: '#6366f1' }} />,
      okText: 'Thử lại',
      cancelText: 'Hủy',
      onOk: async () => {
        setRetrying(bookingId);
        try {
          await adminService.retryDropshipOrder(bookingId);
          message.success(`✅ Đã gửi yêu cầu retry cho Booking #${bookingId}`);
          loadData();
        } catch (err: any) {
          message.error(err.message ?? 'Retry thất bại');
        } finally {
          setRetrying(null);
        }
      },
    });
  };

  const failedCount = data.filter((d) => d.b2b_status === 'FAILED').length;
  const bookedCount = data.filter((d) => d.b2b_status === 'BOOKED').length;
  const pendingCount = data.filter((d) => d.b2b_status === 'PENDING').length;

  const columns = [
    {
      title: 'Booking ID',
      dataIndex: 'booking_id',
      width: 100,
      render: (v: string) => <Text code>#{v}</Text>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer_name',
      render: (v: string | null) => <Text strong>{v ?? '—'}</Text>,
    },
    {
      title: 'Homestay',
      dataIndex: 'homestay_name',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Nhận phòng',
      dataIndex: 'check_in',
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Trả phòng',
      dataIndex: 'check_out',
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      render: (v: number) => (
        <Text style={{ color: '#059669', fontWeight: 600 }}>
          {Number(v).toLocaleString('vi-VN')} ₫
        </Text>
      ),
    },
    {
      title: 'B2B Status',
      dataIndex: 'b2b_status',
      render: (s: string) => {
        const cfg = B2B_STATUS_CONFIG[s] ?? { color: 'default', icon: null, label: s };
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: 'Provider Booking ID',
      dataIndex: 'b2b_provider_booking_id',
      render: (v: string | null) =>
        v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Lỗi',
      dataIndex: 'b2b_error_message',
      width: 200,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <Text type="danger" style={{ fontSize: 12 }}>
              {v.length > 40 ? v.substring(0, 40) + '...' : v}
            </Text>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: 'Lần thử cuối',
      dataIndex: 'b2b_last_attempt_at',
      render: (v: string | null) =>
        v ? new Date(v).toLocaleString('vi-VN') : '—',
    },
    {
      title: 'Hành động',
      render: (_: any, record: DropshipOrder) =>
        record.b2b_status === 'FAILED' ? (
          <Button
            size="small"
            type="primary"
            icon={<SyncOutlined />}
            loading={retrying === record.booking_id}
            onClick={() => handleRetry(record.booking_id)}
            style={{ background: '#6366f1', borderColor: '#6366f1' }}
          >
            Retry
          </Button>
        ) : (
          <Tag color="default" style={{ margin: 0 }}>
            {record.b2b_status === 'BOOKED' ? '✓ Hoàn tất' : '—'}
          </Tag>
        ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <GlobalOutlined style={{ fontSize: 20, color: '#6366f1' }} />
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
              Quản lý đơn Dropship B2B
            </h2>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Các đơn đặt phòng tự động qua Booking.com Demand API (MoR – Merchant of Record)
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ClockCircleOutlined style={{ color: '#d97706' }} />
          <span style={{ fontWeight: 600, color: '#92400e' }}>Đang chờ: {pendingCount}</span>
        </div>
        <div
          style={{
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            borderRadius: 10,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircleOutlined style={{ color: '#059669' }} />
          <span style={{ fontWeight: 600, color: '#065f46' }}>Đã đặt B2B: {bookedCount}</span>
        </div>
        <div
          style={{
            background: failedCount > 0 ? '#fee2e2' : '#f1f5f9',
            border: `1px solid ${failedCount > 0 ? '#fecaca' : '#e2e8f0'}`,
            borderRadius: 10,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Badge count={failedCount} size="small" style={{ backgroundColor: '#ef4444' }}>
            <CloseCircleOutlined style={{ color: failedCount > 0 ? '#dc2626' : '#94a3b8', marginRight: 4 }} />
          </Badge>
          <span style={{ fontWeight: 600, color: failedCount > 0 ? '#7f1d1d' : '#64748b' }}>
            Thất bại: {failedCount}
          </span>
        </div>
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

      {failedCount > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={`${failedCount} đơn dropship thất bại — cần xử lý`}
          description="Nhấn nút Retry ở cột Hành động để gửi lại yêu cầu đặt phòng B2B với Booking.com Demand API."
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Table
          rowKey="booking_id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ position: ['bottomCenter'], pageSize: 10, showTotal: (t) => `Tổng ${t} đơn` }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Không có đơn dropship nào' }}
          rowClassName={(r) =>
            r.b2b_status === 'FAILED' ? 'ant-table-row-danger' : ''
          }
        />
      </Space>
    </div>
  );
}
