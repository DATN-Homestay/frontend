import {
  Card,
  Button,
  Select,
  InputNumber,
  Alert,
  Typography,
  Space,
  Tag,
  Divider,
  Descriptions,
} from 'antd';
import {
  SyncOutlined,
  GlobalOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { adminService } from '../../services/adminService';

const { Title, Text, Paragraph } = Typography;

const TOURIST_CITIES = [
  { label: '🌲 Đà Lạt (Lâm Đồng)', value: 'Đà Lạt' },
  { label: '🏮 Hội An (Quảng Nam)', value: 'Hội An' },
  { label: '🏛️ Hà Nội (Thủ Đô)', value: 'Hà Nội' },
  { label: '🏔️ Sa Pa (Lào Cai)', value: 'Sa Pa' },
  { label: '🌉 Đà Nẵng (Thành phố biển)', value: 'Đà Nẵng' },
  { label: '🏝️ Phú Quốc (Kiên Giang)', value: 'Phú Quốc' },
  { label: '🏖️ Vũng Tàu (Bà Rịa - Vũng Tàu)', value: 'Vũng Tàu' },
  { label: '🌊 Nha Trang (Khánh Hòa)', value: 'Nha Trang' },
];

interface SyncResult {
  city: string;
  forecast_days: number;
  synced_at: string;
  execution_time_ms: number;
}

export default function SyncMarketDataPage() {
  const [city, setCity] = useState('Đà Lạt');
  const [forecastDays, setForecastDays] = useState(14);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminService.syncMarketData(city, forecastDays);
      setResult(res?.data ?? res);
    } catch (err: any) {
      setError(err.message ?? 'Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <BarChartOutlined style={{ fontSize: 20, color: '#6366f1' }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
            Đồng bộ Dữ liệu Thị trường RapidAPI
          </h2>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          Kích hoạt thủ công đồng bộ giá CompSet và tỷ lệ kín phòng từ booking-com15.p.rapidapi.com
          (thông thường chạy tự động lúc 02:00 AM mỗi ngày)
        </p>
      </div>

      <Card
        style={{
          borderRadius: 14,
          border: '1px solid #c7d2fe',
          background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <GlobalOutlined style={{ fontSize: 20, color: '#4f46e5' }} />
          <Title level={4} style={{ margin: 0, color: '#312e81' }}>
            Cấu hình Đồng bộ RapidAPI
          </Title>
          <Tag color="purple">Cronjob / Manual Trigger</Tag>
        </div>

        <Paragraph style={{ color: '#475569', fontSize: 13, marginBottom: 20 }}>
          Hệ thống sẽ gọi API <Text code>booking-com15.p.rapidapi.com</Text> để lấy dữ liệu giá thị trường
          (CompSet) và tỷ lệ kín phòng của các homestay trong thành phố được chọn trong{' '}
          <Text strong>{forecastDays} ngày</Text> tới, sau đó cập nhật bảng{' '}
          <Text code>price_calendars</Text>.
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 250px' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Thành phố cần đồng bộ:
              </Text>
              <Select
                style={{ width: '100%' }}
                size="large"
                value={city}
                onChange={setCity}
                options={TOURIST_CITIES}
              />
            </div>
            <div style={{ flex: '0 0 180px' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Số ngày dự báo:
              </Text>
              <InputNumber
                min={1}
                max={30}
                size="large"
                value={forecastDays}
                onChange={(v) => setForecastDays(v ?? 14)}
                style={{ width: '100%' }}
                addonAfter="ngày"
              />
            </div>
            <Button
              type="primary"
              icon={syncing ? <SyncOutlined spin /> : <SyncOutlined />}
              size="large"
              loading={syncing}
              onClick={handleSync}
              style={{
                background: '#4f46e5',
                borderColor: '#4f46e5',
                fontWeight: 600,
                minWidth: 180,
                height: 40,
              }}
            >
              {syncing ? 'Đang đồng bộ...' : 'Bắt đầu đồng bộ'}
            </Button>
          </div>

          {/* Thông tin cấu hình */}
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              fontSize: 13,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Thông tin kết nối:
            </Text>
            <Space direction="vertical" size={4}>
              <div>
                <Text type="secondary">Gateway: </Text>
                <Text code>booking-com15.p.rapidapi.com</Text>
              </div>
              <div>
                <Text type="secondary">API Key: </Text>
                <Text code>{'***' + 'RAPIDAPI_KEY (backend/.env)'}</Text>
              </div>
              <div>
                <Text type="secondary">Cron schedule: </Text>
                <Text code>0 2 * * *</Text>{' '}
                <Text type="secondary">(02:00 AM hàng ngày)</Text>
              </div>
            </Space>
          </div>
        </Space>
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Đồng bộ thất bại"
          description={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {result && (
        <Card
          style={{
            borderRadius: 14,
            border: '1px solid #a7f3d0',
            background: '#f0fdf4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CheckCircleOutlined style={{ fontSize: 18, color: '#059669' }} />
            <Title level={5} style={{ margin: 0, color: '#065f46' }}>
              Đồng bộ thành công!
            </Title>
          </div>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Thành phố">
              <Text strong>{result.city}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Số ngày dự báo">
              {result.forecast_days} ngày
            </Descriptions.Item>
            <Descriptions.Item label="Thời điểm đồng bộ">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCircleOutlined style={{ color: '#6366f1' }} />
                {new Date(result.synced_at).toLocaleString('vi-VN')}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian xử lý">
              <Tag color="blue">{result.execution_time_ms}ms</Tag>
            </Descriptions.Item>
          </Descriptions>
          <Divider style={{ margin: '12px 0 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Dữ liệu CompSet đã được cập nhật vào bảng <Text code>price_calendars</Text>. Dynamic Pricing Engine sẽ sử dụng dữ liệu này để tính toán giá tự động.
          </Text>
        </Card>
      )}
    </div>
  );
}
