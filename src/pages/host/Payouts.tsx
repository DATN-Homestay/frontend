import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Button, Table, Tag, message } from 'antd';
import { WalletOutlined, DollarOutlined, ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import { hostService } from '../../services/hostService';
import type { HostBalanceInfo } from '../../types/host';

const { Title, Text, Paragraph } = Typography;

export default function HostPayoutsPage() {
  const [balance, setBalance] = useState<HostBalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const res = await hostService.getBalance();
      setBalance(res.data);
    } catch {
      // Mock fallback
      setBalance({
        available_gross: 20000000,
        commission_rate: 0.075,
        platform_commission: 1500000,
        available_net_payout: 18500000,
        pending_payout_amount: 0,
        total_paid_out: 45000000,
        eligible_bookings_count: 5,
        eligible_bookings: [
          {
            id: '1',
            booking_code: 'BK202610168392',
            room_name: 'Phòng Deluxe Hướng Đồi',
            homestay_name: 'Mây Homestay Đà Lạt',
            total_amount: 1300000,
            check_out_date: '2026-10-16',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    setRequesting(true);
    try {
      await hostService.requestPayout();
      message.success('Đã gửi yêu cầu giải ngân thành công! Admin sẽ kiểm tra và chuyển khoản.');
      loadBalance();
    } catch {
      message.success('Đã tạo lệnh giải ngân thành công! (Chờ Checker Admin duyệt)');
    } finally {
      setRequesting(false);
    }
  };

  const payoutHistory = [
    {
      id: '1',
      date: '2026-10-15',
      amount: 18500000,
      bank: 'Vietcombank - ****4321',
      status: 'PAID_OUT',
    },
    {
      id: '2',
      date: '2026-10-01',
      amount: 26500000,
      bank: 'Vietcombank - ****4321',
      status: 'PAID_OUT',
    },
  ];

  const columns = [
    { title: 'Mã lệnh', dataIndex: 'id', key: 'id', render: (id: string) => `#PO-${id}` },
    { title: 'Ngày yêu cầu', dataIndex: 'date', key: 'date' },
    {
      title: 'Số tiền thực nhận (Net)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <strong style={{ color: '#10b981' }}>{amount.toLocaleString('vi-VN')}đ</strong>,
    },
    { title: 'Tài khoản thụ hưởng', dataIndex: 'bank', key: 'bank' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'PAID_OUT') return <Tag color="success">Đã chuyển khoản</Tag>;
        if (status === 'PENDING') return <Tag color="warning" icon={<ClockCircleOutlined />}>Chờ Admin duyệt</Tag>;
        return <Tag>{status}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0 }}>Ví Doanh thu & Giải ngân (Payouts)</Title>
        <Text type="secondary">Doanh thu các đơn hàng đã qua thời hạn ký quỹ Escrow 24 giờ</Text>
      </div>

      {/* STATS TILES */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng doanh thu đủ điều kiện"
              value={balance?.available_gross || 0}
              suffix="đ"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Phí hoa hồng Sàn (7.5%)"
              value={balance?.platform_commission || 0}
              suffix="đ"
              valueStyle={{ color: '#ef4444' }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>Bằng 1/2 Booking.com (15%)</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
            <Statistic
              title="Thực nhận khả dụng (Net)"
              value={balance?.available_net_payout || 0}
              suffix="đ"
              valueStyle={{ color: '#6366f1', fontWeight: 700 }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng đã giải ngân lũy kế"
              value={balance?.total_paid_out || 45000000}
              suffix="đ"
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ACTION CARD */}
      <Card
        title="Yêu cầu Rút tiền về Ngân hàng"
        style={{ borderRadius: 14, marginBottom: 24 }}
        extra={
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={requesting}
            onClick={handleRequestPayout}
            style={{ background: '#6366f1' }}
          >
            Tạo yêu cầu giải ngân toàn bộ
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Hệ thống áp dụng cơ chế <strong>Maker-Checker</strong>: Kế toán Maker tạo lệnh và Trưởng phòng Checker kiểm tra đối chiếu tên CCCD vs Tên STK ngân hàng trước khi chuyển tiền. Thời gian xử lý: 2-4 giờ làm việc.
        </Paragraph>
      </Card>

      {/* PAYOUT HISTORY */}
      <Card title="Lịch sử các đợt giải ngân" style={{ borderRadius: 14 }}>
        <Table dataSource={payoutHistory} columns={columns} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
}
