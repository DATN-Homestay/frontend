import { useState } from 'react';
import { Card, Table, Tag, Button, Typography, Modal, Rate, Input, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, StarOutlined } from '@ant-design/icons';
import type { CustomerBooking } from '../../types/customer';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function MyTripsPage() {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Mock list of trips
  const trips: CustomerBooking[] = [
    {
      id: '1',
      booking_code: 'BK202610168392',
      room_name: 'Phòng Deluxe Hướng Đồi',
      homestay_name: 'Mây Homestay Đà Lạt',
      check_in_date: '2026-10-20',
      check_out_date: '2026-10-22',
      num_guests: 2,
      total_amount: 1300000,
      status: 'PAID_ESCROW',
      created_at: '2026-10-16',
    },
    {
      id: '2',
      booking_code: 'BK202609012391',
      room_name: 'Bungalow View Rừng Thông',
      homestay_name: 'Pine Hill Retreat Sapa',
      check_in_date: '2026-09-10',
      check_out_date: '2026-09-12',
      num_guests: 2,
      total_amount: 1800000,
      status: 'COMPLETED',
      created_at: '2026-09-05',
    },
  ];

  const handleOpenReview = (booking: CustomerBooking) => {
    setSelectedBooking(booking);
    setReviewModalOpen(true);
  };

  const handleSendReview = () => {
    message.success('Đã gửi đánh giá thành công! Cảm ơn bạn đã chia sẻ.');
    setReviewModalOpen(false);
    setComment('');
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'booking_code',
      key: 'booking_code',
      render: (code: string) => <strong>{code}</strong>,
    },
    {
      title: 'Homestay & Phòng',
      key: 'homestay',
      render: (_: any, record: CustomerBooking) => (
        <div>
          <Text strong>{record.homestay_name}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{record.room_name}</Text>
        </div>
      ),
    },
    {
      title: 'Thời gian lưu trú',
      key: 'dates',
      render: (_: any, record: CustomerBooking) => (
        <span>{record.check_in_date} ➔ {record.check_out_date}</span>
      ),
    },
    {
      title: 'Tổng tiền',
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
        if (status === 'COMPLETED') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Đã hoàn thành</Tag>;
        }
        return <Tag>{status}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: CustomerBooking) => {
        if (record.status === 'COMPLETED') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<StarOutlined />}
              onClick={() => handleOpenReview(record)}
            >
              Đánh giá
            </Button>
          );
        }
        return <Button size="small">Chi tiết</Button>;
      },
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 20 }}>Chuyến đi của tôi</Title>

      <Card style={{ borderRadius: 14, overflow: 'hidden' }}>
        <Table
          dataSource={trips}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} chuyến đi`,
          }}
        />
      </Card>

      <Modal
        title={`Đánh giá kỳ nghỉ tại ${selectedBooking?.homestay_name}`}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        onOk={handleSendReview}
        okText="Gửi đánh giá"
        cancelText="Hủy"
      >
        <div style={{ padding: '12px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Số sao đánh giá</Text>
          <Rate value={rating} onChange={setRating} style={{ color: '#f59e0b', fontSize: 24, marginBottom: 16 }} />

          <Text strong style={{ display: 'block', marginBottom: 8 }}>Nhận xét chi tiết</Text>
          <TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Chia sẻ trải nghiệm về độ sạch sẽ, thái độ chủ nhà, không gian và tiện nghi..."
          />
        </div>
      </Modal>
    </div>
  );
}
