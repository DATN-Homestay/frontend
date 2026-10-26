import {
  Table, Tag, Button, Space, Input, Select, Card, Row, Col,
  Statistic, Drawer, Descriptions, Badge, Typography, Tooltip,
  Popconfirm, Modal, Form, message, Image, Rate,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, HomeOutlined, DeleteOutlined,
  EditOutlined, CheckCircleOutlined, StopOutlined, UserAddOutlined,
  GlobalOutlined, RocketOutlined, CheckOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import type {
  AdminHomestayItem, AdminHomestayDetail, AdminListHomestaysQuery,
} from '../../services/adminService';
import { Alert } from 'antd';

const { Title, Text, Paragraph } = Typography;

const STATUS_OPTIONS = ['DRAFT', 'PENDING_VERIFICATION', 'ACTIVE', 'BANNED'];
const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: 'Nháp' },
  PENDING_VERIFICATION: { color: 'processing', label: 'Chờ duyệt' },
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  BANNED: { color: 'error', label: 'Bị cấm' },
};

const TOURIST_CITIES = [
  { label: '🌲 Đà Lạt', value: 'Đà Lạt' },
  { label: '🏮 Hội An', value: 'Hội An' },
  { label: '🏛️ Hà Nội', value: 'Hà Nội' },
  { label: '🏔️ Sa Pa', value: 'Sa Pa' },
  { label: '🌉 Đà Nẵng', value: 'Đà Nẵng' },
  { label: '🏝️ Phú Quốc', value: 'Phú Quốc' },
  { label: '🏖️ Vũng Tàu', value: 'Vũng Tàu' },
  { label: '🌊 Nha Trang', value: 'Nha Trang' },
];

