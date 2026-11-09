import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Divider, Input, Modal, Result, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { CheckCircleFilled, GiftOutlined, SafetyCertificateOutlined, TagOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { ApiError } from '../../services/apiClient';
import type { BookingQuote, CouponCheck, CreatedBooking, AvailableCoupon } from '../../types/customer';

const { Title, Text, Paragraph } = Typography;

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const roomId = searchParams.get('roomId');
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const guests = Number(searchParams.get('guests')) || 1;
  const missingParams = !roomId || !checkIn || !checkOut;

  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!missingParams);
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  // Sau khi tạo đơn, nếu bước lấy URL VNPay lỗi thì thử lại KHÔNG tạo đơn mới
  const [booking, setBooking] = useState<CreatedBooking | null>(null);

  // Mã giảm giá: ô nhập, kết quả kiểm tra gần nhất và mã đang được áp dụng
  const [couponInput, setCouponInput] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Extract<CouponCheck, { valid: true }> | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const urlCoupon = searchParams.get('coupon');

  // Báo giá thật từ server: tiền phòng, số đêm, còn phòng hay không
  useEffect(() => {
    if (!roomId || !checkIn || !checkOut) return;
    let cancelled = false;
    customerService
      .quoteBooking({ room_id: roomId, check_in_date: checkIn, check_out_date: checkOut, num_guests: guests })
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((err) => {
        if (!cancelled) setQuoteError(err instanceof Error ? err.message : 'Không thể tải thông tin đặt phòng');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, checkIn, checkOut, guests]);

  // Tải danh sách mã ưu đãi có sẵn cho homestay này
  useEffect(() => {
    if (!quote?.homestay?.id) return;
    customerService.getHomestayCoupons(quote.homestay.id).then(setAvailableCoupons);
  }, [quote?.homestay?.id]);

  // Tự động áp dụng mã truyền qua URL (?coupon=...)
  useEffect(() => {
    if (urlCoupon && quote?.available && !appliedCoupon && !couponChecking) {
      applyCouponDirectly(urlCoupon);
    }
  }, [urlCoupon, quote?.available]);

  const applyCouponDirectly = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !roomId || !checkIn || !checkOut) return;
    setCouponInput(cleanCode);
    setCouponChecking(true);
    setCouponError(null);
    try {
      const result = await customerService.validateCoupon({
        room_id: roomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_guests: guests,
        coupon_code: cleanCode,
      });
      if (result.valid) {
        setAppliedCoupon(result);
        message.success(`Đã áp dụng mã ưu đãi ${cleanCode}!`);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message);
      }
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Không thể kiểm tra mã giảm giá');
    } finally {
      setCouponChecking(false);
    }
  };

  const handleApplyCoupon = () => {
    applyCouponDirectly(couponInput);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput('');
  };

  const handlePay = async () => {
    if (!roomId || !checkIn || !checkOut) return;
    setPaying(true);
    setPayError(null);
    try {
      let current = booking;
      if (!current) {
        current = await customerService.createBooking({
          room_id: roomId,
          check_in_date: checkIn,
          check_out_date: checkOut,
          num_guests: guests,
          customer_note: note.trim() || undefined,
          coupon_code: appliedCoupon?.code,
        });
        setBooking(current);
      }
      const link = await customerService.createPaymentUrl(current.id);
      message.loading('Đang chuyển sang cổng thanh toán VNPay...', 0);
      window.location.assign(link.payment_url);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Không thể thanh toán, vui lòng thử lại';
      setPayError(text);
      // Đơn đã hết hạn giữ chỗ hoặc không còn chờ thanh toán: lần bấm sau phải tạo đơn mới
      if (err instanceof ApiError && (err.status === 410 || err.status === 409)) {
        setBooking(null);
      }
      // Mã không còn dùng được lúc tạo đơn (hết lượt, hết hạn...): bỏ mã để khách xem lại giá
      if (err instanceof ApiError && err.status === 422 && appliedCoupon) {
        setAppliedCoupon(null);
        setCouponError(text);
      }
    } finally {
      setPaying(false);
    }
  };

  if (missingParams) {
    return (
      <Result
        status="warning"
        title="Thiếu thông tin đặt phòng"
        subTitle="Vui lòng chọn phòng và ngày lưu trú từ trang chi tiết homestay."
        extra={<Button type="primary" onClick={() => navigate('/')}>Về trang chủ</Button>}
      />
    );
  }

  if (quoteError) {
    return (
      <Result
        status="error"
        title="Không thể tải thông tin đặt phòng"
        subTitle={quoteError}
        extra={<Button type="primary" onClick={() => navigate(-1)}>Quay lại</Button>}
      />
    );
  }

  // Đã tạo đơn thì lấy số server đã chốt; chưa tạo thì dùng kết quả kiểm tra mã
  const discount = booking?.discount_amount ?? appliedCoupon?.discount_amount ?? 0;
  const total = booking ? booking.total_amount : (quote ? quote.total_amount - discount : 0);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Xác nhận và Thanh toán</Title>

      <Row gutter={[32, 32]}>
        <Col xs={24} md={14}>
          <Card title="Chi tiết chuyến đi" style={{ borderRadius: 14, marginBottom: 20 }}>
            {loading || !quote ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <>
                <Text strong style={{ display: 'block', fontSize: 16 }}>{quote.homestay.name}</Text>
                <Text type="secondary">{quote.room_name}</Text>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <Text strong style={{ display: 'block' }}>Ngày nhận phòng (Check-in)</Text>
                    <Text type="secondary">{quote.check_in_date} (từ 14:00)</Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text strong style={{ display: 'block' }}>Ngày trả phòng (Check-out)</Text>
                    <Text type="secondary">{quote.check_out_date} (trước 12:00)</Text>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Khách lưu trú</Text>
                  <Text type="secondary">{quote.num_guests} người</Text>
                </div>
              </>
            )}
          </Card>

          <Card title="Ghi chú cho chủ nhà (không bắt buộc)" style={{ borderRadius: 14, marginBottom: 20 }}>
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={note}
              disabled={!!booking}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: nhận phòng muộn, cần thêm giường phụ..."
            />
          </Card>

          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span><TagOutlined /> Mã giảm giá</span>
                {availableCoupons.length > 0 && !appliedCoupon && !booking && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setCouponModalOpen(true)}
                    style={{ padding: 0, fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <GiftOutlined /> Chọn từ {availableCoupons.length} mã có sẵn
                  </Button>
                )}
              </div>
            }
            style={{ borderRadius: 14, marginBottom: 20 }}
          >
            {appliedCoupon ? (
              <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <Tag color="green" style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px' }}>
                    {appliedCoupon.code}
                  </Tag>
                  <Text type="secondary">{appliedCoupon.name ?? 'Đã áp dụng mã giảm giá'}</Text>
                  <div style={{ color: '#16a34a', fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                    Tiết kiệm được: -{money(appliedCoupon.discount_amount)}
                  </div>
                </div>
                {!booking && <Button type="link" danger onClick={handleRemoveCoupon}>Bỏ mã</Button>}
              </Space>
            ) : (
              <>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Nhập mã giảm giá (ví dụ: STAYAI10, SKIBIDI20...)"
                    value={couponInput}
                    maxLength={50}
                    disabled={!!booking}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onPressEnter={handleApplyCoupon}
                  />
                  <Button
                    type="primary"
                    loading={couponChecking}
                    disabled={!couponInput.trim() || !!booking || loading || !quote?.available}
                    onClick={handleApplyCoupon}
                  >
                    Áp dụng
                  </Button>
                </Space.Compact>

                {/* GỢI Ý MÃ ƯU ĐÃI NHANH */}
                {availableCoupons.length > 0 && !booking && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Mã ưu đãi áp dụng được cho chỗ nghỉ này:
                      </Text>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setCouponModalOpen(true)}
                        style={{ padding: 0, fontSize: 12 }}
                      >
                        Xem tất cả ({availableCoupons.length})
                      </Button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {availableCoupons.slice(0, 3).map((c) => {
                        const meetsMin = (quote?.room_subtotal ?? 0) >= c.min_order_value;
                        return (
                          <Tag
                            key={c.id}
                            color={meetsMin ? 'orange' : 'default'}
                            style={{
                              cursor: meetsMin ? 'pointer' : 'not-allowed',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              transition: 'all 0.2s ease',
                            }}
                            onClick={() => {
                              if (meetsMin && !loading && quote?.available) {
                                applyCouponDirectly(c.code);
                              } else if (!meetsMin) {
                                message.warning(`Đơn tối thiểu để dùng mã ${c.code} là ${money(c.min_order_value)}`);
                              }
                            }}
                          >
                            🏷️ <strong>{c.code}</strong>: {c.discount_type === 'PERCENTAGE' ? `Giảm ${c.discount_value}%` : `Giảm ${money(c.discount_value)}`}
                            {!meetsMin && ' (Chưa đủ điều kiện)'}
                          </Tag>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            {couponError && <Alert type="warning" showIcon style={{ marginTop: 12 }} title={couponError} />}
          </Card>

          <Card style={{ borderRadius: 14, marginBottom: 20 }}>
            <Text strong>Phương thức thanh toán: </Text>
            <Text>Cổng VNPay (QR Pay / Thẻ ATM / Visa / Mastercard)</Text>
          </Card>

          <Card
            style={{
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              border: '1px solid #c4b5fd',
            }}
          >
            <Space align="start">
              <SafetyCertificateOutlined style={{ fontSize: 28, color: '#6366f1', marginTop: 4 }} />
              <div>
                <Text strong style={{ color: '#4338ca', fontSize: 15 }}>
                  Cam kết Bảo vệ Ký quỹ Escrow 24 giờ
                </Text>
                <Paragraph style={{ color: '#475569', margin: '4px 0 0', fontSize: 13 }}>
                  Khoản tiền {money(total)} được giữ an toàn trên hệ thống. Chủ nhà chỉ được giải ngân sau khi bạn nhận phòng thực tế được 24 giờ và không phát sinh khiếu nại.
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <Title level={4} style={{ marginTop: 0 }}>Tóm tắt giá</Title>

            {loading || !quote ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <>
                {quote.nightly_prices.map((n) => (
                  <div key={n.date} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text type="secondary">Đêm {n.date}</Text>
                    <Text>{money(n.price)}</Text>
                  </div>
                ))}
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                    <Text type="secondary">
                      Mã giảm giá <Tag color="green" style={{ marginInlineStart: 4 }}>{booking?.coupon_code ?? appliedCoupon?.code}</Tag>
                    </Text>
                    <Text style={{ color: '#10b981' }} data-testid="discount-line">-{money(discount)}</Text>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                  <Text type="secondary">Phí dịch vụ sàn</Text>
                  <Text style={{ color: '#10b981' }}>Miễn phí</Text>
                </div>

                <Divider style={{ margin: '14px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                  <Text strong style={{ fontSize: 16 }}>Tổng tiền (VNĐ)</Text>
                  <Text strong style={{ fontSize: 24, color: '#6366f1' }}>{money(total)}</Text>
                </div>

                {!quote.available && (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                    title="Rất tiếc, không thể đặt các ngày này"
                    description={
                      <div>
                        {quote.no_price_dates.length > 0 && (
                          <div>
                            Chủ nhà chưa mở bán các đêm: {quote.no_price_dates.join(', ')}. Vui lòng chọn ngày trong
                            khoảng đã có giá.
                          </div>
                        )}
                        {quote.held_dates.length > 0 && (
                          <div>
                            Các đêm đã có người giữ chỗ hoặc đã đặt: {quote.held_dates.join(', ')}. Nếu bạn vừa bấm
                            thanh toán, phòng đang được giữ cho đơn chờ thanh toán của chính bạn trong 15 phút: hãy vào{' '}
                            <a onClick={() => navigate('/trips')}>Chuyến đi của tôi</a> để thanh toán tiếp.
                          </div>
                        )}
                      </div>
                    }
                  />
                )}
                {booking && (
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    title={`Đã giữ chỗ cho bạn đến ${formatTime(booking.payment_deadline)}`}
                    description={`Mã đơn ${booking.booking_code}. Vui lòng hoàn tất thanh toán trước thời điểm này.`}
                  />
                )}
                {payError && <Alert type="error" showIcon style={{ marginBottom: 16 }} title={payError} />}

                <Button
                  type="primary"
                  size="large"
                  block
                  loading={paying}
                  disabled={!quote.available}
                  onClick={handlePay}
                  icon={<CheckCircleFilled />}
                  style={{ height: 48, borderRadius: 10, fontWeight: 600 }}
                >
                  {booking ? 'Tiếp tục thanh toán VNPay' : 'Thanh toán VNPay'}
                </Button>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12 }}>
                  Phòng được giữ 15 phút kể từ khi bạn bấm thanh toán
                </Text>
              </>
            )}
          </Card>
        </Col>
      </Row>
      {/* MODAL DANH SÁCH MÃ GIẢM GIÁ */}
      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: '#ea580c', fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 17 }}>Mã giảm giá & Ưu đãi áp dụng</span>
          </Space>
        }
        open={couponModalOpen}
        onCancel={() => setCouponModalOpen(false)}
        footer={null}
        width={560}
      >
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
          {availableCoupons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              Hiện chưa có mã giảm giá nào cho chỗ nghỉ này.
            </div>
          ) : (
            availableCoupons.map((c) => {
              const subtotal = quote?.room_subtotal ?? 0;
              const meetsMin = subtotal >= c.min_order_value;
              const isApplied = appliedCoupon?.code === c.code;

              let estimatedSaving = 0;
              if (c.discount_type === 'PERCENTAGE') {
                estimatedSaving = Math.floor((subtotal * c.discount_value) / 100);
                if (c.max_discount) estimatedSaving = Math.min(estimatedSaving, c.max_discount);
              } else {
                estimatedSaving = c.discount_value;
              }

              return (
                <div
                  key={c.id}
                  style={{
                    border: isApplied ? '2px solid #16a34a' : meetsMin ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                    background: isApplied ? '#f0fdf4' : meetsMin ? '#fffaf5' : '#f8fafc',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Tag color="orange" style={{ fontWeight: 800, fontSize: 13, padding: '2px 8px' }}>
                        {c.code}
                      </Tag>
                      {c.sponsor_by === 'PLATFORM' ? (
                        <Tag color="blue" style={{ fontSize: 11 }}>Sàn StayAI</Tag>
                      ) : (
                        <Tag color="purple" style={{ fontSize: 11 }}>Chủ nhà</Tag>
                      )}
                      {isApplied && <Tag color="green">Đang áp dụng</Tag>}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                      {c.discount_type === 'PERCENTAGE'
                        ? `Giảm ${c.discount_value}%${c.max_discount ? ` (Tối đa ${money(c.max_discount)})` : ''}`
                        : `Giảm ${money(c.discount_value)}`}
                    </div>

                    {c.name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{c.name}</div>}

                    <div style={{ fontSize: 12, color: meetsMin ? '#16a34a' : '#ea580c', marginTop: 4, fontWeight: 500 }}>
                      {meetsMin ? (
                        <span>✓ Đủ điều kiện: Tiết kiệm ước tính ~<strong>{money(estimatedSaving)}</strong></span>
                      ) : (
                        <span>⚠️ Đơn tối thiểu: {money(c.min_order_value)} (cần thêm {money(c.min_order_value - subtotal)})</span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isApplied ? (
                      <Button
                        type="default"
                        danger
                        size="small"
                        onClick={() => {
                          handleRemoveCoupon();
                          setCouponModalOpen(false);
                        }}
                      >
                        Bỏ chọn
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="middle"
                        disabled={!meetsMin || loading || !quote?.available}
                        style={{
                          borderRadius: 8,
                          background: meetsMin ? '#ea580c' : undefined,
                          borderColor: meetsMin ? '#ea580c' : undefined,
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          applyCouponDirectly(c.code);
                          setCouponModalOpen(false);
                        }}
                      >
                        Áp dụng
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
