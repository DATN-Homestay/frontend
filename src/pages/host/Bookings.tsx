import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Select,
  Row,
  Col,
  message,
  Modal,
  Input,
} from 'antd';
import {
  CheckOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { hostService } from '../../services/hostService';
import type { HostBookingItem, HostHomestay } from '../../types/host';

const { Title, Text, Paragraph } = Typography;

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<HostBookingItem[]>([]);
  const [homestays, setHomestays] = useState<HostHomestay[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedHomestayId, setSelectedHomestayId] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [listingsRes, bookingsRes] = await Promise.allSettled([
        hostService.getMyListings(),
        hostService.getBookings(),
      ]);

      if (listingsRes.status === 'fulfilled') {
        const val = listingsRes.value;
        const list = Array.isArray(val) ? val : (val as any)?.data || [];
        setHomestays(list);
      }
      if (bookingsRes.status === 'fulfilled') {
        const bVal = bookingsRes.value;
        const bList = Array.isArray(bVal) ? bVal : (bVal as any)?.data || [];
        setBookings(bList);
      }
    } catch {
      setHomestays([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await hostService.getBookings({
        homestay_id: selectedHomestayId,
        status: selectedStatus,
      });
      const bList = Array.isArray(res) ? res : (res as any)?.data || [];
      setBookings(bList);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận khách đã đến nhận phòng thực tế (Check-in)
  const handleCheckIn = (id: string, code: string) => {
    Modal.confirm({
      title: `Xác nhận khách đã nhận phòng (#${code})?`,
      content: (
        <div>
          <Paragraph>
            Khi bạn xác nhận Check-in, trạng thái đơn sẽ chuyển sang <strong>CHECKED_IN</strong>.
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            ⏱️ Hệ thống Escrow Ký quỹ sẽ <strong>kích hoạt đồng hồ đếm ngược 24 giờ</strong>. Sau 24h nếu khách không khiếu nại, tiền phòng sẽ được tự động giải ngân vào số dư của bạn.
          </Paragraph>
        </div>
      ),
      okText: 'Xác Nhận Check-in',
      cancelText: 'Hủy',
      okButtonProps: { style: { background: '#10b981' } },
      onOk: async () => {
        try {
          await hostService.checkIn(id);
          message.success(`Đã xác nhận Check-in thành công cho đơn #${code}!`);
          loadBookings();
        } catch (err: any) {
          message.error(err.message || 'Lỗi khi xác nhận check-in');
        }
      },
    });
  };

  // Xác nhận khách đã trả phòng (Check-out)
  const handleCheckOut = (id: string, code: string) => {
    Modal.confirm({
      title: `Xác nhận khách đã trả phòng (#${code})?`,
      content: (
        <div>
          <Paragraph>
            Đơn hàng sẽ chuyển sang trạng thái <strong>COMPLETED (Hoàn tất)</strong>. Phòng sẽ sẵn sàng đón khách tiếp theo và khách hàng có thể gửi đánh giá sao.
          </Paragraph>
        </div>
      ),
      okText: 'Xác Nhận Check-out',
      cancelText: 'Hủy',
      okButtonProps: { style: { background: '#6366f1' } },
      onOk: async () => {
        try {
          await hostService.checkOut(id);
          message.success(`Đã xác nhận Check-out thành công cho đơn #${code}!`);
          loadBookings();
        } catch (err: any) {
          message.error(err.message || 'Lỗi khi xác nhận check-out');
        }
      },
    });
  };

  // Lọc dữ liệu theo text tìm kiếm
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const filteredBookings = safeBookings.filter((b) => {
    if (!searchText) return true;
    const term = searchText.toLowerCase();
    return (
      (b.booking_code && b.booking_code.toLowerCase().includes(term)) ||
      (b.customer?.full_name && b.customer.full_name.toLowerCase().includes(term)) ||
      (b.customer?.phone_number && b.customer.phone_number.includes(term)) ||
      (b.room?.room_name && b.room.room_name.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      title: 'Mã Đơn & Ngày Đặt',
      dataIndex: 'booking_code',
      key: 'booking_code',
      render: (code: string, record: HostBookingItem) => (
        <div>
          <Text strong style={{ color: '#4f46e5', fontSize: 15 }}>{code}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {dayjs(record.created_at).format('DD/MM/YYYY HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Khách Hàng',
      key: 'customer',
      render: (_: any, record: HostBookingItem) => (
        <div>
          <Text strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserOutlined /> {record.customer?.full_name || 'Khách du lịch'}
          </Text>
          {record.customer?.phone_number && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              <PhoneOutlined /> {record.customer.phone_number}
            </Text>
          )}
          {record.customer?.email && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              <MailOutlined /> {record.customer.email}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Chỗ Nghỉ & Loại Phòng',
      key: 'room',
      render: (_: any, record: HostBookingItem) => (
        <div>
          <Text strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HomeOutlined /> {record.room?.homestay?.name || 'Homestay của bạn'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Phòng: {record.room?.room_name || 'Phòng Deluxe'} ({record.num_guests} khách)
          </Text>
        </div>
      ),
    },
    {
      title: 'Lịch Lưu Trú',
      key: 'stay_dates',
      render: (_: any, record: HostBookingItem) => {
        const inDate = dayjs(record.check_in_date);
        const outDate = dayjs(record.check_out_date);
        const nights = outDate.diff(inDate, 'day') || 1;
        return (
          <div>
            <Text strong>
              {inDate.format('DD/MM/YYYY')} ➔ {outDate.format('DD/MM/YYYY')}
            </Text>
            <Tag color="purple" style={{ display: 'block', width: 'fit-content', marginTop: 4 }}>
              {nights} đêm
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Tiền Phòng (VNPay)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => (
        <div>
          <Text strong style={{ color: '#10b981', fontSize: 15 }}>
            {Number(amount).toLocaleString('vi-VN')} VNĐ
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            Đã thanh toán Escrow
          </Text>
        </div>
      ),
    },
    {
      title: 'Trạng Thái & Bảo Chứng Escrow',
      key: 'status',
      render: (_: any, record: HostBookingItem) => {
        const status = record.status;
        return (
          <div>
            {status === 'PAID_ESCROW' && (
              <Tag color="cyan" icon={<ClockCircleOutlined />} style={{ padding: '4px 8px', fontSize: 12 }}>
                Chờ Check-in (Ký quỹ)
              </Tag>
            )}
            {status === 'CHECKED_IN' && (
              <Tag color="processing" icon={<CheckOutlined />} style={{ padding: '4px 8px', fontSize: 12 }}>
                Đang ở (Escrow 24h)
              </Tag>
            )}
            {status === 'COMPLETED' && (
              <Tag color="success" style={{ padding: '4px 8px', fontSize: 12 }}>
                ✓ Đã hoàn tất
              </Tag>
            )}
            {status === 'CANCELLED' && (
              <Tag color="error" style={{ padding: '4px 8px', fontSize: 12 }}>
                Đã hủy
              </Tag>
            )}

            {record.escrow?.release_due_at && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                🛡️ Giải ngân: {dayjs(record.escrow.release_due_at).format('DD/MM HH:mm')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: HostBookingItem) => {
        if (record.status === 'PAID_ESCROW') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleCheckIn(record.id, record.booking_code)}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              Check-in
            </Button>
          );
        }
        if (record.status === 'CHECKED_IN') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => handleCheckOut(record.id, record.booking_code)}
              style={{ background: '#6366f1', borderColor: '#6366f1' }}
            >
              Check-out
            </Button>
          );
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>Hoàn thành</Text>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Đơn Đặt Phòng &amp; Check-in / Check-out</Title>
          <Text type="secondary">
            Quản lý vòng đời lưu trú, xác nhận khách đến nhận phòng và kích hoạt bộ đếm giải ngân Escrow 24 giờ
          </Text>
        </div>
        <Button onClick={loadInitialData} loading={loading}>
          Làm mới danh sách
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card style={{ borderRadius: 14, marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Lọc theo Homestay</Text>
            <Select
              allowClear
              placeholder="Tất cả Chỗ nghỉ Homestay"
              style={{ width: '100%' }}
              value={selectedHomestayId}
              onChange={(val) => setSelectedHomestayId(val)}
              options={(Array.isArray(homestays) ? homestays : []).map((h) => ({ label: h.name, value: h.id }))}
            />
          </Col>

          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Trạng thái đơn hàng</Text>
            <Select
              allowClear
              placeholder="Tất cả trạng thái"
              style={{ width: '100%' }}
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              options={[
                { label: 'Chờ nhận phòng (PAID_ESCROW)', value: 'PAID_ESCROW' },
                { label: 'Đang lưu trú (CHECKED_IN)', value: 'CHECKED_IN' },
                { label: 'Đã hoàn tất (COMPLETED)', value: 'COMPLETED' },
                { label: 'Đã hủy (CANCELLED)', value: 'CANCELLED' },
              ]}
            />
          </Col>

          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Tìm kiếm nhanh</Text>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* TABLE */}
      <Card style={{ borderRadius: 14 }}>
        <Table
          dataSource={filteredBookings}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
}
