import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Divider, Input, Result, Row, Skeleton, Space, Typography } from 'antd';
import { CheckCircleFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { ApiError } from '../../services/apiClient';
import type { BookingQuote, CreatedBooking } from '../../types/customer';

const { Title, Text, Paragraph } = Typography;

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

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

  const total = quote?.total_amount ?? 0;

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
    </div>
  );
}
