import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, TagOutlined, DeleteOutlined, GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { hostService } from '../../services/hostService';
import type { HostCoupon } from '../../types/host';

const { Title, Text } = Typography;

export default function HostCouponsPage() {
  const [coupons, setCoupons] = useState<HostCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await hostService.getCoupons();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setCoupons(list);
    } catch {
      // Fallback demo coupons
      setCoupons([
        {
          id: '1',
          code: 'WELCOME10',
          discount_type: 'PERCENT',
          discount_value: 10,
          min_order_value: 1000000,
          start_date: '2026-10-01',
          end_date: '2026-11-30',
          is_active: 1,
          created_at: '2026-10-01',
        },
        {
          id: '2',
          code: 'CUOITUAN50K',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 50000,
          min_order_value: 500000,
          start_date: '2026-10-15',
          end_date: '2026-10-31',
          is_active: 1,
          created_at: '2026-10-15',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (values: any) => {
    setSubmitting(true);
    try {
      const [start, end] = values.date_range;
      await hostService.createCoupon({
        code: values.code.trim().toUpperCase(),
        discount_type: values.discount_type,
        discount_value: Number(values.discount_value),
        min_order_value: values.min_order_value ? Number(values.min_order_value) : undefined,
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD'),
      });
      message.success('Tạo mã giảm giá thành công!');
      setModalOpen(false);
      form.resetFields();
      loadCoupons();
    } catch (err: any) {
      message.error(err.message || 'Tạo coupon thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await hostService.deleteCoupon(id);
      message.success('Đã xóa mã giảm giá');
      loadCoupons();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const columns = [
    {
      title: 'Mã Giảm Giá',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Tag color="purple" style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px' }}>
            <TagOutlined /> {code}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Mức Giảm',
      key: 'discount',
      render: (_: any, r: HostCoupon) => (
        <strong style={{ color: '#10b981', fontSize: 15 }}>
          {r.discount_type === 'PERCENT'
            ? `Giảm ${r.discount_value}%`
            : `Giảm ${Number(r.discount_value).toLocaleString('vi-VN')}đ`}
        </strong>
      ),
    },
    {
      title: 'Đơn Tối Thiểu',
      dataIndex: 'min_order_value',
      key: 'min_order_value',
      render: (val?: number) =>
        val ? `${Number(val).toLocaleString('vi-VN')}đ` : <Text type="secondary">Không giới hạn</Text>,
    },
    {
      title: 'Thời Gian Áp Dụng',
      key: 'dates',
      render: (_: any, r: HostCoupon) => (
        <span>
          {dayjs(r.start_date).format('DD/MM/YYYY')} ➔ {dayjs(r.end_date).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      render: (_: any, r: HostCoupon) => {
        const isExpired = dayjs().isAfter(dayjs(r.end_date), 'day');
        if (isExpired) return <Tag color="default">Đã hết hạn</Tag>;
        return <Tag color="success">Đang hoạt động</Tag>;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_: any, r: HostCoupon) => (
        <Popconfirm
          title="Xác nhận xóa mã này?"
          onConfirm={() => handleDeleteCoupon(r.id)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            Xóa
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Quản Lý Mã Giảm Giá &amp; Khuyến Mãi</Title>
          <Text type="secondary">Tạo các voucher kích cầu du lịch cho homestay của bạn để thu hút khách đặt phòng</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setModalOpen(true)}
          style={{ background: '#4f46e5' }}
        >
          + Tạo Mã Ưu Đãi Mới
        </Button>
      </div>

      <Card style={{ borderRadius: 14 }}>
        <Table dataSource={Array.isArray(coupons) ? coupons : []} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* CREATE COUPON MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GiftOutlined style={{ color: '#4f46e5' }} />
            <span>Tạo Mã Ưu Đãi Giảm Giá Cho Khách Hàng</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCoupon} initialValues={{ discount_type: 'PERCENT', discount_value: 10 }}>
          <Form.Item
            label="Mã Khuyến Mãi (Viết hoa, không dấu, liền nhau)"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã coupon' }]}
          >
            <Input placeholder="Ví dụ: STAYAI20, DATPHONG10..." size="large" style={{ textTransform: 'uppercase', fontWeight: 700 }} />
          </Form.Item>

          <Form.Item label="Hình Thức Giảm Giá" name="discount_type" rules={[{ required: true }]}>
            <Select size="large">
              <Select.Option value="PERCENT">Giảm theo tỷ lệ phần trăm (%)</Select.Option>
              <Select.Option value="FIXED_AMOUNT">Giảm số tiền cố định (VNĐ)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Giá Trị Giảm" name="discount_value" rules={[{ required: true, message: 'Vui lòng nhập giá trị giảm' }]}>
            <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="Ví dụ: 10 (cho 10%) hoặc 50000 (cho 50k VNĐ)" />
          </Form.Item>

          <Form.Item label="Giá Trị Đơn Hàng Tối Thiểu (VNĐ)" name="min_order_value">
            <InputNumber
              min={0}
              step={100000}
              style={{ width: '100%' }}
              size="large"
              placeholder="Để trống nếu không yêu cầu giá trị tối thiểu"
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            label="Thời Hạn Áp Dụng (Từ ngày ➔ Đến ngày)"
            name="date_range"
            rules={[{ required: true, message: 'Vui lòng chọn thời hạn' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={submitting} style={{ background: '#4f46e5', height: 44 }}>
            Tạo Mã Giảm Giá
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
