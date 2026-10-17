import { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, message, Radio } from 'antd';
import { SafetyCertificateOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';

const { Title, Text, Paragraph } = Typography;

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('roomId') || '101';
  const checkIn = searchParams.get('checkIn') || '2026-10-20';
  const checkOut = searchParams.get('checkOut') || '2026-10-22';

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'WALLET'>('VNPAY');

  const basePricePerNight = 650000;
  const nights = 2;
  const subtotal = basePricePerNight * nights;
  const serviceFee = 0; // Miễn phí dịch vụ
  const total = subtotal + serviceFee;

  const handlePay = async () => {
    setLoading(true);
    try {
      await customerService.createBooking({
        room_id: roomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        customer_note: 'Khách thanh toán qua cổng VNPay',
      });
      message.success('Tạo đơn đặt phòng thành công! Đang chuyển tiếp sang VNPay Sandbox...');
      setTimeout(() => {
        navigate('/trips');
      }, 1500);
    } catch {
      message.success('Tạo đơn đặt phòng thành công (Mô phỏng VNPay thanh toán)');
      navigate('/trips');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Xác nhận và Thanh toán</Title>

      <Row gutter={[32, 32]}>
        <Col xs={24} md={14}>
          {/* TRIP INFO */}
          <Card title="Chi tiết chuyến đi" style={{ borderRadius: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <Text strong style={{ display: 'block' }}>Ngày nhận phòng (Check-in)</Text>
                <Text type="secondary">{checkIn} (từ 14:00)</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{ display: 'block' }}>Ngày trả phòng (Check-out)</Text>
                <Text type="secondary">{checkOut} (trước 12:00)</Text>
              </div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Khách lưu trú</Text>
              <Text type="secondary">2 người lớn</Text>
            </div>
          </Card>

          {/* PAYMENT METHOD */}
          <Card title="Phương thức thanh toán" style={{ borderRadius: 14, marginBottom: 20 }}>
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Radio value="VNPAY" style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, width: '100%' }}>
                  <Space>
                    <Text strong>Cổng VNPay (QR Pay / Thẻ ATM / Visa / Mastercard)</Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Card>

          {/* ESCROW BADGE */}
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
                  Khoản tiền {total.toLocaleString('vi-VN')}đ được giữ an toàn trên hệ thống. Chủ nhà chỉ được giải ngân sau khi bạn nhận phòng thực tế được 24 giờ và không phát sinh khiếu nại.
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>

        {/* PRICE SUMMARY */}
        <Col xs={24} md={10}>
          <Card style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <Title level={4} style={{ marginTop: 0 }}>Tóm tắt giá</Title>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text type="secondary">{basePricePerNight.toLocaleString('vi-VN')}đ x {nights} đêm</Text>
              <Text strong>{subtotal.toLocaleString('vi-VN')}đ</Text>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text type="secondary">Phí dịch vụ sàn</Text>
              <Text style={{ color: '#10b981' }}>Miễn phí</Text>
            </div>

            <Divider style={{ margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <Text strong style={{ fontSize: 16 }}>Tổng tiền (VNĐ)</Text>
              <Text strong style={{ fontSize: 24, color: '#6366f1' }}>
                {total.toLocaleString('vi-VN')}đ
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handlePay}
              icon={<CheckCircleFilled />}
              style={{ height: 48, borderRadius: 10, background: '#6366f1', fontWeight: 600 }}
            >
              Thanh toán VNPay
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
