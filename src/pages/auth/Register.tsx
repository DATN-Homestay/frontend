import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Checkbox, Segmented, Alert, App, Tooltip } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../services/apiClient';
import { authService, postLoginPath } from '../../services/authService';
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
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'HOST' ? 'HOST' : 'CUSTOMER';
  const { message } = App.useApp();
  const { register } = useAuth();
  const [form] = Form.useForm<RegisterForm>();
  const role = Form.useWatch('role', form) ?? defaultRole;
  const agree = Form.useWatch('agree', form) ?? false;
  const emailValue = Form.useWatch('email', form) ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái OTP Email cho Chủ nhà Homestay
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Đếm ngược 60s khi gửi OTP
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Nếu người dùng thay đổi email sau khi đã xác thực, hủy trạng thái xác thực để yêu cầu gửi lại
  useEffect(() => {
    if (isOtpVerified && emailValue !== verifiedEmail) {
      setIsOtpVerified(false);
      setOtpSent(false);
      form.setFieldsValue({ otp_code: '' });
      message.info('Bạn vừa thay đổi địa chỉ email. Vui lòng xác thực lại mã OTP cho email mới.');
    }
  }, [emailValue, isOtpVerified, verifiedEmail, form, message]);

  const from = (location.state as { from?: string } | null)?.from;

  // Gửi mã OTP về email
  const handleSendOtp = async () => {
    try {
      await form.validateFields(['email']);
    } catch {
      message.error('Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã OTP');
      return;
    }

    const email = form.getFieldValue('email')?.trim();
    const fullName = form.getFieldValue('full_name')?.trim();

    if (!email) {
      message.warning('Vui lòng nhập email');
      return;
    }

    setSendingOtp(true);
    setError(null);
    try {
      const res = await authService.sendRegisterOtp(email, fullName);
      message.success(res.message || 'Mã xác thực OTP đã được gửi đến email của bạn');
      setOtpSent(true);
      setOtpCountdown(60);
      setIsOtpVerified(false);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Không thể gửi mã OTP';
      message.error(text);
      if (err instanceof ApiError && err.status === 409) {
        form.setFields([{ name: 'email', errors: [text] }]);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // Xác thực mã OTP
  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = codeOverride || form.getFieldValue('otp_code')?.trim();
    const email = form.getFieldValue('email')?.trim();

    if (!email) {
      message.warning('Vui lòng nhập email');
      return;
    }
    if (!code || code.length !== 6) {
      message.warning('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await authService.verifyRegisterOtp(email, code);
      if (res.verified) {
        setIsOtpVerified(true);
        setVerifiedEmail(email);
        message.success('✓ Xác thực Email thành công! Nút Đăng Ký Tài Khoản đã được kích hoạt.');
      }
    } catch (err) {
      setIsOtpVerified(false);
      const text = err instanceof Error ? err.message : 'Mã OTP không chính xác';
      message.error(text);
      form.setFields([{ name: 'otp_code', errors: [text] }]);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onFinish = async (values: RegisterForm) => {
    // Nếu là HOST mà chưa xác thực OTP thì chặn submit
    if (values.role === 'HOST' && !isOtpVerified) {
      message.error('Vui lòng nhập đúng mã OTP gửi về Email để hoàn tất đăng ký');
      return;
    }

    // Chỉ gửi các trường backend nhận; ValidationPipe từ chối trường lạ
    const dto: RegisterDto = {
      role: values.role,
      full_name: values.full_name,
      email: values.email,
      password: values.password,
      phone_number: values.phone_number,
      otp_code: values.otp_code,
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

  const isHost = role === 'HOST';
  const isSubmitDisabled = (isHost && !isOtpVerified) || !agree;

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
        initialValues={{ role: defaultRole, agree: false }}
        requiredMark={false}
      >
        {/* 1. CHỌN VAI TRÒ */}
        <Form.Item name="role" style={{ marginBottom: 20 }}>
          <Segmented
            block
            size="large"
            className="auth-role-segmented"
            options={[
              {
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0', fontSize: 14 }}>
                    <UserOutlined style={{ fontSize: 16 }} />
                    <span>Khách du lịch</span>
                  </div>
                ),
                value: 'CUSTOMER',
              },
              {
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0', fontSize: 14 }}>
                    <HomeOutlined style={{ fontSize: 16 }} />
                    <span>Chủ nhà Homestay (Host)</span>
                  </div>
                ),
                value: 'HOST',
              },
            ]}
          />
        </Form.Item>

        {/* 2. HỌ VÀ TÊN */}
        <Form.Item
          name="full_name"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập họ và tên' },
            { min: 2, max: 100, message: 'Họ tên phải từ 2 đến 100 ký tự' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" autoComplete="name" />
        </Form.Item>

        {/* 3. MẬT KHẨU (ĐÃ CHUYỂN LÊN TRÊN THEO YÊU CẦU) */}
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

        {/* 4. NHẬP LẠI MẬT KHẨU (ĐÃ CHUYỂN LÊN TRÊN THEO YÊU CẦU) */}
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

        {/* 5. EMAIL VÀ NÚT GỬI OTP (CHUYỂN XUỐNG DƯỚI CÙNG THAY THẾ PHẦN SĐT) */}
        <div style={{ marginBottom: isHost ? 16 : 0 }}>
          <Form.Item
            name="email"
            style={{ marginBottom: isHost ? 8 : 16 }}
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                prefix={<MailOutlined />}
                placeholder="Email của bạn"
                size="large"
                autoComplete="email"
                disabled={isOtpVerified}
                style={{ flex: 1 }}
              />
              {isHost && (
                <Button
                  size="large"
                  type="primary"
                  icon={isOtpVerified ? <CheckCircleFilled /> : <SendOutlined />}
                  onClick={handleSendOtp}
                  loading={sendingOtp}
                  disabled={otpCountdown > 0 || isOtpVerified}
                  style={{
                    minWidth: 125,
                    backgroundColor: isOtpVerified ? '#10b981' : undefined,
                    borderColor: isOtpVerified ? '#10b981' : undefined,
                  }}
                >
                  {isOtpVerified
                    ? 'Đã xác thực'
                    : otpCountdown > 0
                    ? `Gửi lại (${otpCountdown}s)`
                    : otpSent
                    ? 'Gửi lại OTP'
                    : 'Gửi mã OTP'}
                </Button>
              )}
            </div>
          </Form.Item>
          {isHost && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: -4, marginBottom: 8 }}>
              Mã xác thực OTP gồm 6 chữ số sẽ được gửi trực tiếp tới hòm thư Email này
            </div>
          )}
        </div>

        {/* 6. TRƯỜNG NHẬP MÃ OTP (DÀNH CHO CHỦ NHÀ HOMESTAY) */}
        {isHost && (
          <div style={{ marginBottom: 16 }}>
            <Form.Item
              name="otp_code"
              style={{ marginBottom: 8 }}
              rules={[
                {
                  validator: (_, value) => {
                    if (isHost && !isOtpVerified) {
                      if (!value) return Promise.reject(new Error('Vui lòng nhập mã OTP gửi về email'));
                      if (value.length !== 6) return Promise.reject(new Error('Mã OTP gồm 6 chữ số'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  prefix={<SafetyCertificateOutlined style={{ color: isOtpVerified ? '#10b981' : undefined }} />}
                  placeholder="Nhập mã OTP (6 số từ email)"
                  size="large"
                  maxLength={6}
                  disabled={isOtpVerified}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val.length === 6 && !isOtpVerified) {
                      handleVerifyOtp(val);
                    }
                  }}
                  style={{
                    flex: 1,
                    letterSpacing: 4,
                    fontWeight: 600,
                    borderColor: isOtpVerified ? '#10b981' : undefined,
                  }}
                />
                <Button
                  size="large"
                  onClick={() => handleVerifyOtp()}
                  loading={verifyingOtp}
                  disabled={isOtpVerified}
                  type={isOtpVerified ? 'dashed' : 'default'}
                  style={{
                    minWidth: 105,
                    color: isOtpVerified ? '#10b981' : undefined,
                    borderColor: isOtpVerified ? '#10b981' : undefined,
                  }}
                >
                  {isOtpVerified ? '✓ Khớp mã' : 'Xác nhận'}
                </Button>
              </div>
            </Form.Item>

            {/* Trạng thái xác thực OTP */}
            {isOtpVerified ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <CheckCircleFilled style={{ fontSize: 16 }} />
                <span>Mã OTP chính xác! Email đã được xác thực, nút đăng ký đã sẵn sàng.</span>
              </div>
            ) : otpSent ? (
              <div style={{ fontSize: 12, color: '#f59e0b' }}>
                💡 Vui lòng kiểm tra hộp thư email (và hòm thư Spam/Rác) để lấy mã OTP 6 số.
              </div>
            ) : null}
          </div>
        )}

        {/* 7. ĐỒNG Ý ĐIỀU KHOẢN */}
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

        {/* 8. NÚT ĐĂNG KÝ TÀI KHOẢN */}
        <Tooltip
          title={
            isHost && !isOtpVerified
              ? 'Vui lòng xác thực mã OTP gửi về Email để mở nút đăng ký tài khoản'
              : !agree
              ? 'Vui lòng chọn đồng ý với điều khoản'
              : undefined
          }
        >
          <div>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              disabled={isSubmitDisabled}
              style={{
                ...glowButtonStyle,
                opacity: isSubmitDisabled ? 0.45 : 1,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              Đăng Ký Tài Khoản
            </Button>
          </div>
        </Tooltip>

        {isHost && !isOtpVerified && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#f87171' }}>
            🔒 Nút đăng ký sẽ được mở ngay sau khi bạn nhập đúng mã OTP gửi về Email
          </div>
        )}
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