export default function HomestaysPage() {
  const [data, setData] = useState<AdminHomestayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterCity, setFilterCity] = useState<string | undefined>();
  const [filterClaimed, setFilterClaimed] = useState<number | undefined>();

  // Drawer detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<AdminHomestayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal đổi trạng thái
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusForm] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal gán host
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignForm] = Form.useForm();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Crawler
  const [selectedCity, setSelectedCity] = useState('Đà Lạt');
  const [limitCount, setLimitCount] = useState(10);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<any | null>(null);

  // Stats
  const [totalCount, setTotalCount] = useState(0);

  const fetchHomestays = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query: AdminListHomestaysQuery = {
        page,
        limit: pagination.limit,
        search: searchText || undefined,
        status: filterStatus,
        city: filterCity,
        is_claimed: filterClaimed,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
      const res = await adminService.listHomestays(query);
      setData(res.items);
      setPagination((prev) => ({ ...prev, page: res.pagination.page, total: res.pagination.total }));
      if (page === 1 && !searchText && !filterStatus && !filterCity) {
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tải danh sách homestay');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, searchText, filterStatus, filterCity, filterClaimed]);

  useEffect(() => {
    fetchHomestays(1);
  }, [fetchHomestays]);

  const handleViewDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await adminService.getHomestayDetail(id);
      setDetailData(res);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tải chi tiết');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenStatusModal = (id: string, currentStatus: string) => {
    setEditingId(id);
    statusForm.setFieldsValue({ status: currentStatus, reason: '' });
    setStatusOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!editingId) return;
    try {
      const values = await statusForm.validateFields();
      setStatusLoading(true);
      await adminService.updateHomestayStatus(editingId, values.status, values.reason);
      message.success(`Đã cập nhật trạng thái thành ${STATUS_MAP[values.status]?.label}`);
      setStatusOpen(false);
      fetchHomestays(pagination.page);
    } catch (err: any) {
      if (err.message) message.error(err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenAssign = (id: string) => {
    setAssigningId(id);
    assignForm.resetFields();
    setAssignOpen(true);
  };

  const handleAssignHost = async () => {
    if (!assigningId) return;
    try {
      const values = await assignForm.validateFields();
      setAssignLoading(true);
      await adminService.assignHostToHomestay(assigningId, values.host_id);
      message.success('Gán host thành công!');
      setAssignOpen(false);
      fetchHomestays(pagination.page);
    } catch (err: any) {
      if (err.message) message.error(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteHomestay(id);
      message.success('Đã xóa homestay');
      fetchHomestays(pagination.page);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa homestay');
    }
  };

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlResult(null);
    try {
      const res = await adminService.crawlBookingHomestays(selectedCity, limitCount);
      setCrawlResult(res);
      message.success(`✓ Đã cào ${res.total_saved} homestay tại ${selectedCity}`);
      fetchHomestays(1);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi cào dữ liệu');
    } finally {
      setCrawling(false);
    }
  };

  const columns = [
    {
      title: 'Homestay',
      key: 'info',
      minWidth: 240,
      render: (_: any, record: AdminHomestayItem) => (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {record.cover_image ? (
            <Image
              src={record.cover_image}
              width={64} height={48}
              style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              preview={false}
            />
          ) : (
            <div style={{
              width: 64, height: 48, borderRadius: 6, background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <HomeOutlined style={{ color: '#94a3b8' }} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.city}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Host',
      key: 'host',
      render: (_: any, record: AdminHomestayItem) =>
        record.host_name ? (
          <div>
            <div style={{ fontSize: 13 }}>{record.host_name}</div>
            {record.is_claimed ? <Tag color="blue" style={{ fontSize: 10 }}>Chính chủ</Tag> : <Tag style={{ fontSize: 10 }}>Chưa nhận</Tag>}
          </div>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Phòng',
      dataIndex: 'rooms_count',
      render: (v: number) => <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#6366f1' : '#d9d9d9' }} />,
    },
    {
      title: 'Đánh giá',
      key: 'rating',
      render: (_: any, record: AdminHomestayItem) =>
        record.average_rating > 0 ? (
          <div>
            <Rate disabled defaultValue={Math.round(record.average_rating)} count={5} style={{ fontSize: 12 }} />
            <div style={{ fontSize: 11, color: '#64748b' }}>{(Number(record.average_rating) || 0).toFixed(1)} ({record.total_reviews})</div>
          </div>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => {
        const info = STATUS_MAP[status] ?? { color: 'default', label: status };
        return <Badge status={info.color as any} text={info.label} />;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 180,
      render: (_: any, record: AdminHomestayItem) => (
        <Space size={4}>
          <Tooltip title="Chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)} />
          </Tooltip>
          <Tooltip title="Đổi trạng thái">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenStatusModal(record.id, record.status)} />
          </Tooltip>
          <Tooltip title="Gán Host">
            <Button size="small" icon={<UserAddOutlined />} onClick={() => handleOpenAssign(record.id)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xác nhận xóa homestay?"
              description="Chỉ xóa được khi không có booking active"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <HomeOutlined style={{ marginRight: 8 }} />
          Quản lý Homestay
        </Title>
        <Text type="secondary">Quản lý toàn bộ homestay: duyệt, chỉnh sửa, gán host và thu thập dữ liệu từ Booking.com</Text>
      </div>

      {/* STATS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #6366f1' }}>
            <Statistic title="Tổng homestay" value={totalCount}
              prefix={<HomeOutlined />} valueStyle={{ color: '#6366f1', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #10b981' }}>
            <Statistic title="Đang hoạt động" value={data.filter(h => h.status === 'ACTIVE').length}
              prefix={<CheckCircleOutlined />} valueStyle={{ color: '#10b981', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
            <Statistic title="Đã xác nhận chủ" value={data.filter(h => h.is_claimed).length}
              prefix={<CheckOutlined />} valueStyle={{ color: '#3b82f6', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}>
            <Statistic title="Bị cấm" value={data.filter(h => h.status === 'BANNED').length}
              prefix={<StopOutlined />} valueStyle={{ color: '#ef4444', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* CRAWLER */}
      <Card
        style={{ borderRadius: 14, marginBottom: 20, border: '1px solid #c7d2fe', background: 'linear-gradient(180deg, #f8faff 0%, #fff 100%)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <GlobalOutlined style={{ fontSize: 20, color: '#4f46e5' }} />
          <Title level={5} style={{ margin: 0, color: '#312e81' }}>Thu Thập Dữ Liệu Tự Động từ Booking.com (RapidAPI)</Title>
          <Tag color="purple">2-Tier</Tag>
        </div>
        <Paragraph style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          Cào thông tin homestay (tên, địa chỉ, kinh độ, vĩ độ, ảnh, tiện nghi, giá phòng) và lưu vào CSDL ở trạng thái <strong>UNCLAIMED</strong>.
        </Paragraph>
        <Row gutter={12} align="bottom">
          <Col xs={24} sm={10}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Thành phố:</Text>
            <Select style={{ width: '100%' }} size="large" value={selectedCity}
              onChange={(v) => setSelectedCity(v)} options={TOURIST_CITIES} />
          </Col>
          <Col xs={12} sm={5}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Số lượng:</Text>
            <Select style={{ width: '100%' }} size="large" value={limitCount}
              onChange={(v) => setLimitCount(v)}
              options={[{ label: '5', value: 5 }, { label: '10', value: 10 }, { label: '20', value: 20 }]} />
          </Col>
          <Col xs={12} sm={5}>
            <Button type="primary" icon={<RocketOutlined />} size="large" loading={crawling}
              onClick={handleCrawl} block style={{ background: '#4f46e5', border: 'none', height: 40 }}>
              Bắt đầu cào
            </Button>
          </Col>
          {crawlResult && (
            <Col xs={24}>
              <Alert type="success" showIcon
                message={`Đã nạp ${crawlResult.total_saved} homestay tại ${crawlResult.city}`}
                description={`Nguồn: ${crawlResult.source === 'RAPIDAPI_LIVE' ? 'API Booking.com trực tiếp' : 'Dữ liệu mẫu chuẩn'} — ${crawlResult.total_rooms_created} phòng khởi tạo`}
                style={{ marginTop: 12 }}
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* FILTER */}
      <Card style={{ borderRadius: 14, marginBottom: 20 }}>
        <Space wrap>
          <Input
            placeholder="Tìm theo tên, địa chỉ, host"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 280 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => fetchHomestays(1)}
          />
          <Select placeholder="Trạng thái" allowClear style={{ width: 180 }}
            value={filterStatus} onChange={(v) => setFilterStatus(v)}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_MAP[s]?.label ?? s }))}
          />
          <Select placeholder="Thành phố" allowClear style={{ width: 160 }}
            value={filterCity} onChange={(v) => setFilterCity(v)}
            options={TOURIST_CITIES}
          />
          <Select placeholder="Chính chủ" allowClear style={{ width: 150 }}
            value={filterClaimed} onChange={(v) => setFilterClaimed(v)}
            options={[{ value: 1, label: 'Đã xác nhận' }, { value: 0, label: 'Chưa xác nhận' }]}
          />
          <Button type="primary" onClick={() => fetchHomestays(1)}>Lọc</Button>
        </Space>
      </Card>

      {/* TABLE */}
      <Card style={{ borderRadius: 14 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} homestay`,
            onChange: (p, size) => {
              setPagination((prev) => ({ ...prev, limit: size ?? 10 }));
              fetchHomestays(p);
            },
          }}
        />
      </Card>

      {/* DRAWER CHI TIẾT */}
      <Drawer
        title="Chi tiết Homestay"
        width={640}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); }}
        loading={detailLoading}
      >
        {detailData && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Tên" span={2}>{detailData.name}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detailData.address}</Descriptions.Item>
              <Descriptions.Item label="Thành phố">{detailData.city}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Badge status={(STATUS_MAP[detailData.status]?.color ?? 'default') as any}
                  text={STATUS_MAP[detailData.status]?.label ?? detailData.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Toạ độ">
                {detailData.latitude}, {detailData.longitude}
              </Descriptions.Item>
              <Descriptions.Item label="Chính chủ">
                {detailData.is_claimed ? <Tag color="blue">Đã xác nhận</Tag> : <Tag>Chưa nhận</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="SĐT crawl">{detailData.crawled_phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Đánh giá">
                ⭐ {detailData.average_rating.toFixed(1)} ({detailData.total_reviews} đánh giá)
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo" span={2}>
                {new Date(detailData.created_at).toLocaleString('vi-VN')}
              </Descriptions.Item>
            </Descriptions>

            {detailData.host && (
              <>
                <Title level={5}><AlertOutlined /> Host phụ trách</Title>
                <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Họ tên">{detailData.host.full_name}</Descriptions.Item>
                  <Descriptions.Item label="Email">{detailData.host.email}</Descriptions.Item>
                  <Descriptions.Item label="SĐT">{detailData.host.phone_number || '—'}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Title level={5}><HomeOutlined /> Danh sách phòng ({detailData.rooms.length})</Title>
            {detailData.rooms.map((r) => (
              <Card key={r.id} size="small" style={{ marginBottom: 8, borderRadius: 8 }}>
                <Row>
                  <Col span={16}>
                    <div style={{ fontWeight: 500 }}>{r.room_name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {r.capacity} người · {r.area_sqm}m² · {r.bed_info}
                    </Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#6366f1' }}>
                      {r.base_price.toLocaleString('vi-VN')}đ/đêm
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.images_count} ảnh</Text>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </Drawer>

      {/* MODAL ĐỔI TRẠNG THÁI */}
      <Modal
        title={<><EditOutlined /> Cập nhật trạng thái Homestay</>}
        open={statusOpen}
        onCancel={() => setStatusOpen(false)}
        onOk={handleUpdateStatus}
        confirmLoading={statusLoading}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={statusForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="status" label="Trạng thái mới" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_MAP[s]?.label ?? s }))} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do (tùy chọn)">
            <Input.TextArea rows={3} placeholder="Nhập lý do thay đổi trạng thái..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL GÁN HOST */}
      <Modal
        title={<><UserAddOutlined /> Gán Host cho Homestay</>}
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssignHost}
        confirmLoading={assignLoading}
        okText="Gán"
        cancelText="Hủy"
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="host_id" label="ID Host" rules={[{ required: true, message: 'Nhập ID của host' }]}>
            <Input placeholder="Nhập UUID của host muốn gán" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}