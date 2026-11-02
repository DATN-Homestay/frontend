import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Modal,
  Row,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  LinkOutlined,
  ReloadOutlined,
  ShopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { adminService, type DropshipOrder } from '../../services/adminService';
import { apiClient } from '../../services/apiClient';

const { Text, Title, Paragraph } = Typography;

// API nhánh nhan: adminService.getDropshipOrders() -> DropshipOrder[]
// API nhánh dev: GET /admin/dropship/orders -> { total, summary, items }
// Hai response khác cấu trúc nên phải giữ STATE và TABLE riêng.
interface FinancialDropshipOrder {
  id: string;
  booking_code: string;
  booking_status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  homestay_name: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  retail_amount: number;
  wholesale_amount: number;
  profit_margin: number;
  ota_fulfillment: {
    provider: string;
    mode: string;
    api_spec: string;
    ota_booking_code: string;
    pnr_code: string;
    pin_code: string;
    status: string;
    vcc_card_last4: string;
    payment_method_b2b: string;
    retail_amount: number;
    wholesale_amount: number;
    profit_margin: number;
    fulfilled_at: string;
    notes: string;
  } | null;
}

interface FinancialSummary {
  total_revenue: number;
  total_wholesale_cost: number;
  total_profit_margin: number;
}

interface FinancialOrdersResponse {
  total: number;
  summary: FinancialSummary;
  items: FinancialDropshipOrder[];
}

interface AffiliateClick {
  id: string;
  homestay_id: string;
  homestay_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  price: number;
  estimated_commission: number;
  timestamp: string;
  affiliate_id: string;
}

const EMPTY_FINANCIAL: FinancialOrdersResponse = {
  total: 0,
  summary: { total_revenue: 0, total_wholesale_cost: 0, total_profit_margin: 0 },
  items: [],
};

const B2B_STATUS_CONFIG: Record<string, { color: string; icon: ReactNode; label: string }> = {
  PENDING: { color: 'warning', icon: <ClockCircleOutlined />, label: 'Đang chờ' },
  BOOKED: { color: 'success', icon: <CheckCircleOutlined />, label: 'Đã đặt B2B' },
  FAILED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Thất bại' },
  CANCELLED: { color: 'default', icon: <CloseCircleOutlined />, label: 'Đã hủy' },
  NOT_APPLICABLE: { color: 'default', icon: <ExclamationCircleOutlined />, label: 'N/A' },
};

