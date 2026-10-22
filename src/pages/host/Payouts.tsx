import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Table,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Alert,
  Empty,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  SendOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { hostService } from '../../services/hostService';
import type { HostBalanceInfo } from '../../types/host';

const { Title, Text } = Typography;

export default function HostPayoutsPage() {
  const [balance, setBalance] = useState<HostBalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setHistoryLoading(true);
    try {
      const [balRes, histRes] = await Promise.allSettled([
        hostService.getBalance(),
        hostService.getPayoutHistory(),
      ]);

      if (balRes.status === 'fulfilled' && balRes.value) {
        const raw: any = balRes.value;
        const actualBalance: HostBalanceInfo = raw?.data?.data ?? raw?.data ?? raw;
        setBalance(actualBalance);
      }

      if (histRes.status === 'fulfilled' && histRes.value) {
        const raw: any = histRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data?.data ?? raw?.data ?? [];
        setHistory(Array.isArray(list) ? list : []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  const handleRequestPayout = async (values: any) => {
    setRequesting(true);
    try {
      await hostService.requestPayout(undefined, values.note);
      message.success('Đã gửi yêu cầu giải ngân thành công! Ban Quản trị sàn sẽ đối soát và chuyển khoản.');
      setPayoutModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.message || 'Gửi yêu cầu giải ngân thất bại');
    } finally {
      setRequesting(false);
    }
  };

  const eligibleColumns = [
    {
      title: 'Mã Đơn Đặt Phòng',
      dataIndex: 'booking_code',
      key: 'booking_code',
      render: (code: string) => <strong style={{ color: '#4f46e5' }}>{code}</strong>,
    },
    { title: 'Chỗ Nghỉ Homestay', dataIndex: 'homestay_name', key: 'homestay_name' },
    { title: 'Loại Phòng', dataIndex: 'room_name', key: 'room_name' },
    {
      title: 'Doanh Thu Đơn',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#10b981' }}>
          {Number(amount).toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Trạng Thái Ký Quỹ',
      key: 'status',
      render: () => (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          Đã qua 24h Check-in (Khả dụng)
        </Tag>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Mã Lệnh Rút',
      key: 'payout_code',
      render: (_: any, r: any) => (
        <div>
          <strong style={{ color: '#4f46e5' }}>{r.payout_code || `PO-${r.id}`}</strong>
          {r.booking_code && r.booking_code !== 'N/A' && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Đơn: {r.booking_code}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Chỗ Nghỉ / Phòng',
      key: 'homestay',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.homestay_name && r.homestay_name !== 'N/A' ? r.homestay_name : 'Toàn bộ số dư'}</div>
          {r.room_name && r.room_name !== 'N/A' && <div style={{ fontSize: 12, color: '#64748b' }}>{r.room_name}</div>}
        </div>
      ),
    },
    {
      title: 'Ngày Yêu Cầu',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) =>
        v
          ? new Date(v).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A',
    },
    {
      title: 'Doanh Thu Gộp',
      dataIndex: 'gross_amount',
      key: 'gross_amount',
      render: (v: number) => `${Number(v || 0).toLocaleString('vi-VN')}đ`,
    },
    {
      title: 'Hoa Hồng Sàn (7.5%)',
      dataIndex: 'commission',
      key: 'commission',
      render: (v: number) => (
        <span style={{ color: '#ef4444' }}>
          -{Number(v || 0).toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Thực Nhận (Net Payout)',
      dataIndex: 'net_amount',
      key: 'net_amount',
      render: (amount: number) => (
        <strong style={{ color: '#10b981', fontSize: 15 }}>
          +{Number(amount || 0).toLocaleString('vi-VN')}đ
        </strong>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'PAID_OUT') return <Tag color="success">✓ Đã chuyển khoản</Tag>;
        if (status === 'APPROVED') return <Tag color="processing">✓ Đã duyệt (Đang chuyển)</Tag>;
        if (status === 'PENDING') return <Tag color="warning" icon={<ClockCircleOutlined />}>Chờ Admin đối soát</Tag>;
        if (status === 'REJECTED') return <Tag color="error">Đã từ chối</Tag>;
        return <Tag>{status}</Tag>;
      },
    },
  ];

  const availableNet = balance?.available_net_payout ?? 0;
  const availableGross = balance?.available_gross ?? 0;
  const platformFee = balance?.platform_commission ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Doanh Thu &amp; Rút Tiền Ký Quỹ Escrow</Title>
          <Text type="secondary">
            Bảo chứng dòng tiền Escrow 24 giờ sau Check-in, khấu trừ minh bạch hoa hồng sàn 7.5% (chỉ bằng một nửa Booking.com 15%)
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          disabled={availableNet <= 0}
          onClick={() => setPayoutModalOpen(true)}
          style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600, height: 42 }}
        >
          Yêu Cầu Giải Ngân (Rút Tiền)
        </Button>
      </div>

      {/* STATS OVERVIEW */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Doanh thu gộp đủ điều kiện"
              value={availableGross}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Phí hoa hồng sàn StayAI"
              value={platformFee}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
              suffix="đ (-7.5%)"
              prefix={<PercentageOutlined style={{ color: '#f59e0b' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, border: '2px solid #10b981', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ color: '#065f46', fontWeight: 600 }}>Thực nhận khả dụng (Net Payout)</span>}
              value={availableNet}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
              suffix="đ"
              prefix={<WalletOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#059669', fontWeight: 800 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Tổng đã giải ngân về STK"
              value={balance?.total_paid_out ?? 0}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
              suffix="đ"
              prefix={<CheckCircleOutlined style={{ color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* DANH SÁCH ĐƠN KHẢ DỤNG */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Các Đơn Đặt Phòng Đã Đủ Điều Kiện Giải Ngân (Sau 24h Check-in)</span>
            <Tag color="green">{balance?.eligible_bookings?.length || 0} đơn</Tag>
          </div>
        }
        style={{ borderRadius: 14, marginBottom: 24 }}
      >
        <Table
          dataSource={balance?.eligible_bookings || []}
          columns={eligibleColumns}
          rowKey="id"
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20'],
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          size="middle"
          loading={loading}
        />
      </Card>

      {/* BẢNG LỊCH SỬ RÚT TIỀN */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Lịch Sử Các Đợt Giải Ngân Về Tài Khoản Ngân Hàng</span>
            <Tag color="blue">{history.length} giao dịch</Tag>
          </div>
        }
        style={{ borderRadius: 14 }}
      >
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          loading={historyLoading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có lịch sử giải ngân nào. Khi bạn tạo yêu cầu rút tiền và Admin chuyển khoản, các đợt giải ngân thực tế sẽ hiển thị tại đây."
              />
            ),
          }}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20'],
            showTotal: (total) => `Tổng ${total} giao dịch`,
          }}
        />
      </Card>

      {/* MODAL YÊU CẦU GIẢI NGÂN */}
      <Modal
        title="Tạo Lệnh Yêu Cầu Giải Ngân (Rút Tiền)"
        open={payoutModalOpen}
        onCancel={() => setPayoutModalOpen(false)}
        footer={null}
        width={560}
      >
        <Alert
          type="info"
          showIcon
          message="Chính sách bảo chứng dòng tiền Escrow 24h & Maker-Checker"
          description="Sàn StayAI giữ tiền của khách và giải ngân toàn bộ sau 24h kể từ khi khách Check-in. Số tiền thực nhận sẽ được chuyển khoản trực tiếp vào STK ngân hàng chính chủ đã xác minh eKYC của bạn."
          style={{ marginBottom: 20 }}
        />

        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text type="secondary">Doanh thu gộp các đơn:</Text>
            <Text strong>{availableGross.toLocaleString('vi-VN')} VNĐ</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text type="secondary">Khấu trừ hoa hồng sàn (7.5%):</Text>
            <Text strong style={{ color: '#ef4444' }}>-{platformFee.toLocaleString('vi-VN')} VNĐ</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
            <Text strong style={{ fontSize: 16 }}>Số tiền thực chuyển (Net):</Text>
            <Text strong style={{ fontSize: 20, color: '#10b981' }}>
              {availableNet.toLocaleString('vi-VN')} VNĐ
            </Text>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleRequestPayout}>
          <Form.Item label="Ghi chú cho Ban Quản trị sàn (Tùy chọn)" name="note">
            <Input.TextArea rows={3} placeholder="Ví dụ: Rút đợt tiền phòng tuần 3 tháng 10..." />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={requesting}
            style={{ background: '#10b981', height: 44, fontWeight: 600 }}
          >
            Xác Nhận Tạo Lệnh Rút Tiền
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
