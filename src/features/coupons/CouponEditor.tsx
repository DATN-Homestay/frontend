import { useState } from "react";
import {
  Alert,
  App,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { couponService } from "../../services/couponService";
import type {
  Coupon,
  CouponPayload,
  CouponUpdate,
  DiscountType,
} from "./coupon.types";

const vietnamDay = (value?: string) =>
  dayjs(
    (value ? new Date(value) : new Date()).toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );

interface FormValues {
  code: string;
  name?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  per_user_limit: number;
  date_range: [Dayjs, Dayjs];
  target_audience: "ALL" | "LOYALTY";
  loyalty_condition_type: "OR" | "AND";
  min_completed_bookings?: number | null;
  min_total_spent?: number | null;
}

export default function CouponEditor({
  role,
  coupon,
  open,
  onClose,
  onSaved,
}: {
  role: "host" | "admin";
  coupon: Coupon | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discountType = Form.useWatch("discount_type", form);
  const audience = Form.useWatch("target_audience", form);
  const locked = !!coupon && coupon.used_count > 0;

  const [initialValues] = useState(() =>
    coupon
      ? {
          ...coupon,
          name: coupon.name ?? "",
          discount_value: Number(coupon.discount_value),
          min_order_value: Number(coupon.min_order_value),
          max_discount:
            coupon.max_discount === null ? null : Number(coupon.max_discount),
          min_total_spent:
            coupon.min_total_spent === null
              ? null
              : Number(coupon.min_total_spent),
          date_range: [
            vietnamDay(coupon.start_date),
            vietnamDay(coupon.end_date),
          ],
        }
      : {
          discount_type: "PERCENTAGE",
          discount_value: 10,
          min_order_value: 0,
          per_user_limit: 1,
          target_audience: "ALL",
          loyalty_condition_type: "OR",
          date_range: [vietnamDay(), vietnamDay().add(30, "day")],
        },
  );

  const save = async (values: FormValues) => {
    if (
      values.target_audience === "LOYALTY" &&
      !values.min_completed_bookings &&
      !values.min_total_spent
    ) {
      setError("Hãy nhập ít nhất một điều kiện dành cho khách thân thiết.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const terms = {
        name: values.name?.trim() || "",
        end_date: values.date_range[1].format("YYYY-MM-DD"),
        usage_limit: values.usage_limit ?? null,
        per_user_limit: values.per_user_limit,
      };
      const payload: CouponPayload = {
        ...terms,
        code: values.code.trim().toUpperCase(),
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        min_order_value: values.min_order_value,
        max_discount:
          values.discount_type === "PERCENTAGE"
            ? (values.max_discount ?? null)
            : null,
        start_date: values.date_range[0].format("YYYY-MM-DD"),
        target_audience: values.target_audience,
        loyalty_condition_type: values.loyalty_condition_type,
        min_completed_bookings:
          values.target_audience === "LOYALTY"
            ? (values.min_completed_bookings ?? null)
            : null,
        min_total_spent:
          values.target_audience === "LOYALTY"
            ? (values.min_total_spent ?? null)
            : null,
      };
      if (coupon) {
        const changes: CouponUpdate & { code?: string } = { ...payload };
        delete changes.code;
        const update: CouponUpdate = locked ? terms : changes;
        await couponService.update(role, coupon.id, update);
      } else {
        await couponService.create(role, payload);
      }
      message.success(
        coupon ? "Đã cập nhật mã giảm giá." : "Đã tạo mã giảm giá.",
      );
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể lưu mã giảm giá.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={coupon ? `Sửa mã ${coupon.code}` : "Tạo mã giảm giá"}
      open={open}
      onCancel={() => {
        if (!saving) onClose();
      }}
      onOk={() => form.submit()}
      afterClose={() => setError(null)}
      okText={coupon ? "Lưu thay đổi" : "Tạo mã"}
      cancelText="Hủy"
      confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }}
      mask={{ closable: !saving }}
      width={680}
    >
      <Form
        form={form}
        initialValues={initialValues}
        layout="vertical"
        onFinish={save}
        disabled={saving}
        style={{ marginTop: 20 }}
      >
        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            style={{ marginBottom: 16 }}
          />
        )}
        {locked && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title="Mã đã có lượt sử dụng. Bạn có thể sửa tên, hạn kết thúc và giới hạn lượt dùng."
          />
        )}
        <Row gutter={16}>
          <Col xs={24} sm={10}>
            <Form.Item
              name="code"
              label="Mã giảm giá"
              normalize={(value: string) => value.trim().toUpperCase()}
              rules={[
                { required: true, message: "Nhập mã giảm giá." },
                {
                  pattern: /^[A-Za-z0-9_-]{4,30}$/,
                  message:
                    "Mã gồm 4–30 chữ, số, dấu gạch ngang hoặc gạch dưới.",
                },
              ]}
            >
              <Input
                disabled={!!coupon}
                maxLength={30}
                placeholder="VD: HEDULICH10"
                style={{ textTransform: "uppercase" }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={14}>
            <Form.Item
              name="name"
              label="Tên chương trình"
              rules={[{ max: 150 }]}
            >
              <Input maxLength={150} placeholder="Ưu đãi đặt phòng mùa hè" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="discount_type"
              label="Hình thức giảm"
              rules={[{ required: true }]}
            >
              <Select
                disabled={locked}
                onChange={() => form.setFieldValue("discount_value", undefined)}
                options={[
                  { value: "PERCENTAGE", label: "Giảm theo phần trăm (%)" },
                  {
                    value: "FIXED_AMOUNT",
                    label: "Giảm số tiền cố định (VNĐ)",
                  },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="discount_value"
              label={
                discountType === "PERCENTAGE"
                  ? "Phần trăm giảm (%)"
                  : "Số tiền giảm (VNĐ)"
              }
              rules={[
                { required: true, message: "Nhập mức giảm." },
                {
                  type: "integer",
                  min: discountType === "PERCENTAGE" ? 1 : 1000,
                  max: discountType === "PERCENTAGE" ? 100 : 99_999_999,
                  message:
                    discountType === "PERCENTAGE"
                      ? "Nhập số nguyên từ 1 đến 100."
                      : "Nhập số nguyên từ 1.000 đến 99.999.999đ.",
                },
              ]}
            >
              <InputNumber
                disabled={locked}
                precision={0}
                min={discountType === "PERCENTAGE" ? 1 : 1000}
                max={discountType === "PERCENTAGE" ? 100 : 99_999_999}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="min_order_value"
              label="Giá trị đơn tối thiểu (VNĐ)"
              rules={[
                { required: true },
                { type: "integer", min: 0, max: 9_999_999_999 },
              ]}
            >
              <InputNumber
                disabled={locked}
                min={0}
                max={9_999_999_999}
                precision={0}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          {discountType === "PERCENTAGE" && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="max_discount"
                label="Giảm tối đa (VNĐ)"
                extra="Để trống nếu không giới hạn."
                rules={[{ type: "integer", min: 1000, max: 9_999_999_999 }]}
              >
                <InputNumber
                  disabled={locked}
                  min={1000}
                  max={9_999_999_999}
                  precision={0}
                  style={{ width: "100%" }}
                  placeholder="Không giới hạn"
                />
              </Form.Item>
            </Col>
          )}
          <Col span={24}>
            <Form.Item
              name="date_range"
              label="Thời gian áp dụng (giờ Việt Nam)"
              rules={[
                { required: true, message: "Chọn ngày bắt đầu và kết thúc." },
              ]}
            >
              <DatePicker.RangePicker
                format="DD/MM/YYYY"
                disabled={locked ? [true, false] : false}
                style={{ width: "100%" }}
                allowClear={false}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="usage_limit"
              label="Tổng lượt sử dụng"
              extra="Để trống nếu không giới hạn."
              rules={[
                {
                  type: "integer",
                  min: Math.max(1, coupon?.used_count ?? 0),
                  max: 4_294_967_295,
                },
              ]}
            >
              <InputNumber
                min={Math.max(1, coupon?.used_count ?? 0)}
                max={4_294_967_295}
                precision={0}
                placeholder="Không giới hạn"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="per_user_limit"
              label="Số lượt tối đa mỗi khách"
              rules={[
                { required: true },
                { type: "integer", min: 1, max: 1000 },
              ]}
            >
              <InputNumber
                min={1}
                max={1000}
                precision={0}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="target_audience"
              label="Đối tượng áp dụng"
              rules={[{ required: true }]}
            >
              <Radio.Group
                disabled={locked}
                options={[
                  { value: "ALL", label: "Tất cả khách hàng" },
                  { value: "LOYALTY", label: "Khách thân thiết" },
                ]}
              />
            </Form.Item>
          </Col>
          {audience === "LOYALTY" && (
            <>
              <Col span={24}>
                <Alert
                  type="info"
                  style={{ marginBottom: 16 }}
                  title={
                    role === "host"
                      ? "Tính trên các chuyến đi đã hoàn tất tại các chỗ nghỉ của bạn."
                      : "Tính trên các chuyến đi đã hoàn tất trên toàn sàn."
                  }
                />
                <Form.Item
                  name="loyalty_condition_type"
                  label="Khách cần đáp ứng"
                  rules={[{ required: true }]}
                >
                  <Radio.Group
                    disabled={locked}
                    options={[
                      { value: "OR", label: "Ít nhất một điều kiện" },
                      { value: "AND", label: "Tất cả điều kiện đã nhập" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="min_completed_bookings"
                  label="Số chuyến đi tối thiểu"
                  rules={[{ type: "integer", min: 1, max: 4_294_967_295 }]}
                >
                  <InputNumber
                    disabled={locked}
                    min={1}
                    max={4_294_967_295}
                    precision={0}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="min_total_spent"
                  label="Tổng chi tiêu tối thiểu (VNĐ)"
                  rules={[{ type: "integer", min: 1000, max: 9_999_999_999 }]}
                >
                  <InputNumber
                    disabled={locked}
                    min={1000}
                    max={9_999_999_999}
                    precision={0}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
        <Alert
          type="info"
          title={
            role === "host"
              ? "Mã áp dụng cho chỗ nghỉ của bạn. Phần giảm giá được trừ vào doanh thu của chủ nhà."
              : "Mã áp dụng cho các chỗ nghỉ trực tiếp trên sàn. Sàn chi trả phần giảm giá."
          }
        />
      </Form>
    </Modal>
  );
}
