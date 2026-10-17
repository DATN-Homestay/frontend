import { useState } from 'react';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await login(values);
      message.success('Đăng nhập thành công!');
      if (values.email.includes('host')) {
        navigate('/host');
      } else if (values.email.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      message.error(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Đăng nhập</Title>
        <Text type="secondary">Truy cập tài khoản StayAI của bạn</Text>
      </div>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không đúng định dạng' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="customer@example.com hoặc host@example.com" size="large" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ marginTop: 12 }}>
          Đăng nhập
        </Button>
      </Form>

      <Divider style={{ margin: '20px 0', fontSize: 13, color: '#94a3b8' }}>hoặc</Divider>

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">Chưa có tài khoản? </Text>
        <Link to="/auth/register" style={{ fontWeight: 600, color: '#6366f1' }}>Đăng ký ngay</Link>
      </div>
    </div>
  );
}

