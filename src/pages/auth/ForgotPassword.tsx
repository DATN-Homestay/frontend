import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Steps, Typography } from 'antd';
import { ArrowLeftOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { glowButtonStyle } from './authStyles';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [emailForm] = Form.useForm<{ email: string }>();
  const [otpForm] = Form.useForm<{ otp_code: string }>();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  const sendOtp = async (address: string) => {
    setLoading('send');
    setError(null);
    setNotice(null);
    try {
      const normalized = address.trim().toLowerCase();
      const result = await authService.forgotPassword(normalized);
      setEmail(normalized);
      setNotice(result.message);
      setRemaining(result.retry_after_seconds);
      setRetryAt(Date.now() + result.retry_after_seconds * 1000);
      otpForm.resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa gửi được mã OTP. Vui lòng thử lại.');
    } finally {
      setLoading(null);
    }
  };

  const verifyOtp = async ({ otp_code }: { otp_code: string }) => {
    if (!email) return;
    setLoading('verify');
    setError(null);
    try {
      const result = await authService.verifyResetOtp(email, otp_code);
      navigate('/auth/reset-password', {
        replace: true,
        state: { resetToken: result.reset_token, resetExpiresAt: Date.now() + result.expires_in * 1000 },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác minh OTP thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>{email ? 'Xác minh mã OTP' : 'Quên mật khẩu?'}</Title>
        <Text type="secondary">{email ? `Nhập mã OTP được gửi đến ${email}` : 'Nhập email tài khoản cần đặt lại mật khẩu để nhận mã OTP.'}</Text>
      </div>
      <Steps size="small" current={email ? 1 : 0} items={[
        { title: 'Email' }, { title: 'Xác minh OTP' }, { title: 'Mật khẩu mới' },
      ]} style={{ marginBottom: 24 }} />

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16, whiteSpace: 'pre-line' }} />}
      {notice && <Alert type="success" showIcon title="Kiểm tra email để lấy mã OTP" description={notice} style={{ marginBottom: 20 }} />}

      {!email ? (
        <Form form={emailForm} layout="vertical" onFinish={({ email: address }) => sendOtp(address)} onValuesChange={() => setError(null)} requiredMark={false}>
          <Form.Item label="Email" name="email" normalize={(value: string) => value.trim()} rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không đúng định dạng' },
            { max: 191, message: 'Email không được quá 191 ký tự' },
          ]}>
            <Input prefix={<MailOutlined />} placeholder="Email đã đăng ký" size="large" autoComplete="email" autoFocus disabled={loading !== null} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading === 'send'} style={glowButtonStyle}>Gửi mã OTP</Button>
        </Form>
      ) : (
        <>
          <Form form={otpForm} layout="vertical" onFinish={verifyOtp} onValuesChange={() => setError(null)} requiredMark={false}>
            <Form.Item label="Mã OTP" name="otp_code" normalize={(value: string) => value.trim()} rules={[
              { required: true, message: 'Vui lòng nhập mã OTP' },
              { pattern: /^\d{6}$/, message: 'Mã OTP phải gồm 6 chữ số' },
            ]}>
              <Input prefix={<SafetyCertificateOutlined />} placeholder="Nhập mã OTP 6 chữ số" size="large" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus disabled={loading !== null} />
            </Form.Item>
            <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
              Mã có hiệu lực trong 5 phút. Sau 5 lần nhập sai, bạn cần gửi mã mới.
            </Text>
            <Button type="primary" htmlType="submit" size="large" block loading={loading === 'verify'} disabled={loading === 'send'} style={glowButtonStyle}>Xác minh OTP</Button>
          </Form>
          <Button type="link" block onClick={() => sendOtp(email)} loading={loading === 'send'} disabled={remaining > 0 || loading === 'verify'} style={{ marginTop: 12 }}>
            {remaining > 0 ? `Gửi lại mã sau ${remaining}s` : 'Gửi lại mã OTP'}
          </Button>
          <Button type="text" block disabled={loading !== null} onClick={() => { setEmail(null); setError(null); setNotice(null); }}>
            Đổi email
          </Button>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/auth/login" state={location.state}><ArrowLeftOutlined /> Quay lại đăng nhập</Link>
      </div>
    </div>
  );
}
