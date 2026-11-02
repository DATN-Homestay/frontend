import {
  Table, Tag, Button, Space, Input, Select, Card, Row, Col,
  Statistic, Drawer, Descriptions, Badge, Typography, Tooltip, message,
  Progress, Divider,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, TeamOutlined, HomeOutlined,
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import type { AdminHostItem, AdminHostDetail, AdminListUsersQuery } from '../../services/adminService';

const { Title, Text } = Typography;

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  SUSPENDED: { color: 'warning', label: 'Tạm khóa' },
  BANNED: { color: 'error', label: 'Bị cấm' },
};

const VERIFY_MAP: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'processing', label: 'Đang chờ' },
  VERIFIED: { color: 'success', label: 'Đã xác minh' },
  REJECTED: { color: 'error', label: 'Từ chối' },
  UNVERIFIED: { color: 'default', label: 'Chưa xác minh' },
};

export default function HostsPage() {
  const [data, setData] = useState<AdminHostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<AdminHostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query: AdminListUsersQuery = {
        page,
        limit: pagination.limit,
        search: searchText || undefined,
        status: filterStatus,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
      const res = await adminService.listHosts(query);
      setData(res.items as AdminHostItem[]);
      setPagination((prev) => ({ ...prev, page: res.pagination.page, total: res.pagination.total }));
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tải danh sách host');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, searchText, filterStatus]);

  useEffect(() => {
    fetchHosts(1);
  }, [fetchHosts]);

  const handleViewDetail = async (hostId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await adminService.getHostDetail(hostId);
      setDetailData(res);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tải chi tiết host');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: 'Host',
      key: 'host',
      render: (_: any, record: AdminHostItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: 14, flexShrink: 0,
          }}>
            {record.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.full_name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </div>
      ),
    },
    { title: 'SĐT', dataIndex: 'phone_number', render: (v: string | null) => v || '—' },
    {
      title: 'Homestay',
      dataIndex: 'homestays_count',
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: count > 0 ? '#6366f1' : '#d9d9d9' }} />
      ),
    },
    {
      title: 'Xác minh eKYC',
      dataIndex: 'verification_status',
      render: (status: string | null) => {
        const info = VERIFY_MAP[status ?? 'UNVERIFIED'];
        return <Badge status={info.color as any} text={info.label} />;
      },
    },
    {
      title: 'Điểm tin cậy',
      dataIndex: 'verification_score',
      render: (score: number | null) =>
        score != null ? (
          <Progress
            percent={score}
            size="small"
            strokeColor={score >= 100 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'}
            format={(p) => `${p}`}
          />
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
      title: 'Ngày tham gia',
      dataIndex: 'created_at',
      render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: AdminHostItem) => (
        <Tooltip title="Xem chi tiết">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
            Chi tiết
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <HomeOutlined style={{ marginRight: 8 }} />
          Quản lý Host
        </Title>
        <Text type="secondary">Xem thông tin chi tiết và thống kê của các chủ nhà homestay trong hệ thống</Text>
      </div>

      {/* FILTER */}
      <Card style={{ borderRadius: 14, marginBottom: 20 }}>
        <Space wrap>
          <Input
            placeholder="Tìm theo tên, email, SĐT"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 280 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => fetchHosts(1)}
          />
          <Select
            placeholder="Trạng thái tài khoản"
            allowClear
            style={{ width: 180 }}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v)}
            options={[
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'SUSPENDED', label: 'Tạm khóa' },
              { value: 'BANNED', label: 'Bị cấm' },
            ]}
          />
          <Button type="primary" onClick={() => fetchHosts(1)}>Lọc</Button>
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
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} host`,
            onChange: (p, size) => {
              setPagination((prev) => ({ ...prev, limit: size ?? 10 }));
              fetchHosts(p);
            },
          }}
        />
      </Card>

      {/* DRAWER CHI TIẾT HOST */}
      <Drawer
        title="Chi tiết Host"
        width={600}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); }}
        loading={detailLoading}
      >
        {detailData && (
          <div>
            {/* Header */}
            <div style={{
              textAlign: 'center', padding: '20px 0', marginBottom: 20,
              background: 'linear-gradient(135deg, #dbeafe, #ede9fe)', borderRadius: 12,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700,
              }}>
                {detailData.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <Title level={4} style={{ margin: 0 }}>{detailData.full_name}</Title>
              <Text type="secondary">{detailData.email}</Text>
            </div>

            {/* Thông tin cơ bản */}
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="SĐT">{detailData.phone_number || '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Badge status={(STATUS_MAP[detailData.status]?.color ?? 'default') as any}
                  text={STATUS_MAP[detailData.status]?.label ?? detailData.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tham gia" span={2}>
                {new Date(detailData.created_at).toLocaleString('vi-VN')}
              </Descriptions.Item>
            </Descriptions>

            {/* eKYC */}
            {detailData.verification && (
              <>
                <Divider><TeamOutlined /> Thông tin xác minh eKYC</Divider>
                <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Trạng thái">
                    <Badge status={(VERIFY_MAP[detailData.verification.status]?.color ?? 'default') as any}
                      text={VERIFY_MAP[detailData.verification.status]?.label} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Điểm tin cậy">
                    <Progress percent={detailData.verification.score} size="small"
                      strokeColor={detailData.verification.score >= 100 ? '#10b981' : '#f59e0b'} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngân hàng">{detailData.verification.bank_name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Chủ TK">{detailData.verification.bank_holder || '—'}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {/* Stats */}
            <Divider><DollarOutlined /> Thống kê kinh doanh</Divider>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #6366f1' }}>
                  <Statistic title="Tổng homestay" value={detailData.stats.total_homestays}
                    prefix={<HomeOutlined />} valueStyle={{ color: '#6366f1', fontWeight: 700 }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #3b82f6' }}>
                  <Statistic title="Tổng booking" value={detailData.stats.total_bookings}
                    prefix={<ClockCircleOutlined />} valueStyle={{ color: '#3b82f6', fontWeight: 700 }} />
                </Card>
              </Col>
              <Col span={24}>
                <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #10b981' }}>
                  <Statistic
                    title="Tổng doanh thu"
                    value={detailData.stats.total_revenue_vnd}
                    prefix={<CheckCircleOutlined />}
                    formatter={(v) => `${Number(v).toLocaleString('vi-VN')} đ`}
                    valueStyle={{ color: '#10b981', fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Homestay List */}
            {detailData.homestays.length > 0 && (
              <>
                <Divider><HomeOutlined /> Danh sách Homestay</Divider>
                {detailData.homestays.map((h) => (
                  <Card key={h.id} size="small" style={{ marginBottom: 8, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{h.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{h.city} — {h.rooms_count} phòng</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Tag color={h.status === 'ACTIVE' ? 'success' : h.status === 'BANNED' ? 'error' : 'warning'}>
                          {h.status}
                        </Tag>
                        {h.is_claimed ? <Tag color="blue">Chính chủ</Tag> : <Tag>Chưa nhận</Tag>}
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
