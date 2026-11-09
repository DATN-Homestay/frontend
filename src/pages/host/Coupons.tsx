import { useState, useEffect, useCallback } from 'react';
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
  Radio,
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

  const selectedDiscountType = Form.useWatch('discount_type', form) || 'PERCENTAGE';
  const isPercent = selectedDiscountType === 'PERCENT' || selectedDiscountType === 'PERCENTAGE';

  const fetchCoupons = useCallback(() => {
    return hostService
      .getCoupons()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        setCoupons(list);
      })
      .catch(() => {
        // Fallback demo coupons
        setCoupons([
          {
            id: '1',
            code: 'WELCOME10',
            discount_type: 'PERCENTAGE',
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
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loadCoupons = (...args: Parameters<typeof fetchCoupons>) => {
    setLoading(true);
    return fetchCoupons(...args);
  };

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreateCoupon = async (values: any) => {
    setSubmitting(true);
    try {
      const [start, end] = values.date_range;
      const normalizedType = values.discount_type === 'PERCENT' ? 'PERCENTAGE' : values.discount_type;
      await hostService.createCoupon({
        code: values.code.trim().toUpperCase(),
        name: values.name?.trim() || undefined,
        discount_type: normalizedType,
        discount_value: Number(values.discount_value),
        min_order_value: values.min_order_value ? Number(values.min_order_value) : undefined,
        max_discount:
          values.discount_type === 'PERCENTAGE' && values.max_discount ? Number(values.max_discount) : undefined,
        usage_limit: values.usage_limit ? Number(values.usage_limit) : undefined,
        per_user_limit: values.per_user_limit ? Number(values.per_user_limit) : undefined,
        target_audience: values.target_audience || 'ALL',
        loyalty_condition_type: values.target_audience === 'LOYALTY' ? (values.loyalty_condition_type || 'OR') : undefined,
        min_completed_bookings: values.target_audience === 'LOYALTY' && values.min_completed_bookings ? Number(values.min_completed_bookings) : undefined,
        min_total_spent: values.target_audience === 'LOYALTY' && values.min_total_spent ? Number(values.min_total_spent) : undefined,
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
      const res = await hostService.deleteCoupon(id);
      const info = res?.data?.data ?? (res?.data as { deactivated?: boolean; message?: string } | undefined);
      message.success(info?.deactivated ? 'Mã đã có lượt dùng nên được tắt thay vì xóa' : 'Đã xóa mã voucher!');
      loadCoupons();
    } catch (err: any) {
      message.error(err.message || 'Xóa coupon thất bại');
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
      render: (_: any, r: HostCoupon) => {
        const percent = r.discount_type === 'PERCENT' || (r.discount_type as any) === 'PERCENTAGE';
        return (
          <strong style={{ color: '#10b981', fontSize: 15 }}>
            {percent
              ? `Giảm ${r.discount_value}%`
              : `Giảm ${Number(r.discount_value).toLocaleString('vi-VN')}đ`}
          </strong>
        );
      },
    },
    {
      title: 'Đối Tượng Áp Dụng',
      key: 'target_audience',
      render: (_: any, r: HostCoupon) => {
        if (r.target_audience === 'LOYALTY') {
          const parts: string[] = [];
          if (r.min_completed_bookings) parts.push(`≥ ${r.min_completed_bookings} đơn`);
          if (r.min_total_spent) parts.push(`≥ ${(Number(r.min_total_spent) / 1000000).toFixed(1).replace('.0', '')}tr`);
          const op = r.loyalty_condition_type === 'AND' ? ' VÀ ' : ' HOẶC ';
          return (
            <div>
              <Tag color="purple" style={{ fontWeight: 600 }}>👑 Khách thân thiết</Tag>
              {parts.length > 0 && (
                <div style={{ fontSize: 11, color: '#6b21a8', marginTop: 2, fontWeight: 500 }}>
                  ({parts.join(op)})
                </div>
              )}
            </div>
          );
        }
        return <Tag color="blue">Tất cả khách</Tag>;
      },
    },
    {
      title: 'Đơn Tối Thiểu',
      dataIndex: 'min_order_value',
      key: 'min_order_value',
      render: (val?: number) =>
        val ? `${Number(val).toLocaleString('vi-VN')}đ` : <Text type="secondary">Không giới hạn</Text>,
    },
    {
      title: 'Đã Dùng',
      key: 'usage',
      render: (_: any, r: HostCoupon) => (
        <span>
          {r.used_count ?? 0}
          {r.usage_limit ? ` / ${r.usage_limit}` : ' / không giới hạn'}
        </span>
      ),
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
        if (r.is_active === 0) return <Tag color="default">Đã tắt</Tag>;
        if (isExpired) return <Tag color="default">Đã hết hạn</Tag>;
        if (r.usage_limit && (r.used_count ?? 0) >= r.usage_limit) return <Tag color="warning">Hết lượt</Tag>;
        return <Tag color="success">Đang hoạt động</Tag>;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_: any, r: HostCoupon) => (
        <Popconfirm
          title="Xác nhận xóa mã ưu đãi này?"
          okText="Xóa"
          cancelText="Hủy"
          onConfirm={() => handleDeleteCoupon(r.id)}
        >
          <Button danger type="text" icon={<DeleteOutlined />}>
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
          onClick={() => {
            form.resetFields();
            setModalOpen(true);
          }}
          style={{ background: '#4f46e5' }}
        >
          + Tạo Mã Ưu Đãi Mới
        </Button>
      </div>

      <Card style={{ borderRadius: 14 }}>
        <Table
          dataSource={Array.isArray(coupons) ? coupons : []}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: ['8', '16', '32'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mã ưu đãi`,
          }}
        />
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCoupon}
          initialValues={{ discount_type: 'PERCENTAGE', discount_value: 10, target_audience: 'ALL', loyalty_condition_type: 'OR' }}
        >
          <Form.Item
            label="Mã Khuyến Mãi (Viết hoa, không dấu, liền nhau)"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã coupon' }]}
          >
            <Input placeholder="Ví dụ: STAYAI20, DATPHONG10..." size="large" style={{ textTransform: 'uppercase', fontWeight: 700 }} />
          </Form.Item>

          <Form.Item label="Hình Thức Giảm Giá" name="discount_type" rules={[{ required: true }]}>
            <Select size="large">
              <Select.Option value="PERCENTAGE">Giảm theo tỷ lệ phần trăm (%)</Select.Option>
              <Select.Option value="FIXED_AMOUNT">Giảm số tiền cố định (VNĐ)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={isPercent ? 'Tỷ Lệ Giảm (%)' : 'Số Tiền Giảm (VNĐ)'}
            name="discount_value"
            rules={[
              { required: true, message: 'Vui lòng nhập giá trị giảm' },
              ...(isPercent ? [{ type: 'number' as const, max: 100, message: 'Tỷ lệ giảm tối đa là 100%' }] : []),
            ]}
          >
            <InputNumber
              min={1}
              max={isPercent ? 100 : undefined}
              style={{ width: '100%' }}
              size="large"
              placeholder={isPercent ? 'Ví dụ: 10 (cho 10%)' : 'Ví dụ: 50000 (cho 50.000 VNĐ)'}
              formatter={isPercent ? undefined : (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.discount_type !== cur.discount_type}>
            {({ getFieldValue }) =>
              getFieldValue('discount_type') === 'PERCENTAGE' ? (
                <Form.Item label="Giảm Tối Đa (VNĐ, không bắt buộc)" name="max_discount">
                  <InputNumber min={1000} step={10000} style={{ width: '100%' }} size="large" placeholder="Ví dụ: 200000 để giảm không quá 200k" />
                </Form.Item>
              ) : null
            }
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

          {/* ĐỐI TƯỢNG ÁP DỤNG: TẤT CẢ VS KHÁCH HÀNG THÂN THIẾT */}
          <Form.Item label="Đối Tượng Khách Hàng Áp Dụng" name="target_audience" rules={[{ required: true }]}>
            <Radio.Group size="large" buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
              <Radio.Button value="ALL" style={{ flex: 1, textAlign: 'center' }}>
                Tất cả khách hàng (Đại trà)
              </Radio.Button>
              <Radio.Button value="LOYALTY" style={{ flex: 1, textAlign: 'center' }}>
                👑 Khách hàng thân thiết / VIP
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.target_audience !== cur.target_audience}>
            {({ getFieldValue }) =>
              getFieldValue('target_audience') === 'LOYALTY' ? (
                <div
                  style={{
                    background: '#f5f3ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: 10,
                    padding: '16px',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#4338ca', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👑</span> Thiết lập điều kiện Khách Thân Thiết (Tại các homestay của bạn)
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 14 }}>
                    Hệ thống sẽ tự động đối soát dựa trên lịch sử các đơn đặt phòng thành công của khách tại các homestay thuộc sở hữu của bạn.
                  </Text>

                  <Form.Item
                    label="Quy tắc kết hợp điều kiện"
                    name="loyalty_condition_type"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Radio.Group>
                      <Radio value="OR">
                        <strong>Thỏa 1 trong 2 điều kiện (HOẶC)</strong> - <em>Dễ tiếp cận</em>
                      </Radio>
                      <Radio value="AND">
                        <strong>Bắt buộc thỏa cả 2 điều kiện (VÀ)</strong> - <em>Đặc quyền VIP cao cấp</em>
                      </Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Space style={{ width: '100%' }} size={12} align="start">
                    <Form.Item
                      label="Số lần đặt phòng tối thiểu (Lần)"
                      name="min_completed_bookings"
                      style={{ flex: 1 }}
                    >
                      <InputNumber
                        min={1}
                        max={100}
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Ví dụ: 2 (cho khách quay lại)"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Tổng chi tiêu tích lũy tối thiểu (VNĐ)"
                      name="min_total_spent"
                      style={{ flex: 1 }}
                    >
                      <InputNumber
                        min={1000}
                        step={500000}
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Ví dụ: 2000000"
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      />
                    </Form.Item>
                  </Space>
                </div>
              ) : null
            }
          </Form.Item>

          <Space style={{ width: '100%' }} size={12} align="start">
            <Form.Item label="Tổng Số Lượt Dùng" name="usage_limit" style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="Để trống = không giới hạn" />
            </Form.Item>
            <Form.Item label="Số Lượt Mỗi Khách" name="per_user_limit" style={{ flex: 1 }}>
              <InputNumber min={1} max={1000} style={{ width: '100%' }} size="large" />
            </Form.Item>
          </Space>

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
