import { useEffect, useState } from 'react';
import { Button, Card, Result, Spin, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { PaymentStatusInfo } from '../../types/customer';

const { Text } = Typography;

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60 giây chờ IPN của VNPay

/**
 * Trang VNPay đưa khách về. Tham số `status` trên URL chỉ là gợi ý để hiển thị;
 * trạng thái thật do IPN ghi vào DB nên luôn hỏi lại server (BR-010).
 */
export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('payment_id');
  const hint = searchParams.get('status');

  const [info, setInfo] = useState<PaymentStatusInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;

    const tick = async () => {
      try {
        const payment = await customerService.getPayment(paymentId);
        if (cancelled) return;
        setInfo(payment);
        if (payment.status === 'PENDING') {
          if (polls++ < MAX_POLLS) timer = setTimeout(tick, POLL_INTERVAL_MS);
          else setGaveUp(true);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không kiểm tra được trạng thái thanh toán');
      }
    };
    void tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentId]);

  const actions = [
    <Button key="trips" type="primary" onClick={() => navigate('/trips')}>
      Xem chuyến đi của tôi
    </Button>,
    <Button key="home" onClick={() => navigate('/')}>
      Về trang chủ
    </Button>,
  ];

  let content: React.ReactNode;
  if (!paymentId || hint === 'invalid') {
    content = (
      <Result
        status="warning"
        title="Không xác minh được kết quả thanh toán"
        subTitle="Thông tin trả về không hợp lệ. Nếu tài khoản ngân hàng đã bị trừ tiền, vui lòng kiểm tra mục Chuyến đi của tôi hoặc liên hệ hỗ trợ."
        extra={actions}
      />
    );
  } else if (error) {
    content = <Result status="error" title="Không kiểm tra được trạng thái" subTitle={error} extra={actions} />;
  } else if (!info) {
    content = (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <Text style={{ display: 'block', marginTop: 16 }}>Đang kiểm tra kết quả thanh toán...</Text>
      </div>
    );
  } else if (info.status === 'SUCCESS') {
    const ota = info.ota_fulfillment;

    content = (
      <div>
        <Result
          status="success"
          title="Thanh toán thành công!"
          subTitle={`Mã đơn ${info.booking_code}. Số tiền ${info.amount.toLocaleString('vi-VN')}đ đã được thanh toán an toàn.`}
          style={{ paddingBottom: ota ? 0 : 24 }}
        />

        {ota && (
          <div
            style={{
              background: 'linear-gradient(135deg, #003580 0%, #00224f 100%)',
              color: '#fff',
              borderRadius: 16,
              padding: '24px',
              margin: '0 24px 24px',
              boxShadow: '0 10px 25px rgba(0, 53, 128, 0.25)',
              border: '1px solid #1a4d8f',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏨</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
                    Xác nhận đặt phòng tự động qua Booking.com
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Kênh liên kết đối tác quốc tế B2B (Demand API)
                  </div>
                </div>
              </div>
              <span
                style={{
                  background: '#00ba74',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ✓ ĐÃ XÁC NHẬN
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mã đặt chỗ Booking.com</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ffb700', marginTop: 2, letterSpacing: 0.5 }}>
                  {ota.ota_booking_code}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mã PIN nhận phòng</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', marginTop: 2, letterSpacing: 1 }}>
                  {ota.pin_code}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mã PNR Quốc tế</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#67e8f9', marginTop: 2, letterSpacing: 0.5 }}>
                  {ota.pnr_code}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, borderLeft: '3px solid #ffb700' }}>
              <strong>Hướng dẫn nhận phòng tại lễ tân:</strong>
              <div style={{ marginTop: 4, opacity: 0.9 }}>
                Đơn phòng của bạn đã được thanh toán 100% bằng thẻ thanh toán ảo B2B (VCC). Khi đến homestay/khách sạn <strong>{ota.hotel_name}</strong>, bạn chỉ cần xuất trình <strong>Mã đặt chỗ ({ota.ota_booking_code})</strong> hoặc <strong>Mã PIN ({ota.pin_code})</strong> cho lễ tân để nhận phòng trực tiếp.
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '0 24px 24px' }}>
          {actions}
        </div>
      </div>
    );
  } else if (info.status === 'FAILED') {
    content = (
      <Result
        status="error"
        title="Thanh toán không thành công"
        subTitle={`Đơn ${info.booking_code} chưa được thanh toán. Nếu còn trong thời gian giữ chỗ, bạn có thể thanh toán lại ở mục Chuyến đi của tôi.`}
        extra={actions}
      />
    );
  } else if (gaveUp) {
    content = (
      <Result
        status="info"
        title="Chưa nhận được xác nhận từ VNPay"
        subTitle={`Đơn ${info.booking_code} vẫn đang chờ xác nhận. Vui lòng KHÔNG thanh toán lại; hãy kiểm tra mục Chuyến đi của tôi sau ít phút.`}
        extra={actions}
      />
    );
  } else {
    content = (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <Text style={{ display: 'block', marginTop: 16 }}>
          Đang chờ VNPay xác nhận giao dịch của đơn {info.booking_code}...
        </Text>
      </div>
    );
  }

  return <Card style={{ maxWidth: 720, margin: '24px auto', borderRadius: 14 }}>{content}</Card>;
}
