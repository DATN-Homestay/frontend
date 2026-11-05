import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Typography, Space, Tag, Flex } from 'antd';
import {
  WarningFilled,
  ClockCircleOutlined,
  GlobalOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const { Text, Paragraph, Title } = Typography;

const DEFAULT_TIMEOUT_SECONDS = 15;

export interface SessionRevokedDetail {
  reason?: string;
  message?: string;
  new_session_id?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  revoked_at?: string;
}

function parseDevice(ua?: string | null): string {
  if (!ua) return 'Thiết bị không xác định';
  if (ua.includes('Windows')) return 'Máy tính Windows';
  if (ua.includes('Macintosh')) return 'Máy tính macOS';
  if (ua.includes('iPhone')) return 'Điện thoại iPhone';
  if (ua.includes('Android')) return 'Thiết bị Android';
  if (ua.includes('Linux')) return 'Máy tính Linux';
  return ua.length > 50 ? `${ua.slice(0, 47)}...` : ua;
}

export const SESSION_REVOKED_EVENT = 'auth:session_revoked';

export const SessionRevokedModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(DEFAULT_TIMEOUT_SECONDS);
  const [data, setData] = useState<SessionRevokedDetail | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogoutAndRedirect = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    (window as any).__SESSION_REVOKED__ = false;
    setOpen(false);
    try {
      await logout();
    } catch {
      // Bỏ qua lỗi nếu phiên mạng bị gián đoạn
    }
    navigate('/auth/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    const handleRevoked = (event: Event) => {
      const customEvent = event as CustomEvent<SessionRevokedDetail>;
      setData((prev) => prev || customEvent.detail || null);
      setOpen((wasOpen) => {
        if (!wasOpen) {
          setCountdown(DEFAULT_TIMEOUT_SECONDS);
        }
        return true;
      });
    };

    window.addEventListener(SESSION_REVOKED_EVENT, handleRevoked);
    return () => {
      window.removeEventListener(SESSION_REVOKED_EVENT, handleRevoked);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          void handleLogoutAndRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, handleLogoutAndRedirect]);

  const formattedTime = data?.revoked_at
    ? new Date(data.revoked_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <Modal
      open={open}
      closable={false}
      mask={{ closable: false }}
      keyboard={false}
      centered
      width={480}
      footer={[
        <Button
          key="confirm-logout"
          type="primary"
          danger
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleLogoutAndRedirect}
          style={{ width: '100%', height: 44, borderRadius: 8, fontWeight: 600 }}
        >
          Xác nhận & Đăng xuất ngay ({countdown}s)
        </Button>,
      ]}
    >
      <div style={{ textAlign: 'center', paddingTop: 12 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#fff1f0',
            color: '#ff4d4f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 16px',
            border: '1px solid #ffccc7',
          }}
        >
          <WarningFilled />
        </div>

        <Title level={4} style={{ margin: '0 0 8px', color: '#1f2937' }}>
          Phát hiện đăng nhập ở nơi khác
        </Title>

        <Paragraph style={{ color: '#4b5563', fontSize: 14, marginBottom: 16 }}>
          {data?.message ||
            'Tài khoản của bạn vừa được đăng nhập trên một thiết bị hoặc trình duyệt khác. Để bảo mật tài khoản, phiên làm việc hiện tại đã bị chấm dứt.'}
        </Paragraph>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'left',
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          <Flex vertical gap={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space size={6} style={{ color: '#64748b' }}>
                <DesktopOutlined />
                <span>Thiết bị mới:</span>
              </Space>
              <Text strong style={{ color: '#334155' }}>
                {parseDevice(data?.user_agent)}
              </Text>
            </div>

            {data?.ip_address && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size={6} style={{ color: '#64748b' }}>
                  <GlobalOutlined />
                  <span>Địa chỉ IP:</span>
                </Space>
                <Tag color="blue" style={{ margin: 0 }}>
                  {data.ip_address}
                </Tag>
              </div>
            )}

            {formattedTime && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size={6} style={{ color: '#64748b' }}>
                  <ClockCircleOutlined />
                  <span>Thời gian:</span>
                </Space>
                <Text style={{ color: '#64748b' }}>{formattedTime}</Text>
              </div>
            )}
          </Flex>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#f59e0b', fontSize: 13, marginBottom: 8 }}>
          <ClockCircleOutlined />
          <span>
            Hệ thống sẽ tự động đăng xuất sau <strong>{countdown}</strong> giây nếu bạn không xác nhận.
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default SessionRevokedModal;
