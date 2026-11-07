import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Divider, Drawer, Empty,
  Input, Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import { CalendarOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  adminBookingsService, type AdminBookingDetail, type AdminBookingItem,
  type AdminBookingsQuery, type AdminBookingsResult,
} from '../../services/adminBookingsService';
import type { BookingStatus } from '../../types/customer';
import { formatDate, formatDateTime } from '../../utils/date';
import { formatVnd } from '../../features/pricing/pricing.utils';

const { Title, Text } = Typography;
const STATUSES: Record<BookingStatus, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'gold' },
  PAID_ESCROW: { label: 'Đã thanh toán / Ký quỹ', color: 'blue' },
  CHECKED_IN: { label: 'Đang lưu trú', color: 'cyan' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
  DISPUTED: { label: 'Tranh chấp', color: 'purple' },
  EXPIRED: { label: 'Hết hạn thanh toán', color: 'default' },
};
const PAYMENT_LABELS: Record<string, string> = { PENDING: 'Chờ thanh toán', SUCCESS: 'Thành công', FAILED: 'Thất bại' };
const ESCROW_LABELS: Record<string, string> = { HOLDING: 'Đang giữ ký quỹ', RELEASED: 'Đã giải ngân', REFUNDED: 'Đã hoàn tiền' };
const REFUND_LABELS: Record<string, string> = { PENDING: 'Chờ xử lý', PROCESSING: 'Đang xử lý', PROCESSED: 'Đã hoàn tiền', FAILED: 'Thất bại' };
const PAYOUT_LABELS: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', PAID_OUT: 'Đã chi trả', REJECTED: 'Từ chối' };

function statusTag(status: BookingStatus) {
  const info = STATUSES[status];
  return <Tag color={info?.color}>{info?.label ?? status}</Tag>;
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu booking. Vui lòng thử lại.';
}

