import { useState } from 'react';
import { Form, Input, Button, Typography, Checkbox, Segmented, Alert, App } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../services/apiClient';
import { postLoginPath } from '../../services/authService';
import { glowButtonStyle } from './authStyles';
import type { RegisterDto } from '../../types/auth';

const { Title, Text } = Typography;

interface RegisterForm extends RegisterDto {
  confirm_password: string;
  agree: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const { register } = useAuth();
  const [form] = Form.useForm<RegisterForm>();
  const role = Form.useWatch('role', form) ?? 'CUSTOMER';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  const onFinish = async (values: RegisterForm) => {
    // Chỉ gửi các trường backend nhận; ValidationPipe từ chối trường lạ
    const dto: RegisterDto = {
      role: values.role,
      full_name: values.full_name,
      email: values.email,
      phone_number: values.phone_number,
      password: values.password,
    };
    setLoading(true);
    setError(null);
    try {
      const user = await register(dto);
      message.success(`Tạo tài khoản thành công. Chào mừng ${user.full_name}!`);
      navigate(postLoginPath(user.roles, from), { replace: true });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Đăng ký thất bại';
      // Lỗi trùng email / SĐT hiển thị ngay dưới ô nhập tương ứng
      if (err instanceof ApiError && err.status === 409) {
        if (text.includes('Email')) {
          form.setFields([{ name: 'email', errors: [text] }]);
          return;
        }
        if (text.includes('Số điện thoại')) {
          form.setFields([{ name: 'phone_number', errors: [text] }]);
          return;
        }
      }
      setError(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          Tạo Tài Khoản Mới
        </Title>
        <Text type="secondary">Tham gia nền tảng đặt homestay bảo chứng Escrow &amp; AI</Text>
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16, whiteSpace: 'pre-line' }} />}

      <Form<RegisterForm>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={() => setError(null)}
        initialValues={{ role: 'CUSTOMER', agree: false }}
        requiredMark={false}
      >
        <Form.Item name="role" style={{ marginBottom: 20 }}>
          <Segmented
            block
            size="large"
            options={[
              { label: 'Khách du lịch', value: 'CUSTOMER' },
              { label: 'Chủ nhà Homestay (Host)', value: 'HOST' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="full_name"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập họ và tên' },
            { min: 2, max: 100, message: 'Họ tên phải từ 2 đến 100 ký tự' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" autoComplete="name" />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" size="large" autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="phone_number"
          extra={role === 'HOST' ? 'Bắt buộc với Chủ nhà để nhận mã OTP xác thực' : undefined}
          rules={[
            { required: role === 'HOST', message: 'Chủ nhà bắt buộc nhập số điện thoại' },
            { pattern: /^0\d{9}$/, message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0' },
          ]}
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder={role === 'HOST' ? 'Số điện thoại' : 'Số điện thoại (không bắt buộc)'}
            size="large"
            autoComplete="tel"
            maxLength={10}
          />
        </Form.Item>

        <Form.Item
          name="password"
          hasFeedback
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 8, max: 64, message: 'Mật khẩu phải từ 8 đến 64 ký tự' },
            {
              pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: 'Mật khẩu phải có chữ hoa, chữ thường và chữ số',
            },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          dependencies={['password']}
          hasFeedback
          rules={[
            { required: true, message: 'Vui lòng nhập lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                return !value || getFieldValue('password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập lại mật khẩu"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="agree"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error('Bạn cần đồng ý với điều khoản để tiếp tục')),
            },
          ]}
        >
          <Checkbox>Tôi đồng ý với Điều khoản dịch vụ và Chính sách Escrow của StayAI</Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={loading} style={glowButtonStyle}>
          Đăng Ký Tài Khoản
        </Button>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Text type="secondary">Đã có tài khoản? </Text>
        <Link to="/auth/login" state={location.state} style={{ fontWeight: 600 }}>
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
