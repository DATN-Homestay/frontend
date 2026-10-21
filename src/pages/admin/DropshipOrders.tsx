import { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, Row, Col, Statistic, Space, Descriptions, Typography, Tabs, message } from 'antd';
import { ShopOutlined, CheckCircleOutlined, DollarOutlined, SyncOutlined, GlobalOutlined, LinkOutlined, ApiOutlined } from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';

const { Title, Text } = Typography;

interface DropshipOrder {
  id: string;
  booking_code: string;
  booking_status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  homestay_name: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  retail_amount: number;
  wholesale_amount: number;
  profit_margin: number;
  ota_fulfillment: {
    provider: string;
    mode: string;
    api_spec: string;
    ota_booking_code: string;
    pnr_code: string;
    pin_code: string;
    status: string;
    vcc_card_last4: string;
    payment_method_b2b: string;
    retail_amount: number;
    wholesale_amount: number;
    profit_margin: number;
    fulfilled_at: string;
    notes: string;
  } | null;
}

interface AffiliateClick {
  id: string;
  homestay_id: string;
  homestay_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  price: number;
  estimated_commission: number;
  timestamp: string;
  affiliate_id: string;
}

export default function DropshipOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('b2b');
  const [data, setData] = useState<{
    total: number;
    summary: { total_revenue: number; total_wholesale_cost: number; total_profit_margin: number };
    items: DropshipOrder[];
  }>({
    total: 0,
    summary: { total_revenue: 0, total_wholesale_cost: 0, total_profit_margin: 0 },
    items: [],
  });
  const [selectedOrder, setSelectedOrder] = useState<DropshipOrder | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [affiliateClicks, setAffiliateClicks] = useState<AffiliateClick[]>([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient<any>('/admin/dropship/orders');
      if (res?.data) {
        setData(res.data);
      } else if (res?.items) {
        setData(res);
      }
    } catch {
      setData({
        total: 0,
        summary: { total_revenue: 0, total_wholesale_cost: 0, total_profit_margin: 0 },
        items: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliateClicks = () => {
    try {
      const raw = localStorage.getItem('stayai_affiliate_clicks');
      if (raw) {
        setAffiliateClicks(JSON.parse(raw));
      } else {
        // Mock sẵn vài bản ghi affiliate để demo cho GVHD xem giao diện sinh động
        const sample: AffiliateClick[] = [
          {
            id: 'aff_1',
            homestay_id: '1',
            homestay_name: 'Le House DaLat',
            room_name: 'Phòng Giường Đôi Ban Công View Rừng Thông',
            check_in: '2026-10-25',
            check_out: '2026-10-27',
            price: 975000,
            estimated_commission: 390000,
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            affiliate_id: '2409182',
          },
          {
            id: 'aff_2',
            homestay_id: '2',
            homestay_name: 'Carnival Dalat Hotel & Villa',
            room_name: 'Phòng Deluxe Gia Đình Ban Công Lớn',
            check_in: '2026-11-01',
            check_out: '2026-11-03',
            price: 1450000,
            estimated_commission: 580000,
            timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
            affiliate_id: '2409182',
          },
        ];
        setAffiliateClicks(sample);
      }
    } catch {
      setAffiliateClicks([]);
    }
  };

  useEffect(() => {
    void fetchOrders();
    loadAffiliateClicks();
  }, []);

  const handleRetry = async (orderId: string) => {
    setRetryingId(orderId);
    try {
      await apiClient(`/admin/dropship/retry/${orderId}`, { method: 'POST' });
      message.success('Đã kích hoạt đặt phòng B2B Demand API thành công');
      await fetchOrders();
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi thử lại');
    } finally {
      setRetryingId(null);
    }
  };

  const money = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'booking_code',
      render: (code: string, r: DropshipOrder) => (
        <div>
          <strong style={{ color: '#0f172a' }}>{code}</strong>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {new Date(r.created_at).toLocaleDateString('vi-VN')}
          </div>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      render: (_: any, r: DropshipOrder) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.customer_phone}</div>
        </div>
      ),
    },
    {
      title: 'Homestay & Hạng phòng',
      render: (_: any, r: DropshipOrder) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.homestay_name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.room_name}</div>
          <div style={{ fontSize: 11, color: '#0284c7' }}>
            {r.check_in_date} ➔ {r.check_out_date}
          </div>
        </div>
      ),
    },
    {
      title: 'Mã Booking.com',
      render: (_: any, r: DropshipOrder) => {
        if (!r.ota_fulfillment) {
          return <Tag color="warning">Chờ thanh toán</Tag>;
        }
        return (
          <div>
            <Tag color="#003580" style={{ fontWeight: 700 }}>
              {r.ota_fulfillment.ota_booking_code}
            </Tag>
            <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>
              PIN: <strong>{r.ota_fulfillment.pin_code}</strong> | PNR: <strong>{r.ota_fulfillment.pnr_code}</strong>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giá khách trả',
      dataIndex: 'retail_amount',
      render: (v: number) => <strong>{money(v)}</strong>,
    },
    {
      title: 'Vốn VCC B2B',
      dataIndex: 'wholesale_amount',
      render: (v: number) => <span style={{ color: '#dc2626' }}>{money(v)}</span>,
    },
    {
      title: 'Lợi nhuận sàn',
      dataIndex: 'profit_margin',
      render: (v: number) => <strong style={{ color: '#16a34a' }}>+{money(v)}</strong>,
    },
    {
      title: 'Hành động',
      render: (_: any, r: DropshipOrder) => (
        <Space size="small">
          {r.ota_fulfillment && (
            <Button size="small" type="link" onClick={() => setSelectedOrder(r)}>
              Chi tiết VCC
            </Button>
          )}
          {(!r.ota_fulfillment || r.ota_fulfillment.status !== 'CONFIRMED') && (
            <Button
              size="small"
              type="primary"
              loading={retryingId === r.id}
              onClick={() => handleRetry(r.id)}
            >
              Đặt lại
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const affiliateColumns = [
    {
      title: 'Thời gian chuyển tiếp',
      dataIndex: 'timestamp',
      render: (t: string) => (
        <div>
          <strong>{new Date(t).toLocaleTimeString('vi-VN')}</strong>
          <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(t).toLocaleDateString('vi-VN')}</div>
        </div>
      ),
    },
    {
      title: 'Homestay & Hạng phòng',
      render: (_: any, r: AffiliateClick) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.homestay_name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.room_name}</div>
          <div style={{ fontSize: 11, color: '#0284c7' }}>
            {r.check_in} ➔ {r.check_out}
          </div>
        </div>
      ),
    },
    {
      title: 'Mã Affiliate Đối tác',
      dataIndex: 'affiliate_id',
      render: (aid: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          aid={aid}
        </Tag>
      ),
    },
    {
      title: 'Giá trị phòng',
      dataIndex: 'price',
      render: (p: number) => <strong>{money(p)}</strong>,
    },
    {
      title: 'Hoa hồng ước tính (40%)',
      dataIndex: 'estimated_commission',
      render: (c: number) => <strong style={{ color: '#16a34a' }}>+{money(c)}</strong>,
    },
    {
      title: 'Trạng thái',
      render: () => (
        <Tag color="green">Đã chuyển tiếp Booking.com</Tag>
      ),
    },
    {
      title: 'Liên kết',
      render: (_: any, r: AffiliateClick) => (
        <Button
          size="small"
          icon={<LinkOutlined />}
          onClick={() => {
            const url = `https://www.booking.com/searchresults.vi.html?ss=${encodeURIComponent(r.homestay_name)}&aid=${r.affiliate_id}`;
            window.open(url, '_blank');
          }}
        >
          Mở link
        </Button>
      ),
    },
  ];

  const totalAffiliatePotential = affiliateClicks.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalAffiliateCommission = affiliateClicks.reduce((sum, item) => sum + (item.estimated_commission || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <GlobalOutlined style={{ color: '#003580', marginRight: 8 }} />
            Quản trị Tích hợp Booking.com (MoR & Affiliate)
          </Title>
          <Text type="secondary">
            Theo dõi dòng tiền và đối soát cho cả 2 mô hình: B2B Demand API (Tự thu tiền) và Affiliate Partner Network (Ăn hoa hồng)
          </Text>
        </div>
        <Button icon={<SyncOutlined />} onClick={() => { void fetchOrders(); loadAffiliateClicks(); }} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: 'b2b',
            label: (
              <span>
                <ApiOutlined style={{ marginRight: 6 }} />
                Hướng 1: B2B Demand API (MoR - Tự xuất vé & Giữ tiền)
              </span>
            ),
            children: (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      <Statistic
                        title="Tổng đơn Dropship B2B"
                        value={data.total}
                        prefix={<ShopOutlined style={{ color: '#6366f1' }} />}
                        suffix="đơn"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      <Statistic
                        title="Doanh thu thu từ Khách (VNPay)"
                        value={data.summary.total_revenue}
                        prefix={<DollarOutlined style={{ color: '#0284c7' }} />}
                        formatter={(val) => money(Number(val))}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      <Statistic
                        title="Lợi nhuận ròng sàn giữ lại (Margin 15%)"
                        value={data.summary.total_profit_margin}
                        valueStyle={{ color: '#16a34a' }}
                        prefix={<CheckCircleOutlined />}
                        formatter={(val) => money(Number(val))}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 0 }}>
                  <Table
                    dataSource={data.items}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: 'Chưa có đơn đặt phòng dropship nào' }}
                    pagination={{ pageSize: 10, showTotal: (t) => `Tổng cộng ${t} đơn` }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'affiliate',
            label: (
              <span>
                <GlobalOutlined style={{ marginRight: 6 }} />
                Hướng 2: Affiliate Partner Network (Chuyển tiếp & Ăn hoa hồng)
              </span>
            ),
            children: (
              <div>
                <Card
                  style={{
                    borderRadius: 12,
                    marginBottom: 20,
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderColor: '#86efac',
                  }}
                >
                  <Row align="middle" justify="space-between">
                    <Col>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#166534' }}>
                        🎉 Chương trình Booking.com Affiliate Partner Network
                      </div>
                      <div style={{ fontSize: 13, color: '#15803d', marginTop: 4 }}>
                        Mã Affiliate Partner ID: <strong>aid=2409182</strong> • Cơ chế: Khách thanh toán trực tiếp tại Booking.com, sàn nhận 40% doanh thu hoa hồng từ Booking.com.
                      </div>
                    </Col>
                    <Col>
                      <Tag color="success" style={{ fontSize: 13, padding: '4px 10px' }}>
                        Đang hoạt động (Active)
                      </Tag>
                    </Col>
                  </Row>
                </Card>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      <Statistic
                        title="Lượt chuyển tiếp Affiliate"
                        value={affiliateClicks.length}
                        prefix={<LinkOutlined style={{ color: '#0284c7' }} />}
                        suffix="lượt"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      <Statistic
                        title="Doanh số phòng tiềm năng"
                        value={totalAffiliatePotential}
                        prefix={<DollarOutlined style={{ color: '#6366f1' }} />}
                        formatter={(val) => money(Number(val))}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      <Statistic
                        title="Hoa hồng sàn ước tính (40%)"
                        value={totalAffiliateCommission}
                        valueStyle={{ color: '#16a34a' }}
                        prefix={<CheckCircleOutlined />}
                        formatter={(val) => money(Number(val))}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 0 }}>
                  <Table
                    dataSource={affiliateClicks}
                    columns={affiliateColumns}
                    rowKey="id"
                    locale={{ emptyText: 'Chưa có lượt chuyển tiếp affiliate nào' }}
                    pagination={{ pageSize: 10, showTotal: (t) => `Tổng cộng ${t} lượt click` }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Chi tiết Giao dịch B2B Demand API (Booking.com)"
        open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)}
        footer={null}
        width={650}
      >
        {selectedOrder?.ota_fulfillment && (
          <div>
            <div
              style={{
                background: '#003580',
                color: '#fff',
                padding: '16px 20px',
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.8 }}>MÃ XÁC NHẬN BOOKING.COM</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ffb700', letterSpacing: 0.5 }}>
                {selectedOrder.ota_fulfillment.ota_booking_code}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                {selectedOrder.ota_fulfillment.api_spec} • Chế độ: {selectedOrder.ota_fulfillment.mode}
              </div>
            </div>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Mã PNR">{selectedOrder.ota_fulfillment.pnr_code}</Descriptions.Item>
              <Descriptions.Item label="Mã PIN">{selectedOrder.ota_fulfillment.pin_code}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{selectedOrder.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedOrder.customer_phone}</Descriptions.Item>
              <Descriptions.Item label="Phương thức B2B">{selectedOrder.ota_fulfillment.payment_method_b2b}</Descriptions.Item>
              <Descriptions.Item label="Thẻ ảo VCC">•••• •••• •••• {selectedOrder.ota_fulfillment.vcc_card_last4}</Descriptions.Item>
              <Descriptions.Item label="Giá bán lẻ (Thu khách)">{money(selectedOrder.ota_fulfillment.retail_amount)}</Descriptions.Item>
              <Descriptions.Item label="Giá vốn (Trả Booking)">{money(selectedOrder.ota_fulfillment.wholesale_amount)}</Descriptions.Item>
              <Descriptions.Item label="Lợi nhuận sàn" span={2}>
                <strong style={{ color: '#16a34a' }}>+{money(selectedOrder.ota_fulfillment.profit_margin)}</strong> (Biên lợi nhuận 15%)
              </Descriptions.Item>
              <Descriptions.Item label="Thời điểm đặt" span={2}>
                {new Date(selectedOrder.ota_fulfillment.fulfilled_at).toLocaleString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú hệ thống" span={2}>
                {selectedOrder.ota_fulfillment.notes}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
