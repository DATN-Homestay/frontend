import { useEffect, useState } from 'react';
import { Alert, App, Button, Input, Modal, Popconfirm, Select, Table, Tag, Tooltip, Typography } from 'antd';
import { refundAdminService, type AdminRefund } from '../../services/refundAdminService';
import type { RefundStatus } from '../../types/customer';

const { Text } = Typography;

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const STATUS_TAG: Record<RefundStatus, { color: string; text: string }> = {
  PENDING: { color: 'orange', text: 'Chờ xử lý' },
  PROCESSING: { color: 'processing', text: 'Đang gọi VNPay' },
  PROCESSED: { color: 'success', text: 'Đã hoàn' },
  FAILED: { color: 'error', text: 'Thất bại' },
};

const SOURCE_LABEL: Record<AdminRefund['source'], string> = {
  CUSTOMER_CANCEL: 'Khách hủy',
  HOST_CANCEL: 'Chủ nhà hủy',
  ADMIN_CANCEL: 'Admin hủy',
  LATE_PAYMENT: 'Thanh toán muộn',
  OTHER: 'Khác',
};

export default function RefundsPage() {
  const { message } = App.useApp();

  const [items, setItems] = useState<AdminRefund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<RefundStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [manualTarget, setManualTarget] = useState<AdminRefund | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = (next: { page?: number; pageSize?: number; status?: RefundStatus | undefined } = {}) => {
    setLoading(true);
    if ('page' in next) setPage(next.page!);
    if ('pageSize' in next) setPageSize(next.pageSize!);
    if ('status' in next) setStatus(next.status);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    refundAdminService
      .list({ status, page, limit: pageSize })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.meta.total);
      })
      .catch((err) => {
        if (!cancelled) message.error(err instanceof Error ? err.message : 'Không tải được danh sách hoàn tiền');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, pageSize, reloadKey, message]);

  const retry = async (record: AdminRefund) => {
    setBusyId(record.id);
    try {
      const result = await refundAdminService.retry(record.id);
      if (result.status === 'PROCESSED') message.success(`Đã hoàn ${money(result.refund_amount)} cho đơn ${result.booking_code}`);
      else message.warning(`VNPay chưa hoàn tất: ${result.last_error ?? 'vui lòng thử lại sau'}`);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể gửi lại yêu cầu');
    } finally {
      setBusyId(null);
    }
  };

  const saveManual = async () => {
    if (!manualTarget) return;
    setSaving(true);
    try {
      await refundAdminService.markManual(manualTarget.id, note.trim());
      message.success('Đã ghi nhận hoàn tiền thủ công');
      setManualTarget(null);
      setNote('');
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể ghi nhận');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Mã đơn', dataIndex: 'booking_code', render: (v: string | null) => v ?? '—' },
    { title: 'Nguồn', dataIndex: 'source', render: (s: AdminRefund['source']) => SOURCE_LABEL[s] },
    { title: 'Số tiền hoàn', dataIndex: 'refund_amount', render: (v: number) => <strong>{money(v)}</strong> },
    {
      title: 'Phạt Host',
      dataIndex: 'penalty_amount',
      render: (v: number) => (v > 0 ? <Text type="danger">{money(v)}</Text> : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: RefundStatus, r: AdminRefund) => (
        <span>
          <Tag color={STATUS_TAG[s].color}>{STATUS_TAG[s].text}</Tag>
          {r.attempts > 0 && <Text type="secondary" style={{ fontSize: 12 }}>({r.attempts} lần gọi)</Text>}
        </span>
      ),
    },
    {
      title: 'Lỗi gần nhất',
      dataIndex: 'last_error',
      ellipsis: true,
      width: 220,
      render: (v: string | null) => (v ? <Tooltip title={v}><Text type="danger">{v}</Text></Tooltip> : '—'),
    },
    { title: 'Ngày tạo', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
    {
      title: 'Hành động',
      render: (_: unknown, r: AdminRefund) => {
        if (r.status === 'PROCESSED' || r.status === 'PROCESSING') {
          return r.vnp_transaction_no ? <Text type="secondary">GD {r.vnp_transaction_no}</Text> : null;
        }
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            {r.status === 'FAILED' && (
              <Popconfirm
                title="Gửi lại yêu cầu sang VNPay?"
                description="Nếu VNPay đã hoàn trước đó, hệ thống sẽ nhận mã báo đã xử lý và không hoàn trùng."
                okText="Gửi lại"
                cancelText="Hủy"
                onConfirm={() => retry(r)}
              >
                <Button type="primary" size="small" loading={busyId === r.id}>
                  Thử lại
                </Button>
              </Popconfirm>
            )}
            <Button size="small" onClick={() => setManualTarget(r)}>
              Hoàn thủ công
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Hoàn tiền</h2>
        <Select
          allowClear
          placeholder="Tất cả trạng thái"
          style={{ width: 200 }}
          value={status}
          onChange={(value) => reload({ page: 1, status: value })}
          options={(Object.keys(STATUS_TAG) as RefundStatus[]).map((s) => ({ value: s, label: STATUS_TAG[s].text }))}
        />
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="Hệ thống tự gửi yêu cầu hoàn tiền sang VNPay khi khách hoặc chủ nhà hủy đơn. Bạn chỉ cần xử lý các yêu cầu Thất bại hoặc Chờ xử lý quá lâu."
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (t) => `Tổng ${t} yêu cầu hoàn tiền`,
          onChange: (p, size) => reload({ page: size === pageSize ? p : 1, pageSize: size }),
        }}
      />

      <Modal
        title={`Ghi nhận hoàn thủ công #${manualTarget?.id}`}
        open={!!manualTarget}
        onCancel={() => setManualTarget(null)}
        onOk={saveManual}
        okText="Xác nhận đã hoàn"
        cancelText="Hủy"
        okButtonProps={{ disabled: note.trim().length < 5, loading: saving }}
      >
        <p>
          Đơn <strong>{manualTarget?.booking_code}</strong>: <strong>{manualTarget && money(manualTarget.refund_amount)}</strong>
        </p>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="Chỉ ghi nhận sau khi bạn đã hoàn tiền thật cho khách (chuyển khoản hoặc trên Merchant Admin của VNPay). Thao tác này không gửi tiền."
        />
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú đối soát, VD: mã giao dịch chuyển khoản (tối thiểu 5 ký tự)"
        />
      </Modal>
    </div>
  );
}
