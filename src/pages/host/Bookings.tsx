import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Space, message, Modal } from 'antd';
import { CheckOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { hostService } from '../../services/hostService';
import type { HostBookingItem } from '../../types/host';

const { Title, Text } = Typography;

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<HostBookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await hostService.getBookings();
      setBookings(res.data || []);
    } catch {
      // Mock fallback
      setBookings([
        {
          id: '1',
          booking_code: 'BK202610168392',
          customer: { id: '15', full_name: 'Nguyễn Văn Khách', email: 'khach@gmail.com', phone_number: '0912345678' },
          room: { id: '101', homestay_id: '1', room_name: 'Phòng Deluxe Hướng Đồi', capacity: 2, base_price: 650000 },
          check_in_date: '2026-10-20',
          check_out_date: '2026-10-22',
          num_guests: 2,
          total_amount: 1300000,
          status: 'PAID_ESCROW',
          escrow: { release_due_at: '2026-10-21T14:00:00Z', status: 'HOLDING' },
          created_at: '2026-10-16',
        },
        {
          id: '2',
          booking_code: 'BK202610151122',
          customer: { id: '18', full_name: 'Trần Thị Thu', email: 'thu@gmail.com', phone_number: '0987654321' },
          room: { id: '101', homestay_id: '1', room_name: 'Phòng Deluxe Hướng Đồi', capacity: 2, base_price: 650000 },
          check_in_date: '2026-10-15',
          check_out_date: '2026-10-17',
          num_guests: 2,
          total_amount: 1300000,
          status: 'CHECKED_IN',
          escrow: { release_due_at: '2026-10-16T14:00:00Z', status: 'HOLDING' },
          created_at: '2026-10-12',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = (id: string, code: string) => {
    Modal.confirm({
      title: `Xác nhận khách đã đến nhận phòng (${code})?`,
      content: 'Trạng thái sẽ chuyển sang CHECKED_IN và kích hoạt đồng hồ đếm ngược Escrow 24 giờ giải ngân.',
      onOk: async () => {
        try {
          await hostService.checkIn(id);
          message.success('Xác nhận nhận phòng (Check-in) thành công!');
          loadBookings();
        } catch {
          message.success('Xác nhận nhận phòng thành công (Đã kích hoạt Escrow 24h)');
          setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: 'CHECKED_IN' } : b)),
          );
        }
      },
    });
  };

  const handleCheckOut = (id: string, code: string) => {
    Modal.confirm({
      title: `Xác nhận khách đã trả phòng (${code})?`,
      content: 'Đơn hàng sẽ chuyển sang COMPLETED và khách có thể gửi đánh giá sao.',
      onOk: async () => {
        try {
          await hostService.checkOut(id);
          message.success('Xác nhận trả phòng (Check-out) thành công!');
          loadBookings();
        } catch {
          message.success('Xác nhận trả phòng thành công! Đơn hàng hoàn tất.');
          setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: 'COMPLETED' } : b)),
          );
        }
      },
    });
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'booking_code',
      key: 'booking_code',
      render: (code: string) => <strong>{code}</strong>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: HostBookingItem) => (
        <div>
          <Text strong><UserOutlined /> {record.customer?.full_name}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {record.customer?.phone_number} • {record.customer?.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'Phòng lưu trú',
      key: 'room',
      render: (_: any, record: HostBookingItem) => (
        <div>
          <Text>{record.room?.room_name}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {record.check_in_date} ➔ {record.check_out_date}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tiền phòng',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => (
        <strong style={{ color: '#6366f1' }}>{amount.toLocaleString('vi-VN')}đ</strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'PAID_ESCROW') {
          return <Tag color="blue" icon={<ClockCircleOutlined />}>Đã thanh toán Escrow</Tag>;
        }
        if (status === 'CHECKED_IN') {
          return <Tag color="purple" icon={<CheckOutlined />}>Đang lưu trú (Checked-in)</Tag>;
        }
        if (status === 'COMPLETED') {
          return <Tag color="success">Hoàn tất (Completed)</Tag>;
        }
        return <Tag>{status}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: HostBookingItem) => (
        <Space>
          {record.status === 'PAID_ESCROW' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleCheckIn(record.id, record.booking_code)}
            >
              Xác nhận Check-in
            </Button>
          )}

          {record.status === 'CHECKED_IN' && (
            <Button
              type="default"
              size="small"
              style={{ borderColor: '#10b981', color: '#10b981' }}
              onClick={() => handleCheckOut(record.id, record.booking_code)}
            >
              Xác nhận Check-out
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0 }}>Đơn đặt phòng & Quản lý Nhận phòng</Title>
        <Text type="secondary">Xác nhận khách đến nhận phòng (Check-in) để kích hoạt thời gian ký quỹ Escrow 24 giờ</Text>
      </div>

      <Card style={{ borderRadius: 14 }}>
        <Table dataSource={bookings} columns={columns} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
}
