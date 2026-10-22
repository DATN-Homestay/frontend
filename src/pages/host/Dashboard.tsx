import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Button, Space, Table, Spin, Empty, Avatar } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hostService } from '../../services/hostService';
import type { HostDashboardStats, HostBalanceInfo, HostBookingItem } from '../../types/host';

const { Title, Text, Paragraph } = Typography;

export default function HostDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HostDashboardStats | null>(null);
  const [balance, setBalance] = useState<HostBalanceInfo | null>(null);
  const [recentBookings, setRecentBookings] = useState<HostBookingItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, balanceRes, bookingsRes] = await Promise.allSettled([
        hostService.getDashboardStats(),
        hostService.getBalance(),
        hostService.getBookings(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const raw: any = statsRes.value;
        const actualStats: HostDashboardStats = raw?.data?.data ?? raw?.data ?? raw;
        setStats(actualStats);
      }
      if (balanceRes.status === 'fulfilled' && balanceRes.value) {
        const raw: any = balanceRes.value;
        const actualBalance: HostBalanceInfo = raw?.data?.data ?? raw?.data ?? raw;
        setBalance(actualBalance);
      }
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
                  value={stats?.totalHomestays ?? 0}
                  suffix={<span>chỗ nghỉ ({stats?.totalRooms ?? 0} phòng)</span>}
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
                  value={`${stats?.verifiedCount ?? 0}/${stats?.totalHomestays || 1}`}
                  suffix="đã duyệt"
                  prefix={<SafetyCertificateOutlined style={{ color: '#8b5cf6' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* QUICK ACTIONS & AI NOTIFICATION */}
          <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={16}>
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

            <Col xs={24} lg={8}>
              <Card
                title="Định Giá Động AI (Gợi ý)"
                extra={<Button type="link" onClick={() => navigate('/host/pricing')}>Lịch giá</Button>}
                style={{ borderRadius: 14 }}
              >
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
                    <Tag color="purple">Phòng Deluxe Hướng Đồi</Tag>
                    <Tag color="green">+18% Cuối tuần</Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0' }}>
                    <Text delete type="secondary" style={{ fontSize: 14 }}>
                      700.000đ
                    </Text>
                    <Text strong style={{ color: '#4f46e5', fontSize: 20 }}>
                      826.000đ
                    </Text>
                  </div>
                  <Paragraph style={{ margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
                    Tìm thấy 10 chỗ nghỉ tương tự trong bán kính 3-5km đang đạt tỷ lệ kín phòng 85%. AI đề xuất tăng giá để tối ưu hóa doanh thu cuối tuần.
                  </Paragraph>
                </div>

                <Button
                  type="primary"
                  block
                  onClick={() => navigate('/host/pricing')}
                  icon={<ArrowRightOutlined />}
                  style={{ background: '#4f46e5', height: 40 }}
                >
                  Mở Trình Quản Lý Giá AI
                </Button>
              </Card>
            </Col>
          </Row>

          {/* HOMESTAYS LIST SECTION */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HomeOutlined style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: 16 }}>Chỗ Nghỉ Của Bạn</span>
                <Tag color="purple">{stats?.totalHomestays ?? 0} chỗ nghỉ</Tag>
              </div>
            }
            extra={
              <Button type="link" onClick={() => navigate('/host/listings')}>
                Quản lý chi tiết &gt;
              </Button>
            }
            style={{ borderRadius: 14, marginBottom: 24 }}
          >
            {(!stats?.homestays || stats.homestays.length === 0) ? (
              <Empty
                description="Bạn chưa có chỗ nghỉ nào. Hãy bấm nút '+ Đăng Homestay mới' để bắt đầu kinh doanh!"
                style={{ padding: '24px 0' }}
              />
            ) : (
              <Table
                dataSource={stats.homestays}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Chỗ Nghỉ & Địa Chỉ',
                    key: 'name',
                    render: (_: any, r) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar
                          shape="square"
                          size={46}
                          src={r.cover_image}
                          icon={<HomeOutlined />}
                          style={{ backgroundColor: '#e2e8f0', borderRadius: 8, flexShrink: 0 }}
                        />
                        <div>
                          <Text strong style={{ fontSize: 14 }}>{r.name}</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            📍 {r.address}, {r.city}
                          </Text>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Số Loại Phòng',
                    dataIndex: 'rooms_count',
                    key: 'rooms_count',
                    render: (cnt: number) => <Tag color="geekblue">{cnt} phòng</Tag>,
                  },
                  {
                    title: 'Đánh Giá',
                    key: 'rating',
                    render: (_: any, r) => (
                      <span>
                        <strong style={{ color: '#f59e0b' }}>⭐ {Number(r.average_rating || 5.0).toFixed(1)}</strong>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}> ({r.total_reviews || 0})</span>
                      </span>
                    ),
                  },
                  {
                    title: 'Xác Thực eKYC',
                    key: 'is_claimed',
                    render: (_: any, r) =>
                      r.is_claimed === 1 ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>Chính chủ</Tag>
                      ) : (
                        <Tag color="warning">Chưa eKYC</Tag>
                      ),
                  },
                  {
                    title: 'Thao Tác',
                    key: 'action',
                    render: () => (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => navigate('/host/listings')}
                      >
                        Quản lý &gt;
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
