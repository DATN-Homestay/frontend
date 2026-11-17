import { useState } from 'react';
import { Alert, Button, Form, Input, Steps, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { authService } from '../../services/authService';
import { glowButtonStyle } from './authStyles';

const { Title, Text } = Typography;

interface ResetForm {
  new_password: string;
  confirm_password: string;
}

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const resetState = location.state as { resetToken?: string; resetExpiresAt?: number } | null;
  const token = resetState?.resetToken ?? '';
  const [openedAt] = useState(() => Date.now());
  const validToken = /^[a-f0-9]{64}$/.test(token) && (resetState?.resetExpiresAt ?? 0) > openedAt;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async ({ new_password }: ResetForm) => {
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword({ token, new_password });
      await logout();
      navigate('/auth/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Đặt lại mật khẩu</Title>
        <Text type="secondary">Tạo mật khẩu mới để tiếp tục sử dụng tài khoản StayAI.</Text>
      </div>

      <Steps size="small" current={2} items={[
        { title: 'Email' }, { title: 'Xác minh OTP' }, { title: 'Mật khẩu mới' },
      ]} style={{ marginBottom: 24 }} />

      {!validToken ? (
        <Alert type="error" showIcon title="Vui lòng xác minh mã OTP trước" description="Phiên xác minh chưa có hoặc đã hết hạn. Hãy yêu cầu mã OTP mới để tiếp tục." />
      ) : (
        <>
          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16, whiteSpace: 'pre-line' }} />}
          <Form<ResetForm> layout="vertical" onFinish={onFinish} onValuesChange={() => setError(null)} requiredMark={false}>
            <Form.Item label="Mật khẩu mới" name="new_password" extra="Từ 8–64 ký tự, gồm chữ hoa, chữ thường và chữ số." rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 8, max: 64, message: 'Mật khẩu mới phải từ 8 đến 64 ký tự' },
              { pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Mật khẩu mới phải có chữ hoa, chữ thường và chữ số' },
            ]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" size="large" autoComplete="new-password" maxLength={64} autoFocus disabled={loading} />
            </Form.Item>
            <Form.Item label="Xác nhận mật khẩu mới" name="confirm_password" dependencies={['new_password']} rules={[
              { required: true, message: 'Vui lòng nhập lại mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  return !value || value === getFieldValue('new_password')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" size="large" autoComplete="new-password" maxLength={64} disabled={loading} />
            </Form.Item>
            <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
              Sau khi đặt lại mật khẩu, bạn cần đăng nhập lại trên các thiết bị.
            </Text>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={glowButtonStyle}>Lưu mật khẩu mới</Button>
          </Form>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/auth/forgot-password">Yêu cầu mã OTP mới</Link>
      </div>
    </div>
  );
}
