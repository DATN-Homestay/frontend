import { Table, Tag, Button, Space, Image, message, Modal, Card, Row, Col, Select, Typography, Alert } from 'antd';
import { useEffect, useState } from 'react';
import { CloudDownloadOutlined, CheckCircleOutlined, GlobalOutlined, RocketOutlined } from '@ant-design/icons';
import { adminApi } from '../../services/adminMock';
import type { HomestayPending } from '../../types/admin';

const { Title, Text, Paragraph } = Typography;

const TOURIST_CITIES = [
  { label: '🌲 Đà Lạt (Lâm Đồng)', value: 'Đà Lạt' },
  { label: '🏮 Hội An (Quảng Nam)', value: 'Hội An' },
  { label: '🏛️ Hà Nội (Thủ Đô)', value: 'Hà Nội' },
  { label: '🏔️ Sa Pa (Lào Cai)', value: 'Sa Pa' },
  { label: '🌉 Đà Nẵng (Thành phố biển)', value: 'Đà Nẵng' },
  { label: '🏝️ Phú Quốc (Kiên Giang)', value: 'Phú Quốc' },
  { label: '🏖️ Vũng Tàu (Bà Rịa - Vũng Tàu)', value: 'Vũng Tàu' },
  { label: '🌊 Nha Trang (Khánh Hòa)', value: 'Nha Trang' },
];

export default function HomestaysPage() {
  const [data, setData] = useState<HomestayPending[]>([]);
  const [loading, setLoading] = useState(true);

  // RapidAPI Crawler State
  const [selectedCity, setSelectedCity] = useState('Đà Lạt');
  const [limitCount, setLimitCount] = useState(10);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<any | null>(null);

  useEffect(() => {
    adminApi.getPendingHomestays().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const handleCrawlBooking = async () => {
    setCrawling(true);
    setCrawlResult(null);
    try {
      const res = await adminApi.crawlBookingHomestays(selectedCity, limitCount);
      setCrawlResult(res);
      message.success(`✓ Đã cào và lưu thành công ${res.total_saved} homestay tại ${selectedCity} vào CSDL MySQL!`);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi cào dữ liệu từ RapidAPI Booking.com');
    } finally {
      setCrawling(false);
    }
  };

  const handleApprove = (id: number) => {
    Modal.confirm({
      title: 'Xác nhận duyệt Homestay?',
      content: 'Homestay sẽ được hiển thị công khai trên hệ thống.',
      onOk: () => {
        setData((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'APPROVED' } : h)));
        message.success(`Đã duyệt Homestay #${id}`);
      },
    });
  };

  const handleReject = (id: number) => {
    Modal.confirm({
      title: 'Từ chối Homestay?',
      content: 'Vui lòng nhập lý do từ chối ở bước tiếp theo.',
      okType: 'danger',
      onOk: () => {
        setData((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'REJECTED' } : h)));
        message.success(`Đã từ chối Homestay #${id}`);
      },
    });
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'thumbnail',
      render: (url: string) => <Image src={url} width={80} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />,
    },
    { title: 'Tên Homestay', dataIndex: 'title' },
    { title: 'Host', dataIndex: 'hostName' },
    { title: 'Thành phố', dataIndex: 'city' },
    { title: 'Loại hình', dataIndex: 'propertyType' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: string) => {
        const color = s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';
        return <Tag color={color}>{s}</Tag>;
      },
    },
    { title: 'Ngày đăng ký', dataIndex: 'createdAt' },
    {
      title: 'Hành động',
      render: (_: any, record: HomestayPending) =>
        record.status === 'PENDING' ? (
          <Space>
            <Button type="primary" size="small" onClick={() => handleApprove(record.id)}>Duyệt</Button>
            <Button danger size="small" onClick={() => handleReject(record.id)}>Từ chối</Button>
          </Space>
        ) : (
          <Tag>Đã xử lý</Tag>
        ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý &amp; Thu Thập Dữ Liệu Homestay</Title>
        <Text type="secondary">Phê duyệt chỗ nghỉ đăng ký mới và tự động cào dữ liệu homestay từ Booking.com qua RapidAPI</Text>
      </div>

      {/* RAPIDAPI BOOKING.COM CRAWLER ENGINE */}
      <Card
        style={{
          borderRadius: 14,
          marginBottom: 24,
          border: '1px solid #c7d2fe',
          background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)',
        }}
      >
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} lg={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <GlobalOutlined style={{ fontSize: 24, color: '#4f46e5' }} />
              <Title level={4} style={{ margin: 0, color: '#312e81' }}>
                Thu Thập Dữ Liệu Tự Động từ Booking.com (RapidAPI Engine)
              </Title>
              <Tag color="purple">2-Tier Architecture</Tag>
            </div>
            <Paragraph style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>
              Cào thông tin homestay tĩnh (tên, địa chỉ, kinh độ, vĩ độ, album ảnh, tiện nghi) và dữ liệu động (giá phòng)
              lưu trực tiếp vào CSDL MySQL Aiven Cloud ở trạng thái <strong>UNCLAIMED</strong> (Chờ chủ nhà xác thực chính chủ).
            </Paragraph>

            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Thành Phố Cần Cào Dữ Liệu:</Text>
                <Select
                  style={{ width: '100%' }}
                  size="large"
                  value={selectedCity}
                  onChange={(val) => setSelectedCity(val)}
                  options={TOURIST_CITIES}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Số Lượng:</Text>
                <Select
                  style={{ width: '100%' }}
                  size="large"
                  value={limitCount}
                  onChange={(val) => setLimitCount(val)}
                  options={[
                    { label: '5 chỗ nghỉ', value: 5 },
                    { label: '10 chỗ nghỉ', value: 10 },
                    { label: '20 chỗ nghỉ', value: 20 },
                  ]}
                />
              </Col>
              <Col xs={24} sm={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  size="large"
                  loading={crawling}
                  onClick={handleCrawlBooking}
                  block
                  style={{ background: '#4f46e5', height: 40, fontWeight: 600 }}
                >
                  Bắt Đầu Cào
                </Button>
              </Col>
            </Row>
          </Col>

          <Col xs={24} lg={10}>
            <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>Cấu hình RapidAPI Gateway:</Text>
                <Tag color="cyan">booking-com15</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                Đọc khóa bảo mật từ file <code>backend/.env</code> (<code>RAPIDAPI_KEY</code>). Nếu chưa điền key, hệ thống tự động kích hoạt bộ cào thực địa mẫu chất lượng cao.
              </Text>

              {crawlResult && (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message={`Đã nạp ${crawlResult.total_saved} homestay tại ${crawlResult.city}`}
                  description={
                    <div style={{ fontSize: 12 }}>
                      <div>Nguồn dữ liệu: <strong>{crawlResult.source === 'RAPIDAPI_LIVE' ? 'API Booking.com Trực Tiếp' : 'Thư viện Dữ liệu Thực địa Chuẩn'}</strong></div>
                      <div>Số phòng &amp; album ảnh đã khởi tạo: <strong>{crawlResult.total_rooms_created} phòng</strong></div>
                    </div>
                  }
                />
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* DANH SÁCH HOMESTAY PENDING */}
      <Card title="Danh Sách Homestay Đăng Ký Chờ Phê Duyệt" style={{ borderRadius: 14 }}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />
      </Card>
    </div>
  );
}