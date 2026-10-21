import { useState } from 'react';
import { Form, Input, Button, Typography, Checkbox, Alert, App } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { postLoginPath } from '../../services/authService';
import { glowButtonStyle } from './authStyles';

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trang được chuyển đến trước khi bị yêu cầu đăng nhập (nếu có)
  const from = (location.state as { from?: string } | null)?.from;

  const onFinish = async ({ email, password, remember }: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      const user = await login({ email, password }, remember);
      message.success(`Chào mừng ${user.full_name} quay trở lại!`);
      navigate(postLoginPath(user.roles, from), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          Đăng Nhập Tài Khoản
        </Title>
        <Text type="secondary">Chào mừng bạn quay trở lại với StayAI</Text>
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16, whiteSpace: 'pre-line' }} />}

      <Form<LoginForm>
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={() => setError(null)}
        initialValues={{ remember: true }}
        requiredMark={false}
      >
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không đúng định dạng' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" size="large" autoComplete="email" autoFocus />
        </Form.Item>

        <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" autoComplete="current-password" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Ghi nhớ đăng nhập</Checkbox>
          </Form.Item>
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => message.info('Tính năng quên mật khẩu đang được phát triển')}
          >
            Quên mật khẩu?
          </Button>
        </div>

        <Button type="primary" htmlType="submit" size="large" block loading={loading} style={glowButtonStyle}>
          Đăng Nhập
        </Button>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Text type="secondary">Chưa có tài khoản? </Text>
        <Link to="/auth/register" state={location.state} style={{ fontWeight: 600 }}>
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}
