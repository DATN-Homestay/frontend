import { useEffect, useState } from 'react';
import { Alert, App, Button, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { glowButtonStyle } from './authStyles';

const { Title, Text } = Typography;

const RESEND_SECONDS = 60;

interface ResetForm {
  otp_code: string;
  new_password: string;
  confirm_password: string;
}

/** Quên mật khẩu: bước 1 nhập email → bước 2 nhập mã 6 số trong email và mật khẩu mới */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.forgotPassword(target);
      setEmail(target);
      setNotice(res.message);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được yêu cầu, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (values: ResetForm) => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(email, values.otp_code.trim(), values.new_password);
      message.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
      navigate('/auth/login', { replace: true, state: { email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đặt lại được mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          Quên Mật Khẩu
        </Title>
        <Text type="secondary">
          {email ? `Nhập mã 6 chữ số đã gửi tới ${email}` : 'Nhập email tài khoản để nhận mã khôi phục'}
        </Text>
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16, whiteSpace: 'pre-line' }} />}
      {email && notice && !error && <Alert type="info" showIcon title={notice} style={{ marginBottom: 16 }} />}

      {!email ? (
        <Form<{ email: string }>
          layout="vertical"
          requiredMark={false}
          initialValues={{ email: initialEmail }}
          onFinish={({ email: e }) => sendCode(e.trim().toLowerCase())}
          onValuesChange={() => setError(null)}
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
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={glowButtonStyle}>
            Gửi Mã Khôi Phục
          </Button>
        </Form>
      ) : (
        <Form<ResetForm> layout="vertical" requiredMark={false} onFinish={onReset} onValuesChange={() => setError(null)}>
          <Form.Item
            label="Mã khôi phục"
            name="otp_code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã trong email' },
              { pattern: /^\s*\d{6}\s*$/, message: 'Mã gồm 6 chữ số' },
            ]}
          >
            <Input prefix={<SafetyOutlined />} placeholder="6 chữ số" size="large" maxLength={6} inputMode="numeric" autoComplete="one-time-code" autoFocus />
          </Form.Item>
          <Form.Item
            label="Mật khẩu mới"
            name="new_password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 8, max: 64, message: 'Mật khẩu phải từ 8 đến 64 ký tự' },
              { pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Mật khẩu phải có chữ hoa, chữ thường và chữ số' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Nhập lại mật khẩu mới"
            name="confirm_password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Vui lòng nhập lại mật khẩu' },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || value === getFieldValue('new_password')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu nhập lại không khớp')),
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" size="large" autoComplete="new-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={glowButtonStyle}>
            Đặt Lại Mật Khẩu
          </Button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <Button type="link" style={{ padding: 0 }} onClick={() => { setEmail(null); setNotice(null); setError(null); }}>
              Đổi email
            </Button>
            <Button type="link" style={{ padding: 0 }} disabled={cooldown > 0 || loading} onClick={() => sendCode(email)}>
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}
            </Button>
          </div>
        </Form>
      )}

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link to="/auth/login" style={{ fontWeight: 600 }}>
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
