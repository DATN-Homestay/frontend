import { Card, Typography } from 'antd';
import { CompassOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function AuthLayout() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div
          style={{ textAlign: 'center', marginBottom: 28, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 26,
              marginBottom: 12,
              boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)',
            }}
          >
            <CompassOutlined />
          </div>
          <Title level={2} style={{ color: '#ffffff', margin: 0, fontWeight: 700 }}>
            StayAI
          </Title>
          <Text style={{ color: '#94a3b8' }}>Nền tảng đặt homestay thông minh</Text>
        </div>

        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
