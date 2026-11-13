import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Card, Descriptions, Image, Input, Modal, Rate, Select, Table, Tag, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, StarOutlined, EyeOutlined, HomeOutlined, DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { ApiError } from '../../services/apiClient';
import CancelBookingModal from '../../components/CancelBookingModal';
import RoomDetailModal from '../../components/RoomDetailModal';
import EvidenceUpload from '../../components/EvidenceUpload';
import ComplaintModal from '../../components/ComplaintModal';
import type { BookingDetail, BookingStatus, Complaint, MyBookingItem, RefundStatus } from '../../types/customer';
import { COMPLAINT_CATEGORY_LABEL, COMPLAINT_STATUS_TAG } from '../../types/customer';

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

/** Trạng thái hoàn tiền hiển thị cho khách; FAILED là việc của hệ thống nên nói là đang chờ xử lý */
const REFUND_TAG: Record<RefundStatus, { color: string; text: string }> = {
  PENDING: { color: 'orange', text: 'Đang xử lý hoàn tiền' },
  PROCESSING: { color: 'orange', text: 'Đang xử lý hoàn tiền' },
  PROCESSED: { color: 'success', text: 'Đã hoàn tiền' },
  FAILED: { color: 'gold', text: 'Đang chờ quản trị viên xử lý' },
};