export default function AdminBookingsPage() {
  const [query, setQuery] = useState<AdminBookingsQuery>({ page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify({ query, revision });
  const [result, setResult] = useState<{ key: string; data: AdminBookingsResult } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const detailKey = `${selectedId}:${detailRevision}`;
  const [detailResult, setDetailResult] = useState<{ key: string; data: AdminBookingDetail } | null>(null);
  const [detailFailure, setDetailFailure] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    adminBookingsService.list(query).then((data) => {
      if (active) { setResult({ key, data }); setFailure(null); }
    }).catch((error: unknown) => {
      if (active) setFailure({ key, message: errorText(error) });
    });
    return () => { active = false; };
  }, [query, key]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    adminBookingsService.detail(selectedId).then((data) => {
      if (active) { setDetailResult({ key: detailKey, data }); setDetailFailure(null); }
    }).catch((error: unknown) => {
      if (active) setDetailFailure({ key: detailKey, message: errorText(error) });
    });
    return () => { active = false; };
  }, [selectedId, detailKey]);

  const data = result?.key === key ? result.data : null;
  const error = failure?.key === key ? failure.message : null;
  const loading = !data && !error;
  const detail = detailResult?.key === detailKey ? detailResult.data : null;
  const detailError = detailFailure?.key === detailKey ? detailFailure.message : null;
  const filter = (changes: Partial<AdminBookingsQuery>) => setQuery((current) => ({ ...current, ...changes, page: 1 }));
  const openDetail = (id: string) => { setSelectedId(id); setDetailRevision((value) => value + 1); };

  const columns = [
    { title: 'Mã booking', key: 'code', render: (_: unknown, booking: AdminBookingItem) => (
      <div>
        <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(booking.id)}>{booking.booking_code}</Button>
        <div><Text type="secondary">{formatDateTime(booking.created_at)}</Text></div>
      </div>
    ) },
    { title: 'Khách hàng', key: 'customer', render: (_: unknown, booking: AdminBookingItem) => (
      <div>{booking.customer?.full_name ?? '—'}<div><Text type="secondary">{booking.customer?.email}</Text></div></div>
    ) },
    { title: 'Chỗ nghỉ / Phòng', key: 'room', render: (_: unknown, booking: AdminBookingItem) => (
      <div><strong>{booking.homestay?.name ?? '—'}</strong><div>{booking.room?.room_name ?? '—'}</div></div>
    ) },
    { title: 'Lưu trú', key: 'stay', render: (_: unknown, booking: AdminBookingItem) => (
      <div>{formatDate(booking.check_in_date)} → {formatDate(booking.check_out_date)}
        <div><Text type="secondary">{booking.nights} đêm · {booking.num_guests} khách</Text></div>
      </div>
    ) },
    { title: 'Tổng tiền', dataIndex: 'total_amount', render: (value: number) => <strong>{formatVnd(value)}</strong> },
    { title: 'Trạng thái', dataIndex: 'status', render: statusTag },
    { title: 'Nguồn', dataIndex: 'is_dropship', render: (dropship: boolean) => (
      <Tag color={dropship ? 'orange' : 'blue'}>{dropship ? 'Dropship B2B' : 'Chủ nhà'}</Tag>
    ) },
    { title: 'Chi tiết', key: 'detail', render: (_: unknown, booking: AdminBookingItem) => (
      <Button icon={<EyeOutlined />} aria-label={`Xem booking ${booking.booking_code}`} onClick={() => openDetail(booking.id)} />
    ) },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 20 }} wrap>
        <div>
          <Title level={2} style={{ margin: 0 }}><CalendarOutlined /> Quản lý booking</Title>
          <Text type="secondary">Theo dõi đơn đặt phòng, khách lưu trú và thanh toán trên toàn hệ thống.</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRevision((value) => value + 1)}>Tải lại</Button>
      </Space>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          ['Booking trong bộ lọc', data?.pagination.total],
          ['Tổng giá trị đơn (VNĐ)', data?.summary.total_amount],
          ['Chờ thanh toán', data ? data.summary.by_status.PENDING_PAYMENT ?? 0 : undefined],
          ['Đang lưu trú', data ? data.summary.by_status.CHECKED_IN ?? 0 : undefined],
        ].map(([title, value]) => (
          <Col xs={24} sm={12} xl={6} key={String(title)}>
            <Card size="small"><Statistic title={title} value={value ?? '—'} groupSeparator="." loading={loading} /></Card>
          </Col>
        ))}
      </Row>
      <Card style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input.Search aria-label="Tìm booking" placeholder="Mã đơn, khách, chỗ nghỉ, chủ nhà" allowClear
            value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 320 }}
            onSearch={(value) => filter({ search: value.trim() || undefined })} enterButton="Tìm kiếm" />
          <Select aria-label="Lọc trạng thái booking" placeholder="Tất cả trạng thái" allowClear style={{ width: 230 }}
            value={query.status} onChange={(status) => filter({ status })}
            options={Object.entries(STATUSES).map(([value, info]) => ({ value, label: info.label }))} />
          <Select aria-label="Lọc nguồn booking" placeholder="Tất cả nguồn đơn" allowClear style={{ width: 180 }}
            value={query.source} onChange={(source) => filter({ source })}
            options={[{ value: 'INTERNAL', label: 'Chủ nhà' }, { value: 'DROPSHIP', label: 'Dropship B2B' }]} />
          <DatePicker.RangePicker format="DD/MM/YYYY" placeholder={['Nhận phòng từ', 'Đến ngày']}
            onChange={(dates) => filter({ from_date: dates?.[0]?.format('YYYY-MM-DD'), to_date: dates?.[1]?.format('YYYY-MM-DD') })} />
        </Space>
      </Card>
      {error && <Alert style={{ marginBottom: 16 }} type="error" showIcon title="Không tải được booking" description={error}
        action={<Button onClick={() => setRevision((value) => value + 1)}>Thử lại</Button>} />}
      <Card>
        <Table<AdminBookingItem> rowKey="id" columns={columns} dataSource={data?.items ?? []} loading={loading}
          scroll={{ x: 'max-content' }} locale={{ emptyText: error ? 'Chưa tải được dữ liệu' : 'Không có booking phù hợp' }}
          pagination={{ current: query.page, pageSize: query.limit, total: data?.pagination.total ?? 0,
            showSizeChanger: true, showTotal: (total) => `${total} booking`,
            onChange: (page, limit) => setQuery((current) => ({ ...current, page: limit !== current.limit ? 1 : page, limit })),
          }} />
      </Card>
      <Drawer title={detail ? `Booking ${detail.booking_code}` : 'Chi tiết booking'} size="large" open={selectedId !== null}
        onClose={() => setSelectedId(null)} loading={!detail && !detailError}>
        {detailError && <Alert type="error" showIcon title="Không tải được chi tiết" description={detailError}
          action={<Button onClick={() => setDetailRevision((value) => value + 1)}>Thử lại</Button>} />}
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 16 }}>{statusTag(detail.status)}
              <Tag>{detail.is_dropship ? 'Dropship B2B' : 'Chủ nhà'}</Tag>
              <Text type="secondary">Tạo lúc {formatDateTime(detail.created_at)}</Text>
            </Space>
            <Descriptions title="Thông tin lưu trú" bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Mã đơn">{detail.booking_code}</Descriptions.Item>
              <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="Chỗ nghỉ">{detail.homestay?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Phòng">{detail.room?.room_name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detail.address ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Nhận phòng">{formatDate(detail.check_in_date)}</Descriptions.Item>
              <Descriptions.Item label="Trả phòng">{formatDate(detail.check_out_date)}</Descriptions.Item>
              <Descriptions.Item label="Số đêm">{detail.nights}</Descriptions.Item>
              <Descriptions.Item label="Số khách">{detail.num_guests}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú của khách" span={2}>{detail.customer_note || 'Không có'}</Descriptions.Item>
              <Descriptions.Item label="Chính sách hủy" span={2}>{detail.cancellation_policy ?? '—'}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Descriptions title="Khách hàng và chủ nhà" bordered size="small" column={1}>
              <Descriptions.Item label="Khách hàng">{detail.customer?.full_name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email khách">{detail.customer?.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại khách">{detail.customer?.phone_number ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Chủ nhà">{detail.host?.full_name ?? 'Chưa có chủ nhà'}</Descriptions.Item>
              <Descriptions.Item label="Email chủ nhà">{detail.host?.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại chủ nhà">{detail.host?.phone_number ?? '—'}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Descriptions title="Chi phí và ký quỹ" bordered size="small" column={1}>
              <Descriptions.Item label="Tiền phòng">{formatVnd(detail.room_subtotal)}</Descriptions.Item>
              <Descriptions.Item label="Phí dịch vụ">{formatVnd(detail.service_fee)}</Descriptions.Item>
              <Descriptions.Item label="Giảm giá">{formatVnd(detail.discount_amount)}</Descriptions.Item>
              <Descriptions.Item label="Tổng tiền"><strong>{formatVnd(detail.total_amount)}</strong></Descriptions.Item>
              {detail.status === 'PENDING_PAYMENT' && <Descriptions.Item label="Hạn thanh toán">{formatDateTime(detail.payment_deadline)}</Descriptions.Item>}
              <Descriptions.Item label="Ký quỹ">{detail.escrow ? ESCROW_LABELS[detail.escrow.status] ?? detail.escrow.status : 'Chưa có ký quỹ'}</Descriptions.Item>
              {detail.escrow && <Descriptions.Item label="Số tiền ký quỹ">{formatVnd(detail.escrow.amount)}</Descriptions.Item>}
              {detail.escrow?.release_due_at && <Descriptions.Item label="Hạn giải ngân">{formatDateTime(detail.escrow.release_due_at)}</Descriptions.Item>}
              {detail.payout && <Descriptions.Item label="Chi trả chủ nhà">{PAYOUT_LABELS[detail.payout.status] ?? detail.payout.status}</Descriptions.Item>}
              {detail.payout && <Descriptions.Item label="Hoa hồng sàn">{formatVnd(detail.payout.platform_commission)}</Descriptions.Item>}
              {detail.payout && <Descriptions.Item label="Tiền chủ nhà nhận">{formatVnd(detail.payout.actual_payout_amount)}</Descriptions.Item>}
            </Descriptions>
            <Divider>Giao dịch thanh toán</Divider>
            <Table rowKey="id" size="small" pagination={false} dataSource={detail.payments} scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giao dịch thanh toán" /> }}
              columns={[
                { title: 'Phương thức', dataIndex: 'method' },
                { title: 'Số tiền', dataIndex: 'amount', render: formatVnd },
                { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => PAYMENT_LABELS[status] ?? status },
                { title: 'Mã giao dịch', dataIndex: 'transaction_code', render: (value: string | null) => value ?? '—' },
                { title: 'Thanh toán lúc', dataIndex: 'paid_at', render: (value: string | null) => formatDateTime(value) },
              ]} />
            <Divider>Hoàn tiền</Divider>
            <Table rowKey="id" size="small" pagination={false} dataSource={detail.refunds} scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'Chưa có yêu cầu hoàn tiền' }} columns={[
                { title: 'Số tiền hoàn', dataIndex: 'amount', render: formatVnd },
                { title: 'Phí hủy', dataIndex: 'penalty_amount', render: formatVnd },
                { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => REFUND_LABELS[status] ?? status },
                { title: 'Lý do', dataIndex: 'reason', render: (value: string | null) => value ?? '—' },
              ]} />
          </>
        )}
      </Drawer>
    </div>
  );
}
