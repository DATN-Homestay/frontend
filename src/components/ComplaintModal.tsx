import { useState } from 'react';
import { Alert, App, Form, Input, Modal, Select, Typography } from 'antd';
import EvidenceUpload from './EvidenceUpload';
import { customerService } from '../services/customerService';
import { ApiError } from '../services/apiClient';
import {
  COMPLAINT_CATEGORY_LABEL,
  type ComplaintCategory,
  type MyBookingItem,
} from '../types/customer';

const { Text } = Typography;

interface Props {
  booking: Pick<MyBookingItem, 'id' | 'booking_code'> & { homestay: { name: string } };
  onClose: () => void;
  /** Gửi thành công (hoặc server báo đơn đã có khiếu nại mở) → trang tải lại dữ liệu */
  onSubmitted: () => void;
}

interface Values {
  category: ComplaintCategory;
  title: string;
  description: string;
}

/** Khách gửi khiếu nại cho một đơn: loại, tiêu đề, mô tả, tối đa 5 ảnh */
export default function ComplaintModal({ booking, onClose, onSubmitted }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const values = await form.validateFields();
    if (uploading) {
      message.warning('Ảnh đang được tải lên, vui lòng đợi');
      return;
    }
    setSending(true);
    try {
      await customerService.submitComplaint(booking.id, {
        category: values.category,
        title: values.title.trim(),
        description: values.description.trim(),
        ...(attachments.length ? { attachments } : {}),
      });
      message.success('Đã gửi khiếu nại. Bộ phận hỗ trợ sẽ phản hồi trong mục Chi tiết đơn.');
      onSubmitted();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gửi được khiếu nại');
      if (err instanceof ApiError && err.status === 409) onSubmitted();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      title={`Khiếu nại đơn ${booking.booking_code}`}
      onCancel={onClose}
      onOk={submit}
      okText="Gửi khiếu nại"
      cancelText="Hủy"
      confirmLoading={sending}
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Khiếu nại về kỳ nghỉ tại ${booking.homestay.name}`}
        description="Khiếu nại đang mở sẽ tạm giữ khoản thanh toán cho chủ nhà cho tới khi được xử lý. Bạn vẫn có thể nhắn tin trực tiếp cho chủ nhà."
      />
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="category" label="Vấn đề gặp phải" rules={[{ required: true, message: 'Chọn loại vấn đề' }]}>
          <Select
            placeholder="Chọn loại vấn đề"
            options={Object.entries(COMPLAINT_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[
            { required: true, whitespace: true, message: 'Nhập tiêu đề' },
            { min: 5, message: 'Tiêu đề cần ít nhất 5 ký tự' },
          ]}
        >
          <Input maxLength={150} showCount placeholder="Ví dụ: Điều hòa hỏng suốt đêm" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Mô tả chi tiết"
          rules={[
            { required: true, whitespace: true, message: 'Mô tả vấn đề' },
            { min: 20, message: 'Mô tả cần ít nhất 20 ký tự' },
          ]}
        >
          <Input.TextArea rows={4} maxLength={3000} showCount placeholder="Chuyện gì đã xảy ra, lúc nào, bạn đã báo chủ nhà chưa…" />
        </Form.Item>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Ảnh minh chứng <Text type="secondary" style={{ fontWeight: 400 }}>(không bắt buộc, tối đa 5 ảnh)</Text>
        </Text>
        <EvidenceUpload kind="complaint" onChange={setAttachments} onUploadingChange={setUploading} />
      </Form>
    </Modal>
  );
}
