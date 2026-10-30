import { useState, useEffect } from 'react';
import { Card, Segmented, Tag, Typography, message } from 'antd';
import { GlobalOutlined, ApiOutlined, LinkOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type OtaMode = 'B2B_DEMAND_API' | 'AFFILIATE_PARTNER';

export const OTA_MODE_STORAGE_KEY = 'stayai_ota_mode';

export function getStoredOtaMode(): OtaMode {
  const stored = localStorage.getItem(OTA_MODE_STORAGE_KEY);
  if (stored === 'AFFILIATE_PARTNER' || stored === 'B2B_DEMAND_API') {
    return stored;
  }
  return 'B2B_DEMAND_API';
}

export function setStoredOtaMode(mode: OtaMode) {
  localStorage.setItem(OTA_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('ota_mode_changed', { detail: mode }));
}

export default function OtaModeSwitcher() {
  const [mode, setMode] = useState<OtaMode>(getStoredOtaMode());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<OtaMode>;
      if (customEvent.detail) setMode(customEvent.detail);
    };
    window.addEventListener('ota_mode_changed', handler);
    return () => window.removeEventListener('ota_mode_changed', handler);
  }, []);

  const handleModeChange = (val: string | number) => {
    const newMode = val as OtaMode;
    setMode(newMode);
    setStoredOtaMode(newMode);
    if (newMode === 'B2B_DEMAND_API') {
      message.success('Đã chuyển sang Hướng 1: B2B Demand API (Thanh toán VCC & Tự động xuất vé Booking.com)');
    } else {
      message.info('Đã chuyển sang Hướng 2: Affiliate Partner (Deep-link Booking.com & Hoa hồng đối tác 40%)');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 360,
      }}
    >
      <Card
        size="small"
        style={{
          borderRadius: 14,
          boxShadow: '0 10px 30px rgba(0, 53, 128, 0.22)',
          border: '2px solid #003580',
          background: '#ffffff',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🔀</span>
            <Text strong style={{ fontSize: 13, color: '#003580' }}>
              Công tắc Tích hợp Booking.com
            </Text>
            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', fontWeight: 700 }}>
              DEMO GVHD
            </Tag>
          </div>
          <a
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', marginLeft: 8 }}
          >
            {collapsed ? 'Mở rộng' : 'Thu gọn'}
          </a>
        </div>

        {!collapsed && (
          <div>
            <Segmented
              block
              value={mode}
              onChange={handleModeChange}
              options={[
                {
                  label: (
                    <div style={{ padding: '4px 0' }}>
                      <ApiOutlined style={{ marginRight: 4 }} />
                      <strong>B2B Demand API</strong>
                    </div>
                  ),
                  value: 'B2B_DEMAND_API',
                },
                {
                  label: (
                    <div style={{ padding: '4px 0' }}>
                      <LinkOutlined style={{ marginRight: 4 }} />
                      <strong>Affiliate Partner</strong>
                    </div>
                  ),
                  value: 'AFFILIATE_PARTNER',
                },
              ]}
              style={{ background: '#f1f5f9', padding: 3, borderRadius: 8, marginBottom: 8 }}
            />

            <div
              style={{
                fontSize: 11,
                lineHeight: 1.45,
                background: mode === 'B2B_DEMAND_API' ? '#eff6ff' : '#f0fdf4',
                color: mode === 'B2B_DEMAND_API' ? '#1e40af' : '#166534',
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${mode === 'B2B_DEMAND_API' ? '#bfdbfe' : '#bbf7d0'}`,
              }}
            >
              {mode === 'B2B_DEMAND_API' ? (
                <>
                  <ThunderboltOutlined style={{ marginRight: 4 }} />
                  <strong>MoR Model:</strong> Khách trả tiền cho sàn ta (VNPay). Sàn dùng thẻ ảo VCC tự động đặt phòng qua Booking.com và cấp mã PNR + PIN check-in.
                </>
              ) : (
                <>
                  <GlobalOutlined style={{ marginRight: 4 }} />
                  <strong>Affiliate Model:</strong> Khách chọn phòng sẽ được chuyển sang Booking.com kèm mã đối tác (<code>aid=2409182</code>). Booking thu tiền, sàn hưởng hoa hồng chia sẻ 40%.
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
