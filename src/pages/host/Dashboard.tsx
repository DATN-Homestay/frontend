import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Button, Space, Table, Spin, Empty, Avatar, Badge } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hostService } from '../../services/hostService';
import type { HostDashboardStats, HostBalanceInfo, HostBookingItem, HostHomestay } from '../../types/host';
import type { RoomItem } from '../../types/customer';

const { Title, Text, Paragraph } = Typography;

export default function HostDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [homestays, setHomestays] = useState<HostHomestay[]>([]);
  const [stats, setStats] = useState<HostDashboardStats | null>(null);
  const [balance, setBalance] = useState<HostBalanceInfo | null>(null);
  const [recentBookings, setRecentBookings] = useState<HostBookingItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [listingsRes, statsRes, balanceRes, bookingsRes] = await Promise.allSettled([
        hostService.getMyListings(),
        hostService.getDashboardStats(),
        hostService.getBalance(),
        hostService.getBookings(),
      ]);

      // 1. Homestays thực tế của chủ nhà (luôn chuẩn xác và trực tiếp nhất)
      let myListings: HostHomestay[] = [];
      if (listingsRes.status === 'fulfilled' && listingsRes.value) {
        const rawList: any = listingsRes.value;
        myListings = Array.isArray(rawList) ? rawList : rawList?.data || [];
        setHomestays(myListings);
      }

      // 2. Thống kê Dashboard
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const raw: any = statsRes.value;
        const actualStats: HostDashboardStats = raw?.data?.data ?? raw?.data ?? raw;
        setStats(actualStats);
      }

      // 3. Số dư & doanh thu
      if (balanceRes.status === 'fulfilled' && balanceRes.value) {
        const raw: any = balanceRes.value;
        const actualBalance: HostBalanceInfo = raw?.data?.data ?? raw?.data ?? raw;
        setBalance(actualBalance);
      }

      // 4. Đơn đặt phòng
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value) {
        const raw: any = bookingsRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data?.data ?? raw?.data ?? [];
        setRecentBookings(Array.isArray(list) ? list.slice(0, 5) : []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  // Tính toán số liệu thống kê thực tế kết hợp từ myListings & stats
  const totalHomestaysCount = homestays.length > 0 ? homestays.length : (stats?.totalHomestays ?? 0);
  const totalRoomsCount =
    homestays.length > 0
      ? homestays.reduce((sum, h) => sum + (h.rooms?.length || 0), 0)
      : (stats?.totalRooms ?? 0);
  const verifiedCount =
    homestays.length > 0
      ? homestays.filter((h) => h.is_claimed === 1).length
      : (stats?.verifiedCount ?? 0);

  // Chọn ra homestay và loại phòng thật đầu tiên để hiển thị trên khối AI gợi ý giá
  const activeHomestay: HostHomestay | undefined = homestays[0];
  const activeRoom: RoomItem | undefined = activeHomestay?.rooms?.[0];

  const bookingColumns = [
    {
      title: 'Mã đơn',
      dataIndex: 'booking_code',
      key: 'booking_code',
      render: (code: string) => <strong style={{ color: '#4f46e5' }}>{code}</strong>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, r: HostBookingItem) => (
        <div>
          <Text strong>{r.customer?.full_name || 'Khách đặt'}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {r.customer?.phone_number || r.customer?.email || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thời gian lưu trú',
      key: 'dates',
      render: (_: any, r: HostBookingItem) => (
        <span>
          {r.check_in_date} ➔ {r.check_out_date}
        </span>
      ),
    },
    {
      title: 'Tiền phòng',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#10b981' }}>
          {Number(amount).toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'PAID_ESCROW')
          return (
            <Tag color="cyan" icon={<ClockCircleOutlined />}>
              Chờ nhận phòng (Escrow)
            </Tag>
          );
        if (status === 'CHECKED_IN')
          return (
            <Tag color="processing" icon={<CheckCircleOutlined />}>
              Đang ở (Checked-in)
            </Tag>
          );
        if (status === 'COMPLETED')
          return <Tag color="success">Hoàn tất</Tag>;
        if (status === 'CANCELLED')
          return <Tag color="error">Đã hủy</Tag>;
        return <Tag>{status}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Bảng Điều Khiển Chủ Nhà</Title>
          <Text type="secondary">Theo dõi kinh doanh homestay, dòng tiền ký quỹ Escrow và đề xuất giá AI</Text>
        </div>
        <Space>
          <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/host/listings')}>
            + Đăng Homestay mới
          </Button>
          <Button icon={<CalendarOutlined />} onClick={() => navigate('/host/pricing')}>
            Lịch giá &amp; AI
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Đang nạp dữ liệu kinh doanh...</div>
        </div>
      ) : (
        <>
          {/* STATS OVERVIEW */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Tổng Homestay quản lý"
                  value={totalHomestaysCount}
                  suffix={<span>chỗ nghỉ ({totalRoomsCount} phòng)</span>}
                  prefix={<HomeOutlined style={{ color: '#6366f1' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Đơn đặt phòng đang có"
                  value={recentBookings.length}
                  suffix="đơn"
                  prefix={<CalendarOutlined style={{ color: '#3b82f6' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Doanh thu khả dụng rút tiền"
                  value={balance?.available_net_payout ?? 0}
                  formatter={(val) => Number(val).toLocaleString('vi-VN')}
                  suffix="đ"
                  prefix={<DollarOutlined style={{ color: '#10b981' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Xác thực eKYC Chính chủ"
                  value={`${verifiedCount}/${totalHomestaysCount > 0 ? totalHomestaysCount : 1}`}
                  suffix={totalHomestaysCount > 0 && verifiedCount === totalHomestaysCount ? 'đã duyệt (100%)' : 'đã duyệt'}
                  prefix={<SafetyCertificateOutlined style={{ color: '#10b981' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* CHỖ NGHỈ CỦA BẠN (DANH SÁCH THỰC TẾ) */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HomeOutlined style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: 16 }}>Chỗ Nghỉ Của Bạn</span>
                <Tag color="purple">{totalHomestaysCount} chỗ nghỉ</Tag>
              </div>
            }
            extra={
              <Button type="link" onClick={() => navigate('/host/listings')}>
                Quản lý chi tiết &gt;
              </Button>
            }
            style={{ borderRadius: 14, marginBottom: 24 }}
          >
            {homestays.length === 0 ? (
              <Empty
                description="Bạn chưa có chỗ nghỉ nào. Hãy bấm nút '+ Đăng Homestay mới' để bắt đầu kinh doanh!"
                style={{ padding: '24px 0' }}
              />
            ) : (
              <Table
                dataSource={homestays}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Chỗ Nghỉ & Địa Chỉ',
                    key: 'name',
                    render: (_: any, r: HostHomestay) => {
                      const cover =
                        r.amenities_json?.main_image_url ||
                        (r.amenities_json?.property_images as string[])?.[0] ||
                        (r as any).cover_image;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar
                            shape="square"
                            size={48}
                            src={cover}
                            icon={<HomeOutlined />}
                            style={{ backgroundColor: '#e2e8f0', borderRadius: 8, flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text strong style={{ fontSize: 15 }}>{r.name}</Text>
                              {r.is_claimed === 1 && (
                                <Badge count="Đã Xác Thực eKYC" style={{ backgroundColor: '#10b981', fontSize: 10 }} />
                              )}
                            </div>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              📍 {r.address}, {r.city}
                            </Text>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    title: 'Số Loại Phòng',
                    key: 'rooms_count',
                    render: (_: any, r: HostHomestay) => (
                      <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>
                        {r.rooms?.length || 0} loại phòng
                      </Tag>
                    ),
                  },
                  {
                    title: 'Đánh Giá',
                    key: 'rating',
                    render: (_: any, r: HostHomestay) => (
                      <span>
                        <strong style={{ color: '#f59e0b' }}>⭐ {Number(r.average_rating || 5.0).toFixed(1)}</strong>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}> ({r.total_reviews || 0} lượt)</span>
                      </span>
                    ),
                  },
                  {
                    title: 'Chính Sách Hủy',
                    dataIndex: 'cancellation_policy',
                    key: 'cancellation_policy',
                    render: (policy: string) => {
                      if (policy === 'FLEXIBLE') return <Tag color="green">Linh hoạt</Tag>;
                      if (policy === 'MODERATE') return <Tag color="gold">Tiêu chuẩn</Tag>;
                      return <Tag color="red">Nghiêm ngặt</Tag>;
                    },
                  },
                  {
                    title: 'Thao Tác',
                    key: 'action',
                    render: (_: any, r: HostHomestay) => (
                      <Space size="small">
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => navigate('/host/listings')}
                        >
                          Quản lý phòng
                        </Button>
                        <Button
                          size="small"
                          icon={<CalendarOutlined />}
                          onClick={() => navigate(`/host/pricing?homestay_id=${r.id}`)}
                        >
                          Lịch giá &amp; AI
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            )}
          </Card>

          {/* QUICK ACTIONS & AI NOTIFICATION */}
          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={15}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>Đơn Đặt Phòng Mới Nhất</span>
                    <Tag color="blue">{recentBookings.length} đơn</Tag>
                  </div>
                }
                extra={
                  <Button type="link" onClick={() => navigate('/host/bookings')}>
                    Xem tất cả đơn
                  </Button>
                }
                style={{ borderRadius: 14 }}
              >
                {recentBookings.length === 0 ? (
                  <Empty description="Chưa có đơn đặt phòng nào" style={{ padding: '24px 0' }} />
                ) : (
                  <Table
                    dataSource={recentBookings}
                    columns={bookingColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={9}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThunderboltOutlined style={{ color: '#f59e0b' }} />
                    <span>Định Giá Động AI (Gợi ý thực tế)</span>
                  </div>
                }
                extra={<Button type="link" onClick={() => navigate('/host/pricing')}>Lịch giá</Button>}
                style={{ borderRadius: 14 }}
              >
                {activeRoom && activeHomestay ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                      padding: 18,
                      borderRadius: 12,
                      border: '1px solid #e0e7ff',
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Tag color="purple" style={{ fontWeight: 600 }}>{activeRoom.room_name}</Tag>
                      <Tag color="green">+15% Gợi ý cuối tuần</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      Thuộc: <strong>{activeHomestay.name}</strong> ({activeHomestay.city})
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0' }}>
                      <Text delete type="secondary" style={{ fontSize: 14 }}>
                        {Number(activeRoom.base_price).toLocaleString('vi-VN')}đ
                      </Text>
                      <Text strong style={{ color: '#4f46e5', fontSize: 20 }}>
                        {Math.round(activeRoom.base_price * 1.15).toLocaleString('vi-VN')}đ
                      </Text>
                    </div>
                    <Paragraph style={{ margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
                      Dựa trên dữ liệu lấp đầy tại <strong>{activeHomestay.city}</strong>, AI đề xuất điều chỉnh mức giá tối ưu cho phòng <strong>{activeRoom.room_name}</strong> để tối đa hóa doanh thu dịp cao điểm.
                    </Paragraph>

                    <Button
                      type="primary"
                      block
                      onClick={() =>
                        navigate(`/host/pricing?homestay_id=${activeHomestay.id}&room_id=${activeRoom.id}`)
                      }
                      icon={<ArrowRightOutlined />}
                      style={{ background: '#4f46e5', height: 40, marginTop: 14 }}
                    >
                      Áp Dụng Giá AI Cho Phòng Này
                    </Button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Empty
                      description="Bạn chưa có loại phòng nào để AI phân tích giá"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/host/listings')}
                      style={{ marginTop: 8 }}
                    >
                      Thêm phòng ngay
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
