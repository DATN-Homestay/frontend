import { useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Input, Modal, Skeleton, Typography } from 'antd';
import { customerService } from '../services/customerService';
import { ApiError } from '../services/apiClient';
import type { CancellationQuote, MyBookingItem } from '../types/customer';

const { Text } = Typography;

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const MIN_REASON = 5;

interface Props {
  booking: MyBookingItem;
  onClose: () => void;
  /** Gọi sau khi hủy thành công để trang cha tải lại danh sách */
  onCancelled: () => void;
}

/**
 * Hộp thoại hủy đơn: hiện số tiền được hoàn THEO CHÍNH SÁCH do server tính trước khi khách xác nhận.
 * Cha render kèm `key={booking.id}` để mỗi đơn có trạng thái riêng.
 */
export default function CancelBookingModal({ booking, onClose, onCancelled }: Props) {
  const { message } = App.useApp();
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Tăng lên để tải lại báo giá (khi số tiền hoàn đã thay đổi)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    customerService
      .getCancellationQuote(booking.id)
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được thông tin hủy đơn');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking.id, version]);

  const confirm = async () => {
    if (!quote) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await customerService.cancelBooking(booking.id, {
        reason: reason.trim(),
        expected_refund_amount: quote.refund_amount,
      });
      message.success(result.message);
      onCancelled();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Hủy đơn thất bại, vui lòng thử lại');
      // Số tiền hoàn đổi giữa lúc xem và lúc xác nhận (VD: vừa qua mốc chính sách): tải lại để khách thấy số mới
      if (err instanceof ApiError && err.status === 409) {
        setLoading(true);
        setVersion((v) => v + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = !!quote?.can_cancel && reason.trim().length >= MIN_REASON && !submitting && !loading;

  return (
    <Modal
      open
      title={`Hủy đơn ${booking.booking_code}`}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="close" onClick={onClose}>
          Giữ đơn
        </Button>,
        <Button key="confirm" danger type="primary" loading={submitting} disabled={!canConfirm} onClick={confirm}>
          Xác nhận hủy
        </Button>,
      ]}
    >
      {loadError ? (
        <Alert type="error" showIcon title={loadError} />
      ) : loading || !quote ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : !quote.can_cancel ? (
        <Alert type="warning" showIcon title="Không thể hủy đơn này" description={quote.reason_cannot} />
      ) : (
        <>
          {quote.rule && <Alert type="info" showIcon title={quote.rule} style={{ marginBottom: 16 }} />}

          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
            items={[
              { key: 'paid', label: 'Số tiền bạn đã thanh toán', children: money(quote.paid_amount) },
              {
                key: 'refund',
                label: 'Số tiền được hoàn lại',
                children: (
                  <Text strong style={{ color: quote.refund_amount > 0 ? '#10b981' : '#ef4444', fontSize: 16 }}>
                    {money(quote.refund_amount)}
                    {quote.refund_amount > 0 && ` (${quote.refund_percent}% giá trị đơn)`}
                  </Text>
                ),
              },
              ...(quote.retained_amount > 0
                ? [{ key: 'retained', label: 'Phần giữ lại cho chủ nhà', children: money(quote.retained_amount) }]
                : []),
              ...(quote.hours_before_check_in !== null
                ? [{ key: 'hours', label: 'Còn đến giờ nhận phòng', children: `${Math.max(0, Math.floor(quote.hours_before_check_in))} giờ` }]
                : []),
            ]}
          />

          {quote.refund_amount > 0 && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              Tiền được hoàn về đúng phương thức bạn đã dùng để thanh toán. Thời gian về tài khoản phụ thuộc ngân hàng.
            </Text>
          )}

          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Lý do hủy
          </Text>
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Vui lòng cho biết lý do (tối thiểu ${MIN_REASON} ký tự)`}
          />
          {submitError && <Alert type="error" showIcon title={submitError} style={{ marginTop: 12 }} />}
        </>
      )}
    </Modal>
  );
}