const POLICY_LABEL: Record<string, string> = {
  FLEXIBLE: 'Linh hoạt (hoàn 100% nếu hủy trước 24 giờ)',
  MODERATE: 'Tiêu chuẩn (hoàn 100% nếu hủy trước 5 ngày, sau đó 50%)',
  STRICT: 'Nghiêm ngặt (100% trước 14 ngày, 50% từ 7–14 ngày, sau đó không hoàn)',
  NON_REFUNDABLE: 'Không hoàn tiền',
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

type ReviewAspect = 'rating_overall' | 'cleanliness_rating' | 'service_rating' | 'location_rating' | 'value_rating';
const ASPECT_LABEL: Record<ReviewAspect, string> = {
  rating_overall: 'Trải nghiệm chung',
  cleanliness_rating: 'Sạch sẽ & tiện nghi',
  service_rating: 'Thái độ phục vụ của chủ nhà',
  location_rating: 'Vị trí & cảnh quan',
  value_rating: 'Đáng giá tiền',
};
const EMPTY_SCORES: Record<ReviewAspect, number> = {
  rating_overall: 0,
  cleanliness_rating: 0,
  service_rating: 0,
  location_rating: 0,
  value_rating: 0,
};

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

  const [cancelTarget, setCancelTarget] = useState<MyBookingItem | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<MyBookingItem | null>(null);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [detailComplaints, setDetailComplaints] = useState<Complaint[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRoomTarget, setSelectedRoomTarget] = useState<{
    homestayId: string;
    homestayName: string;
    room: MyBookingItem['room'];
  } | null>(null);

  const handleOpenRoomDetail = (
    homestayId: string,
    homestayName: string,
    room: MyBookingItem['room'],
  ) => {
    setSelectedRoomTarget({ homestayId, homestayName, room });
  };

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
    setDetailComplaints([]);
    try {
      const [d, complaints] = await Promise.all([
        customerService.getBookingDetail(id),
        customerService.getMyComplaints().catch(() => [] as Complaint[]),
      ]);
      setDetail(d);
      setDetailComplaints(complaints.filter((c) => c.booking_id === id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được chi tiết đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  // ----- Biên nhận thanh toán -----
  const [downloading, setDownloading] = useState<string | null>(null);
  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloading(paymentId);
    try {
      await customerService.downloadReceipt(paymentId);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được biên nhận');
    } finally {
      setDownloading(null);
    }
  };

  // ----- Đánh giá sau lưu trú -----
  const [reviewTarget, setReviewTarget] = useState<MyBookingItem | null>(null);
  const [scores, setScores] = useState<Record<ReviewAspect, number>>({ ...EMPTY_SCORES });
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const openReview = (r: MyBookingItem) => {
    setScores({ ...EMPTY_SCORES });
    setComment('');
    setPhotos([]);
    setPhotosUploading(false);
    setReviewTarget(r);
  };

  const reviewProblem = (): string | null => {
    if (Object.values(scores).some((v) => v < 1)) return 'Vui lòng chấm đủ 5 tiêu chí';
    if (comment.trim().length < 10) return 'Nhận xét cần ít nhất 10 ký tự';
    if (photosUploading) return 'Ảnh đang được tải lên, vui lòng đợi';
    return null;
  };

  const handleSendReview = async () => {
    if (!reviewTarget) return;
    const problem = reviewProblem();
    if (problem) {
      message.warning(problem);
      return;
    }
    setReviewing(true);
    try {
      await customerService.submitReview(reviewTarget.id, {
        rating_overall: scores.rating_overall,
        cleanliness_rating: scores.cleanliness_rating,
        service_rating: scores.service_rating,
        location_rating: scores.location_rating,
        value_rating: scores.value_rating,
        comment: comment.trim(),
        ...(photos.length ? { photos } : {}),
      });
      message.success('Đã gửi đánh giá thành công! Cảm ơn bạn đã chia sẻ.');
      setReviewTarget(null);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gửi được đánh giá');
      // 409: đã đánh giá hoặc hết hạn đánh giá, tải lại để nút phản ánh đúng
      if (err instanceof ApiError && err.status === 409) {
        setReviewTarget(null);
        reload();
      }
    } finally {
      setReviewing(false);
    }
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
          <div style={{ marginBottom: 3 }}>
            <Link
              to={`/homestay/${r.homestay.id}`}
              style={{ fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
              title="Xem trang homestay"
            >
              {r.homestay.name}
            </Link>
          </div>
          <Tooltip title="Bấm để xem ảnh và tiện nghi chi tiết của phòng này">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenRoomDetail(r.homestay.id, r.homestay.name, r.room)}
              style={{
                padding: 0,
                height: 'auto',
                fontSize: 13,
                fontWeight: 500,
                color: '#4f46e5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {r.room.room_name}
            </Button>
          </Tooltip>
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
          {r.can_review && (
            <Button type="primary" size="small" icon={<StarOutlined />} onClick={() => openReview(r)}>
              Đánh giá
            </Button>
          )}
          {r.has_review && <Tag color="gold">Đã đánh giá</Tag>}
          <Button size="small" onClick={() => openDetail(r.id)}>Chi tiết</Button>
          {(r.status === 'PENDING_PAYMENT' || r.status === 'PAID_ESCROW') && (
            <Button size="small" danger onClick={() => setCancelTarget(r)}>
              Hủy đơn
            </Button>
          )}
          {r.can_complain && (
            <Button size="small" icon={<WarningOutlined />} onClick={() => setComplaintTarget(r)}>
              Khiếu nại
            </Button>
          )}
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

      {cancelTarget && (
        <CancelBookingModal
          key={cancelTarget.id}
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => reload()}
        />
      )}

      {complaintTarget && (
        <ComplaintModal
          key={complaintTarget.id}
          booking={complaintTarget}
          onClose={() => setComplaintTarget(null)}
          onSubmitted={() => {
            setComplaintTarget(null);
            reload();
          }}
        />
      )}

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
                {
                  key: 'homestay',
                  label: 'Homestay',
                  children: (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span>{detail.homestay.name} — {detail.homestay.address}, {detail.homestay.city}</span>
                      <Link to={`/homestay/${detail.homestay.id}`} style={{ fontWeight: 600, color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <HomeOutlined /> Trang Homestay ↗
                      </Link>
                    </div>
                  ),
                },
                {
                  key: 'room',
                  label: 'Phòng',
                  children: (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{detail.room.room_name}</span>
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleOpenRoomDetail(detail.homestay.id, detail.homestay.name, detail.room)}
                        style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                      >
                        Xem chi tiết phòng
                      </Button>
                    </div>
                  ),
                },
                { key: 'dates', label: 'Lưu trú', children: `${detail.check_in_date} ➔ ${detail.check_out_date} (${detail.nights} đêm, ${detail.num_guests} khách)` },
                ...(detail.discount_amount > 0
                  ? [{
                      key: 'discount',
                      label: 'Mã giảm giá',
                      children: <span style={{ color: '#10b981' }}>{detail.coupon_code ?? 'Đã áp dụng'}: -{money(detail.discount_amount)}</span>,
                    }]
                  : []),
                { key: 'total', label: 'Tổng tiền', children: <strong>{money(detail.total_amount)}</strong> },
                ...(detail.review
                  ? [{
                      key: 'review',
                      label: 'Đánh giá của bạn',
                      children: (
                        <div>
                          <Rate disabled value={detail.review.rating_overall} style={{ fontSize: 14, color: '#f59e0b' }} />
                          <div>{detail.review.comment}</div>
                          {detail.review.photos.length > 0 && (
                            <Image.PreviewGroup>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                {detail.review.photos.map((src) => (
                                  <Image key={src} src={src} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
                                ))}
                              </div>
                            </Image.PreviewGroup>
                          )}
                          {detail.review.host_reply && (
                            <div style={{ marginTop: 8, padding: '6px 10px', background: '#f1f5f9', borderRadius: 6, fontSize: 13 }}>
                              <strong>Chủ nhà phản hồi:</strong> {detail.review.host_reply}
                            </div>
                          )}
                        </div>
                      ),
                    }]
                  : []),
                { key: 'policy', label: 'Chính sách hủy', children: POLICY_LABEL[detail.homestay.cancellation_policy] ?? detail.homestay.cancellation_policy },
                ...(detail.customer_note ? [{ key: 'note', label: 'Ghi chú', children: detail.customer_note }] : []),
                ...(detail.escrow_status ? [{ key: 'escrow', label: 'Ký quỹ Escrow', children: detail.escrow_status }] : []),
                ...(detail.status === 'CANCELLED' && detail.cancelled_at
                  ? [
                      {
                        key: 'cancel',
                        label: 'Đã hủy',
                        children: `${new Date(detail.cancelled_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })} bởi ${
                          { CUSTOMER: 'khách hàng', HOST: 'chủ nhà', ADMIN: 'quản trị viên', SYSTEM: 'hệ thống' }[detail.cancelled_by ?? 'SYSTEM']
                        }${detail.cancel_reason ? ` — ${detail.cancel_reason}` : ''}`,
                      },
                    ]
                  : []),
                ...(detail.refunds ?? []).map((r) => ({
                  key: `refund-${r.id}`,
                  label: `Hoàn tiền #${r.id}`,
                  children: (
                    <span>
                      <strong>{money(r.amount)}</strong>{' '}
                      <Tag color={REFUND_TAG[r.status].color}>{REFUND_TAG[r.status].text}</Tag>
                      {r.processed_at && <Text type="secondary">({new Date(r.processed_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })})</Text>}
                    </span>
                  ),
                })),
                ...detail.payments.map((p) => ({
                  key: `pay-${p.id}`,
                  label: `Thanh toán #${p.id}`,
                  children: (
                    <span>
                      {`${money(p.amount)} — ${p.method} — ${p.status}${p.transaction_code ? ` (Mã GD ${p.transaction_code})` : ''}`}
                      {p.status === 'SUCCESS' && (
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={downloading === p.id}
                          onClick={() => handleDownloadReceipt(p.id)}
                        >
                          Tải biên nhận
                        </Button>
                      )}
                    </span>
                  ),
                })),
                ...detailComplaints.map((c) => ({
                  key: `complaint-${c.id}`,
                  label: `Khiếu nại #${c.id}`,
                  children: (
                    <div>
                      <div>
                        <Tag color={COMPLAINT_STATUS_TAG[c.status].color}>{COMPLAINT_STATUS_TAG[c.status].text}</Tag>
                        <strong>{c.title}</strong>{' '}
                        <Text type="secondary">({COMPLAINT_CATEGORY_LABEL[c.category]})</Text>
                      </div>
                      <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{c.description}</div>
                      {c.attachments.length > 0 && (
                        <Image.PreviewGroup>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                            {c.attachments.map((src) => (
                              <Image key={src} src={src} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      )}
                      {c.resolution_note && (
                        <div style={{ marginTop: 8, padding: '6px 10px', background: '#f1f5f9', borderRadius: 6, fontSize: 13 }}>
                          <strong>Phản hồi từ StayAI:</strong> {c.resolution_note}
                        </div>
                      )}
                    </div>
                  ),
                })),
              ]}
            />
            {detail.can_complain && !detailComplaints.some((c) => c.status === 'OPEN' || c.status === 'IN_REVIEW') && (
              <Button
                icon={<WarningOutlined />}
                style={{ marginTop: 12 }}
                onClick={() => {
                  const target = items.find((i) => i.id === detail.id);
                  if (target) {
                    setDetail(null);
                    setComplaintTarget(target);
                  }
                }}
              >
                Gửi khiếu nại về đơn này
              </Button>
            )}
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
        confirmLoading={reviewing}
      >
        <div style={{ padding: '12px 0' }}>
          {(Object.keys(ASPECT_LABEL) as ReviewAspect[]).map((key) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong={key === 'rating_overall'}>{ASPECT_LABEL[key]}</Text>
              <Rate
                value={scores[key]}
                onChange={(v) => setScores((s) => ({ ...s, [key]: v }))}
                style={{ color: '#f59e0b', fontSize: key === 'rating_overall' ? 24 : 18 }}
              />
            </div>
          ))}
          <div style={{ height: 8 }} />

          <Text strong style={{ display: 'block', marginBottom: 8 }}>Nhận xét chi tiết</Text>
          <TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            showCount
            placeholder="Chia sẻ trải nghiệm về độ sạch sẽ, thái độ chủ nhà, không gian và tiện nghi..."
          />

          <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>
            Ảnh thực tế <Text type="secondary" style={{ fontWeight: 400 }}>(không bắt buộc, tối đa 5 ảnh)</Text>
          </Text>
          {reviewTarget && (
            <EvidenceUpload key={reviewTarget.id} kind="review" onChange={setPhotos} onUploadingChange={setPhotosUploading} />
          )}
        </div>
      </Modal>

      <RoomDetailModal
        open={!!selectedRoomTarget}
        onClose={() => setSelectedRoomTarget(null)}
        homestayId={selectedRoomTarget?.homestayId}
        homestayName={selectedRoomTarget?.homestayName}
        room={selectedRoomTarget?.room}
      />
    </div>
  );
}
