import { useState } from 'react';
import { Form, Input, Button, Typography, message, Radio, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await authService.register(values);
      message.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      navigate('/auth/login');
    } catch (err: any) {
      message.error(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Tạo tài khoản</Title>
        <Text type="secondary">Trải nghiệm đặt phòng và kinh doanh homestay</Text>
      </div>

      <Form layout="vertical" onFinish={onFinish} initialValues={{ role: 'CUSTOMER' }} requiredMark={false}>
        <Form.Item
          label="Bạn tham gia với vai trò"
          name="role"
          rules={[{ required: true }]}
        >
          <Radio.Group style={{ width: '100%', display: 'flex', gap: 8 }}>
            <Radio.Button value="CUSTOMER" style={{ flex: 1, textAlign: 'center' }}>Khách hàng</Radio.Button>
            <Radio.Button value="HOST" style={{ flex: 1, textAlign: 'center' }}>Chủ Homestay</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Họ và tên"
          name="full_name"
          rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" size="large" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="nguyenvana@example.com" size="large" />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="phone_number"
          rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="0912345678" size="large" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Tối thiểu 6 ký tự" size="large" />
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ marginTop: 8 }}>
          Đăng ký tài khoản
        </Button>
      </Form>

      <Divider style={{ margin: '16px 0', fontSize: 13, color: '#94a3b8' }}>hoặc</Divider>

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">Đã có tài khoản? </Text>
        <Link to="/auth/login" style={{ fontWeight: 600, color: '#6366f1' }}>Đăng nhập</Link>
      </div>
    </div>
  );
}
