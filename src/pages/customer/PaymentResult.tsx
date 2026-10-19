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
    content = (
      <Result
        status="success"
        title="Thanh toán thành công!"
        subTitle={`Mã đơn ${info.booking_code}. Số tiền ${info.amount.toLocaleString('vi-VN')}đ đang được giữ an toàn trong ký quỹ Escrow cho đến khi bạn nhận phòng.`}
        extra={actions}
      />
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
