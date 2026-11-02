import {
  Table,
  Tag,
  Button,
  Modal,
  Input,
  message,
  Space,
  Alert,
  Tooltip,
  Badge,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  BankOutlined,
  WarningOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminService, type PendingPayout } from '../../services/adminService';

const { Text, Paragraph } = Typography;

export default function PayoutsPage() {
  const [data, setData] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal approve
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState<PendingPayout | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [approving, setApproving] = useState(false);

  // Modal reject
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getPendingPayouts();
      setData(res);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải danh sách payout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async () => {
    if (!selected) return;
    if (!receiptUrl.trim()) {
      message.warning('Vui lòng nhập URL biên lai ngân hàng');
      return;
    }
    setApproving(true);
    try {
      await adminService.approvePayout(selected.payout_id, receiptUrl.trim());
      message.success(`✅ Đã phê duyệt giải ngân #${selected.payout_id} cho ${selected.host_name}`);
      setApproveOpen(false);
      setReceiptUrl('');
      loadData();
    } catch (err: any) {
      message.error(err.message ?? 'Không thể phê duyệt payout');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      message.warning('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }
    setRejecting(true);
    try {
      await adminService.rejectPayout(selected.payout_id, rejectReason.trim());
      message.success(`Đã từ chối payout #${selected.payout_id}`);
      setRejectOpen(false);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      message.error(err.message ?? 'Không thể từ chối payout');
    } finally {
      setRejecting(false);
    }
  };

  const openApproveModal = (record: PendingPayout) => {
    setSelected(record);
    setReceiptUrl('');
    setApproveOpen(true);
  };

  const openRejectModal = (record: PendingPayout) => {
    setSelected(record);
    setRejectReason('');
    setRejectOpen(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'payout_id',
      width: 80,
      render: (v: string) => <Text code>#{v}</Text>,
    },
    {
      title: 'Host',
      dataIndex: 'host_name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Số tiền giải ngân',
      dataIndex: 'actual_payout_amount',
      render: (v: number) => (
        <Text style={{ color: '#059669', fontWeight: 600 }}>
          {Number(v).toLocaleString('vi-VN')} ₫
        </Text>
      ),
    },
    {
      title: 'Doanh thu gốc',
      dataIndex: 'total_booking_amount',
      render: (v: number) => Number(v).toLocaleString('vi-VN') + ' ₫',
    },
    {
      title: 'Hoa hồng (7.5%)',
      dataIndex: 'platform_commission',
      render: (v: number) => (
        <Text type="secondary">{Number(v).toLocaleString('vi-VN')} ₫</Text>
      ),
    },
    {
      title: 'Ngân hàng',
      render: (_: any, r: PendingPayout) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.bank_name ?? '—'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.bank_account_number_decrypted ?? '—'}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Tên chủ tài khoản ngân hàng có khớp 100% với tên CCCD không?">
          Khớp tên CCCD ⓘ
        </Tooltip>
      ),
      dataIndex: 'cccd_name_match',
      render: (match: boolean) =>
        match ? (
          <Tag color="success" icon={<SafetyOutlined />}>Khớp</Tag>
        ) : (
          <Tag color="error" icon={<WarningOutlined />}>Không khớp</Tag>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: string) => {
        const map: Record<string, string> = {
          PENDING: 'warning',
          APPROVED: 'success',
          REJECTED: 'error',
          PAID_OUT: 'success',
        };
        return <Tag color={map[s] ?? 'default'}>{s}</Tag>;
      },
    },
    {
      title: 'Hành động',
      render: (_: any, record: PendingPayout) =>
        record.status === 'PENDING' ? (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={!record.cccd_name_match}
              onClick={() => openApproveModal(record)}
              title={!record.cccd_name_match ? 'Tên ngân hàng không khớp CCCD, không thể duyệt' : ''}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => openRejectModal(record)}
            >
              Từ chối
            </Button>
          </Space>
        ) : (
          <Tag color="default">Đã xử lý</Tag>
        ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
            Đối soát & Giải ngân Payout
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Maker-Checker: Duyệt chuyển khoản cho Host sau khi đơn hoàn tất (BR-013, BR-020)
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Làm mới
        </Button>
      </div>

      {error && (
        <Alert
          type="warning"
          message="Không thể kết nối backend"
          description={error}
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="payout_id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ position: ['bottomCenter'], pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Không có payout nào đang chờ duyệt' }}
        rowClassName={(r) => (!r.cccd_name_match && r.status === 'PENDING' ? 'ant-table-row-warning' : '')}
      />

      {/* APPROVE MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BankOutlined style={{ color: '#059669' }} />
            Xác nhận giải ngân — {selected?.host_name}
          </div>
        }
        open={approveOpen}
        onOk={handleApprove}
        onCancel={() => setApproveOpen(false)}
        okText="Xác nhận đã chuyển khoản"
        okButtonProps={{ loading: approving, type: 'primary' }}
        cancelText="Hủy"
        width={520}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#64748b' }}>Số tiền chuyển:</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#059669' }}>
                {Number(selected?.actual_payout_amount ?? 0).toLocaleString('vi-VN')} ₫
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Ngân hàng:</span>
              <span style={{ fontWeight: 500 }}>{selected?.bank_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Số tài khoản:</span>
              <Text code>{selected?.bank_account_number_decrypted}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
              <span>{selected?.bank_account_name}</span>
            </div>
          </div>

          {selected?.cccd_name_match === false && (
            <Alert
              type="error"
              showIcon
              message="Tên ngân hàng KHÔNG khớp tên CCCD"
              description="Theo BR-020, không được phép giải ngân khi tên chủ tài khoản không khớp 100% với tên trên CCCD."
              style={{ marginBottom: 12 }}
            />
          )}

          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151' }}>
            URL Biên lai ngân hàng (ảnh ủy nhiệm chi) *
          </label>
          <Input
            placeholder="https://res.cloudinary.com/homestay/receipt_..."
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            size="large"
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            Upload ảnh biên lai lên Cloudinary rồi dán URL vào đây.
          </Text>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloseCircleOutlined style={{ color: '#ef4444' }} />
            Từ chối giải ngân — {selected?.host_name}
          </div>
        }
        open={rejectOpen}
        onOk={handleReject}
        onCancel={() => setRejectOpen(false)}
        okText="Xác nhận từ chối"
        okButtonProps={{ loading: rejecting, danger: true }}
        cancelText="Hủy"
        width={480}
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Payout <Text code>#{selected?.payout_id}</Text> — {Number(selected?.actual_payout_amount ?? 0).toLocaleString('vi-VN')} ₫ sẽ bị từ chối. Host sẽ cần cập nhật thông tin tài khoản.
        </Paragraph>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
          Lý do từ chối *
        </label>
        <Input.TextArea
          rows={4}
          placeholder="Ví dụ: Tên chủ tài khoản không khớp CCCD. Vui lòng cập nhật thông tin ngân hàng..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          showCount
          maxLength={500}
        />
      </Modal>
    </div>
  );
}