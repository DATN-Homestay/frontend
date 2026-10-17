import { Card, Row, Col, Statistic, Typography, Tag, Button, Space } from 'antd';
import { HomeOutlined, CalendarOutlined, DollarOutlined, SafetyCertificateOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export default function HostDashboardPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Bảng điều khiển Chủ nhà</Title>
          <Text type="secondary">Theo dõi kinh doanh, lịch phòng và gợi ý giá thông minh từ AI</Text>
        </div>
        <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/host/listings')}>
          Thêm Chỗ nghỉ mới
        </Button>
      </div>

      {/* STATS OVERVIEW */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng Homestay sở hữu"
              value={3}
              prefix={<HomeOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Đơn đặt phòng đang hoạt động"
              value={5}
              prefix={<CalendarOutlined style={{ color: '#3b82f6' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Doanh thu khả dụng rút tiền"
              value="18,500,000"
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#10b981' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Trạng thái Xác thực eKYC"
              value="140/140"
              suffix="đ"
              prefix={<SafetyCertificateOutlined style={{ color: '#8b5cf6' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* QUICK ACTIONS & AI NOTIFICATION */}
      <Row gutter={[20, 20]}>
        <Col xs={24} md={16}>
          <Card
            title="Định giá Động AI (Gợi ý hôm nay)"
            extra={<Button type="link" onClick={() => navigate('/host/pricing')}>Xem tất cả lịch giá</Button>}
            style={{ borderRadius: 14 }}
          >
            <div
              style={{
                background: '#f5f3ff',
                padding: 18,
                borderRadius: 12,
                border: '1px solid #ddd6fe',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  <Tag color="purple">Phòng Deluxe Hướng Đồi</Tag>
                  <Tag color="green">+18% Cuối tuần</Tag>
                </Space>
                <Text strong style={{ color: '#6366f1', fontSize: 18 }}>
                  700.000đ ➔ 826.000đ
                </Text>
              </div>
              <Paragraph style={{ margin: 0, color: '#4b5563', fontSize: 13 }}>
                Tìm thấy 10 chỗ nghỉ tương tự trong bán kính 3-5km đang đạt tỷ lệ kín phòng 85%. AI đề xuất tăng giá để tối ưu hóa doanh thu cuối tuần.
              </Paragraph>
            </div>

            <Button type="primary" onClick={() => navigate('/host/pricing')} icon={<ArrowRightOutlined />}>
              Mở trang Lịch giá AI
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Xác thực 4 lớp Chính chủ" style={{ borderRadius: 14 }}>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Homestay được xác thực chính chủ sẽ nhận huy hiệu Xanh uy tín, tăng tỷ lệ khách đặt phòng lên gấp 3 lần và được ưu tiên giải ngân Escrow nhanh chóng.
            </Paragraph>
            <Button block type="dashed" onClick={() => navigate('/host/verification')}>
              Kiểm tra trạng thái eKYC
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
