import { useEffect, useState } from 'react';
import { App, Button, Card, Descriptions, Input, Modal, Rate, Select, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, StarOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import type { BookingDetail, BookingStatus, MyBookingItem } from '../../types/customer';

const { Title, Text } = Typography;
const { TextArea } = Input;

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const STATUS_TAG: Record<BookingStatus, { color: string; text: string }> = {
  PENDING_PAYMENT: { color: 'orange', text: 'Chờ thanh toán' },
  PAID_ESCROW: { color: 'blue', text: 'Đã thanh toán (Escrow)' },
  CHECKED_IN: { color: 'cyan', text: 'Đang lưu trú' },
  COMPLETED: { color: 'success', text: 'Đã hoàn thành' },
  CANCELLED: { color: 'red', text: 'Đã hủy' },
  DISPUTED: { color: 'volcano', text: 'Đang khiếu nại' },
  EXPIRED: { color: 'default', text: 'Hết hạn giữ chỗ' },
};

/** Đếm ngược hạn thanh toán của đơn đang giữ chỗ */
function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  if (remaining === 0) return <Text type="danger">Đã hết hạn giữ chỗ</Text>;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <Text type="warning">
      Còn {minutes}:{String(seconds).padStart(2, '0')}
    </Text>
  );
}

export default function MyTripsPage() {
  const { message } = App.useApp();

  const [items, setItems] = useState<MyBookingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dùng chung cho các thao tác đổi bộ lọc / trang / tải lại: bật loading ở handler, không phải trong effect
  const reload = (next: { page?: number; pageSize?: number; status?: BookingStatus | undefined } = {}) => {
    setLoading(true);
    if ('page' in next) setPage(next.page!);
    if ('pageSize' in next) setPageSize(next.pageSize!);
    if ('status' in next) setStatusFilter(next.status);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    customerService
      .getMyBookings({ page, limit: pageSize, status: statusFilter })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.meta.total);
      })
      .catch((err) => {
        if (!cancelled) message.error(err instanceof Error ? err.message : 'Không tải được danh sách chuyến đi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, statusFilter, reloadKey, message]);

  const payNow = async (id: string) => {
    setPayingId(id);
    try {
      const link = await customerService.createPaymentUrl(id);
      window.location.assign(link.payment_url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể tạo liên kết thanh toán');
      reload(); // đơn có thể vừa hết hạn, tải lại để thấy trạng thái đúng
      setPayingId(null);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await customerService.getBookingDetail(id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được chi tiết đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  // ----- Đánh giá: backend chưa có API (GĐ7) nên giữ nguyên giao diện mô phỏng của nhóm -----
  const [reviewTarget, setReviewTarget] = useState<MyBookingItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const handleSendReview = () => {
    message.success('Đã gửi đánh giá thành công! Cảm ơn bạn đã chia sẻ.');
    setReviewTarget(null);
    setComment('');
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'booking_code',
      render: (code: string, r: MyBookingItem) => (
        <div>
          <strong>{code}</strong>
          {r.is_dropship && (
            <div style={{ marginTop: 2 }}>
              <Tag color="#003580" style={{ fontSize: 10, borderRadius: 4, margin: 0, fontWeight: 600 }}>
                Booking.com B2B
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Homestay & Phòng',
      render: (_: unknown, r: MyBookingItem) => (
        <div>
          <Text strong>{r.homestay.name}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{r.room.room_name}</Text>
        </div>
      ),
    },
    {
      title: 'Thời gian lưu trú',
      render: (_: unknown, r: MyBookingItem) => (
        <span>{r.check_in_date} ➔ {r.check_out_date}</span>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      render: (amount: number) => <strong style={{ color: '#6366f1' }}>{money(amount)}</strong>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: BookingStatus, r: MyBookingItem) => (
        <div>
          <Tag color={STATUS_TAG[status].color} icon={status === 'COMPLETED' ? <CheckCircleOutlined /> : undefined}>
            {STATUS_TAG[status].text}
          </Tag>
          {status === 'PENDING_PAYMENT' && r.expires_at && (
            <div style={{ marginTop: 4, fontSize: 12 }}>
              <HoldCountdown expiresAt={r.expires_at} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      render: (_: unknown, r: MyBookingItem) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {r.status === 'PENDING_PAYMENT' && (
            <Button type="primary" size="small" loading={payingId === r.id} onClick={() => payNow(r.id)}>
              Thanh toán ngay
            </Button>
          )}
          {r.status === 'COMPLETED' && (
            <Button type="primary" size="small" icon={<StarOutlined />} onClick={() => setReviewTarget(r)}>
              Đánh giá
            </Button>
          )}
          <Button size="small" onClick={() => openDetail(r.id)}>Chi tiết</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Title level={2} style={{ margin: 0 }}>Chuyến đi của tôi</Title>
        <Select
          allowClear
          placeholder="Tất cả trạng thái"
          style={{ width: 220 }}
          value={statusFilter}
          onChange={(value) => reload({ page: 1, status: value })}
          options={(Object.keys(STATUS_TAG) as BookingStatus[]).map((s) => ({ value: s, label: STATUS_TAG[s].text }))}
        />
      </div>

      <Card style={{ borderRadius: 14, overflow: 'hidden' }}>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 860 }}
          locale={{ emptyText: 'Bạn chưa có chuyến đi nào' }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20'],
            showTotal: (t, range) => `${range[0]}-${range[1]} của ${t} chuyến đi`,
            onChange: (p, size) => reload({ page: size === pageSize ? p : 1, pageSize: size }),
          }}
        />
      </Card>

      <Modal
        title="Chi tiết đơn đặt phòng"
        open={detailLoading || !!detail}
        loading={detailLoading}
        onCancel={() => setDetail(null)}
        footer={null}
        width={680}
      >
        {detail && (
          <div>
            {detail.ota_fulfillment && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #003580 0%, #00224f 100%)',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '16px',
                  marginBottom: 16,
                  border: '1px solid #1a4d8f',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏨</span> Vé nhận phòng Booking.com (Demand API)
                  </div>
                  <Tag color="green" style={{ margin: 0, fontWeight: 700 }}>ĐÃ XÁC NHẬN B2B</Tag>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 10px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase' }}>Mã Booking.com</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#ffb700', marginTop: 2 }}>
                      {detail.ota_fulfillment.ota_booking_code}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 10px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase' }}>Mã PIN nhận phòng</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#4ade80', marginTop: 2 }}>
                      {detail.ota_fulfillment.pin_code}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 10px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase' }}>Mã PNR Quốc tế</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#67e8f9', marginTop: 2 }}>
                      {detail.ota_fulfillment.pnr_code}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 6, lineHeight: 1.5 }}>
                  💡 <strong>Hướng dẫn:</strong> Đơn phòng đã được thanh toán 100% bằng thẻ ảo VCC. Khi đến quầy lễ tân, bạn chỉ cần đọc <strong>Mã Booking.com</strong> hoặc <strong>Mã PIN</strong> này để nhận phòng trực tiếp.
                </div>
              </div>
            )}

            <Descriptions
              column={1}
              size="small"
              bordered
              items={[
                { key: 'code', label: 'Mã đơn', children: <strong>{detail.booking_code}</strong> },
                { key: 'status', label: 'Trạng thái', children: <Tag color={STATUS_TAG[detail.status].color}>{STATUS_TAG[detail.status].text}</Tag> },
                { key: 'homestay', label: 'Homestay', children: `${detail.homestay.name} — ${detail.homestay.address}, ${detail.homestay.city}` },
                { key: 'room', label: 'Phòng', children: detail.room.room_name },
                { key: 'dates', label: 'Lưu trú', children: `${detail.check_in_date} ➔ ${detail.check_out_date} (${detail.nights} đêm, ${detail.num_guests} khách)` },
                { key: 'total', label: 'Tổng tiền', children: <strong>{money(detail.total_amount)}</strong> },
                { key: 'policy', label: 'Chính sách hủy', children: detail.homestay.cancellation_policy },
                ...(detail.customer_note ? [{ key: 'note', label: 'Ghi chú', children: detail.customer_note }] : []),
                ...(detail.escrow_status ? [{ key: 'escrow', label: 'Ký quỹ Escrow', children: detail.escrow_status }] : []),
                ...detail.payments.map((p) => ({
                  key: `pay-${p.id}`,
                  label: `Thanh toán #${p.id}`,
                  children: `${money(p.amount)} — ${p.method} — ${p.status}${p.transaction_code ? ` (Mã GD ${p.transaction_code})` : ''}`,
                })),
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal
        title={`Đánh giá kỳ nghỉ tại ${reviewTarget?.homestay.name ?? ''}`}
        open={!!reviewTarget}
        onCancel={() => setReviewTarget(null)}
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