const money = (value: number | null | undefined): string =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} ₫`;

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

// Hỗ trợ API trả về payload trực tiếp hoặc payload bên trong res.data.
function normalizeFinancialOrders(response: unknown): FinancialOrdersResponse {
  const wrapper = response as { data?: unknown } | null;
  const payload = (wrapper?.data ?? response) as Partial<FinancialOrdersResponse> | null;
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error('Dữ liệu /admin/dropship/orders không đúng định dạng { items, summary, total }.');
  }
  return {
    total: Number(payload.total ?? payload.items.length),
    summary: {
      total_revenue: Number(payload.summary?.total_revenue ?? 0),
      total_wholesale_cost: Number(payload.summary?.total_wholesale_cost ?? 0),
      total_profit_margin: Number(payload.summary?.total_profit_margin ?? 0),
    },
    items: payload.items,
  };
}

function readAffiliateClicks(): { clicks: AffiliateClick[]; isDemo: boolean } {
  try {
    const raw = localStorage.getItem('stayai_affiliate_clicks');
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Dữ liệu affiliate không phải mảng');
      return { clicks: parsed as AffiliateClick[], isDemo: false };
    }
  } catch {
    return { clicks: [], isDemo: false };
  }
  // Giữ lại dữ liệu mẫu từ nhánh dev; đánh dấu demo, không coi là giao dịch thực.
  const now = Date.now();
  return {
    isDemo: true,
    clicks: [
      {
        id: 'aff_1', homestay_id: '1', homestay_name: 'Le House DaLat',
        room_name: 'Phòng Giường Đôi Ban Công View Rừng Thông',
        check_in: '2026-10-25', check_out: '2026-10-27',
        price: 975000, estimated_commission: 390000,
        timestamp: new Date(now - 2 * 3600000).toISOString(), affiliate_id: '2409182',
      },
      {
        id: 'aff_2', homestay_id: '2', homestay_name: 'Carnival Dalat Hotel & Villa',
        room_name: 'Phòng Deluxe Gia Đình Ban Công Lớn',
        check_in: '2026-11-01', check_out: '2026-11-03',
        price: 1450000, estimated_commission: 580000,
        timestamp: new Date(now - 8 * 3600000).toISOString(), affiliate_id: '2409182',
      },
    ],
  };
}

      const result = await adminService.getDropshipOrders();
      if (!Array.isArray(result)) throw new Error('API trạng thái đơn không trả về mảng.');
      setStatusOrders(result);
    } catch (err: unknown) {
      setStatusError(getErrorMessage(err, 'Không thể tải trạng thái đơn B2B'));
      setStatusOrders([]);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadFinancialOrders = useCallback(async () => {
    setFinancialLoading(true);
    setFinancialError(null);
    try {
      const response = await apiClient<unknown>('/admin/dropship/orders');
      setFinancialData(normalizeFinancialOrders(response));
    } catch (err: unknown) {
      setFinancialError(getErrorMessage(err, 'Không thể tải dữ liệu đối soát B2B'));
      setFinancialData(EMPTY_FINANCIAL);
    } finally {
      setFinancialLoading(false);
    }
  }, []);

  const loadAffiliateClicks = useCallback(() => {
    const { clicks, isDemo } = readAffiliateClicks();
    setAffiliateClicks(clicks);
    setAffiliateIsDemo(isDemo);
  }, []);

  const refreshAll = useCallback(() => {
    void loadStatusOrders();
    void loadFinancialOrders();
    loadAffiliateClicks();
  }, [loadStatusOrders, loadFinancialOrders, loadAffiliateClicks]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleStatusRetry = (bookingId: string) => {
    Modal.confirm({
      title: 'Thử lại đặt phòng B2B?',
      content: (
        <Paragraph>
          Gửi lại yêu cầu Booking.com Demand API cho booking <Text code>#{bookingId}</Text>?
          Hãy kiểm tra trạng thái giao dịch trước khi retry để tránh đặt trùng.
        </Paragraph>
      ),
      icon: <SyncOutlined style={{ color: '#6366f1' }} />,
      okText: 'Thử lại',
      cancelText: 'Hủy',
      onOk: async () => {
        setRetryingStatusId(bookingId);
        try {
          await adminService.retryDropshipOrder(bookingId);
          message.success(`Đã gửi yêu cầu retry cho Booking #${bookingId}`);
          await loadStatusOrders();
          await loadFinancialOrders();
        } catch (err: unknown) {
          message.error(getErrorMessage(err, 'Retry thất bại'));
        } finally {
          setRetryingStatusId(null);
        }
      },
    });
  };

  const handleFinancialRetry = (orderId: string) => {
    Modal.confirm({
      title: 'Gửi lại yêu cầu B2B?',
      content: 'Chỉ tiếp tục khi bạn đã xác minh đơn chưa được xác nhận tại nhà cung cấp.',
      okText: 'Xác nhận thử lại',
      cancelText: 'Hủy',
      onOk: async () => {
        setRetryingFinancialId(orderId);
        try {
          await apiClient(`/admin/dropship/retry/${orderId}`, { method: 'POST' });
          message.success('Đã gửi yêu cầu thử lại B2B');
          await loadFinancialOrders();
          await loadStatusOrders();
        } catch (err: unknown) {
          message.error(getErrorMessage(err, 'Không thể thử lại đơn B2B'));
        } finally {
          setRetryingFinancialId(null);
        }
      },
    });
  };

    (sum, item) => sum + Number(item.estimated_commission || 0), 0,
  );

  const statusColumns = [
    { title: 'Booking ID', dataIndex: 'booking_id', width: 110,
      render: (value: string) => <Text code>#{value}</Text> },
    { title: 'Khách hàng', dataIndex: 'customer_name',
      render: (value: string | null) => <Text strong>{value ?? '—'}</Text> },
    { title: 'Homestay', dataIndex: 'homestay_name',
      render: (value: string | null) => value ?? '—' },
    { title: 'Nhận phòng', dataIndex: 'check_in',
      render: (value: string) => formatDate(value) },
    { title: 'Trả phòng', dataIndex: 'check_out',
      render: (value: string) => formatDate(value) },
    { title: 'Tổng tiền', dataIndex: 'total_amount',
      render: (value: number) => <Text strong style={{ color: '#059669' }}>{money(value)}</Text> },
    { title: 'Trạng thái B2B', dataIndex: 'b2b_status',
      render: (status: string) => {
        const config = B2B_STATUS_CONFIG[status] ?? { color: 'default', icon: null, label: status };
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      } },
    { title: 'Provider Booking ID', dataIndex: 'b2b_provider_booking_id',
      render: (value: string | null) => value ? <Text code>{value}</Text> : '—' },
    { title: 'Lỗi', dataIndex: 'b2b_error_message', width: 200,
      render: (value: string | null) => value ? (
        <Tooltip title={value}>
          <Text type="danger" style={{ fontSize: 12 }}>
            {value.length > 40 ? `${value.slice(0, 40)}...` : value}
          </Text>
        </Tooltip>
      ) : '—' },
    { title: 'Lần thử cuối', dataIndex: 'b2b_last_attempt_at',
      render: (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—' },
    { title: 'Hành động',
      render: (_: unknown, order: DropshipOrder) => order.b2b_status === 'FAILED' ? (
        <Button size="small" type="primary" icon={<SyncOutlined />}
          loading={retryingStatusId === order.booking_id}
          onClick={() => handleStatusRetry(order.booking_id)}>
          Retry
        </Button>
      ) : <Tag>{order.b2b_status === 'BOOKED' ? 'Hoàn tất' : '—'}</Tag> },
  ];

  const financialColumns = [
    { title: 'Mã đơn', dataIndex: 'booking_code',
      render: (value: string, order: FinancialDropshipOrder) => (
        <div><Text strong>{value}</Text><div><Text type="secondary">{formatDate(order.created_at)}</Text></div></div>
      ) },
    { title: 'Khách hàng', render: (_: unknown, order: FinancialDropshipOrder) => (
      <div><Text strong>{order.customer_name}</Text><div><Text type="secondary">{order.customer_phone}</Text></div></div>
    ) },
    { title: 'Homestay & Hạng phòng', render: (_: unknown, order: FinancialDropshipOrder) => (
      <div><Text strong>{order.homestay_name}</Text><div>{order.room_name}</div>
        <Text type="secondary">{formatDate(order.check_in_date)} → {formatDate(order.check_out_date)}</Text>
      </div>
    ) },
    { title: 'Mã Booking.com', render: (_: unknown, order: FinancialDropshipOrder) =>
      order.ota_fulfillment ? (
        <div><Tag color="blue">{order.ota_fulfillment.ota_booking_code}</Tag>
          <div><Text type="secondary">PNR: {order.ota_fulfillment.pnr_code}</Text></div>
        </div>
      ) : <Tag color="warning">Chưa có xác nhận</Tag> },
    { title: 'Giá khách trả', dataIndex: 'retail_amount',
      render: (value: number) => <Text strong>{money(value)}</Text> },
    { title: 'Vốn B2B', dataIndex: 'wholesale_amount',
      render: (value: number) => <Text type="danger">{money(value)}</Text> },
    { title: 'Lợi nhuận', dataIndex: 'profit_margin',
      render: (value: number) => <Text strong style={{ color: '#16a34a' }}>{money(value)}</Text> },
    { title: 'Hành động', render: (_: unknown, order: FinancialDropshipOrder) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {order.ota_fulfillment && (
          <Button size="small" type="link" onClick={() => setSelectedOrder(order)}>Chi tiết VCC</Button>
        )}
        {(order.booking_status === 'FAILED' || order.ota_fulfillment?.status === 'FAILED') && (
          <Button size="small" type="primary" icon={<SyncOutlined />}
            loading={retryingFinancialId === order.id}
            onClick={() => handleFinancialRetry(order.id)}>
            Thử lại
          </Button>
        )}
      </div>
    ) },
  ];
                <Col xs={24} sm={8}><Card><Statistic title="Đã đặt B2B" value={bookedCount}
                  prefix={<CheckCircleOutlined style={{ color: '#059669' }} />} /></Card></Col>
                <Col xs={24} sm={8}><Card><Statistic title="Thất bại" value={failedCount}
                  valueStyle={failedCount > 0 ? { color: '#dc2626' } : undefined}
                  prefix={<CloseCircleOutlined />} /></Card></Col>
              </Row>
              {statusError && <Alert type="warning" showIcon message="Không thể tải trạng thái B2B"
                description={statusError} style={{ marginBottom: 16 }} />}
              {failedCount > 0 && <Alert type="error" showIcon
                message={`${failedCount} đơn B2B thất bại — cần kiểm tra`}
                description="Xác minh đơn tại nhà cung cấp trước khi chọn Retry để tránh đặt trùng."
                style={{ marginBottom: 16 }} />}
              <Card bodyStyle={{ padding: 0 }}>
                <Table<DropshipOrder> rowKey="booking_id" loading={statusLoading}
                  columns={statusColumns} dataSource={statusOrders}
                  pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} đơn` }}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'Không có đơn B2B nào' }}
                  rowClassName={(order) => order.b2b_status === 'FAILED' ? 'ant-table-row-danger' : ''} />
              </Card>
            </>
          ),
        },
        {
          key: 'b2b-finance',
          label: <span><DollarOutlined style={{ marginRight: 6 }} />Đối soát B2B</span>,
          children: (
            <>
              {financialError && <Alert type="warning" showIcon message="Không thể tải dữ liệu đối soát"
                description={financialError} style={{ marginBottom: 16 }} />}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}><Card><Statistic title="Tổng đơn Dropship" value={financialData.total}
                  prefix={<ShopOutlined />} /></Card></Col>
                <Col xs={24} sm={8}><Card><Statistic title="Doanh thu thu từ khách"
                  value={financialData.summary.total_revenue} formatter={(value) => money(Number(value))}
                  prefix={<DollarOutlined />} /></Card></Col>
                <Col xs={24} sm={8}><Card><Statistic title="Lợi nhuận sàn"
                  value={financialData.summary.total_profit_margin}
                  formatter={(value) => money(Number(value))}
                  valueStyle={{ color: '#16a34a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
              </Row>
              <Card bodyStyle={{ padding: 0 }}>
                <Table<FinancialDropshipOrder> dataSource={financialData.items}
                  columns={financialColumns} rowKey="id" loading={financialLoading}
                  locale={{ emptyText: 'Chưa có đơn đối soát B2B nào' }}
                  pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} đơn` }}
                  scroll={{ x: 'max-content' }} />
              </Card>
            </>
          ),
        },
        {
          key: 'affiliate',
          label: <span><LinkOutlined style={{ marginRight: 6 }} />Affiliate</span>,
          children: (
            <>
              {affiliateIsDemo && <Alert type="info" showIcon
                message="Dữ liệu affiliate mẫu"
                description="Hiện chưa có log trong localStorage, nên các số liệu dưới đây chỉ là bản demo; không phải hoa hồng đã được Booking.com xác nhận."
                style={{ marginBottom: 16 }} />}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}><Card><Statistic title="Lượt chuyển tiếp" value={affiliateClicks.length}
                  prefix={<LinkOutlined />} /></Card></Col>
                <Col xs={24} sm={8}><Card><Statistic title="Doanh số phòng tiềm năng"
                  value={totalAffiliatePotential} formatter={(value) => money(Number(value))}
                  prefix={<DollarOutlined />} /></Card></Col>
                <Col xs={24} sm={8}><Card><Statistic title="Hoa hồng ước tính (theo dữ liệu log)"
                  value={totalAffiliateCommission} formatter={(value) => money(Number(value))}
                  prefix={<CheckCircleOutlined />} /></Card></Col>
              </Row>
              <Card bodyStyle={{ padding: 0 }}>
                <Table<AffiliateClick> dataSource={affiliateClicks} columns={affiliateColumns}
                  rowKey="id" scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'Chưa có lượt chuyển tiếp affiliate nào' }}
                  pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} lượt` }} />
              </Card>
            </>
          ),
        },
      ]} />
       <Modal title="Chi tiết giao dịch B2B (Booking.com)" open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)} footer={null} width={650}>
        {selectedOrder?.ota_fulfillment && (
          <>
            <div style={{ background: '#003580', color: '#fff', padding: '16px 20px', borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>MÃ XÁC NHẬN BOOKING.COM</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ffb700' }}>
                {selectedOrder.ota_fulfillment.ota_booking_code}
              </div>
              <div>{selectedOrder.ota_fulfillment.api_spec} • {selectedOrder.ota_fulfillment.mode}</div>
            </div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Mã PNR">{selectedOrder.ota_fulfillment.pnr_code}</Descriptions.Item>
              <Descriptions.Item label="Mã PIN">{selectedOrder.ota_fulfillment.pin_code}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{selectedOrder.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedOrder.customer_phone}</Descriptions.Item>
              <Descriptions.Item label="Phương thức B2B">{selectedOrder.ota_fulfillment.payment_method_b2b}</Descriptions.Item>
              <Descriptions.Item label="Thẻ ảo VCC">•••• •••• •••• {selectedOrder.ota_fulfillment.vcc_card_last4}</Descriptions.Item>
              <Descriptions.Item label="Giá bán lẻ">{money(selectedOrder.ota_fulfillment.retail_amount)}</Descriptions.Item>
              <Descriptions.Item label="Giá vốn">{money(selectedOrder.ota_fulfillment.wholesale_amount)}</Descriptions.Item>
              <Descriptions.Item label="Lợi nhuận" span={2}>
                <Text strong style={{ color: '#16a34a' }}>{money(selectedOrder.ota_fulfillment.profit_margin)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Thời điểm đặt" span={2}>
                {selectedOrder.ota_fulfillment.fulfilled_at
                  ? new Date(selectedOrder.ota_fulfillment.fulfilled_at).toLocaleString('vi-VN') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>{selectedOrder.ota_fulfillment.notes}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
}

                
