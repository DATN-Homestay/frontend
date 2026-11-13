import { useEffect, useState } from 'react';
import { App, Button, Descriptions, Drawer, Image, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { complaintService } from '../../services/complaintService';
import {
  COMPLAINT_CATEGORY_LABEL,
  COMPLAINT_STATUS_TAG,
  type Complaint,
  type ComplaintStatus,
} from '../../types/customer';

const { Title, Text, Paragraph } = Typography;

type Action = Exclude<ComplaintStatus, 'OPEN'>;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) : '—';

const isOpen = (s: ComplaintStatus) => s === 'OPEN' || s === 'IN_REVIEW';

/** Admin xem và xử lý khiếu nại của khách: OPEN → IN_REVIEW → RESOLVED / DISMISSED */
export default function ComplaintsPage() {
  const { message } = App.useApp();

  const [items, setItems] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<ComplaintStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<Complaint | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);

  const reload = (next: { page?: number; pageSize?: number; status?: ComplaintStatus | undefined } = {}) => {
    setLoading(true);
    if ('page' in next) setPage(next.page!);
    if ('pageSize' in next) setPageSize(next.pageSize!);
    if ('status' in next) setStatus(next.status);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    complaintService
      .listForAdmin({ status, page, limit: pageSize })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.meta.total);
      })
      .catch((err) => {
        if (!cancelled) message.error(err instanceof Error ? err.message : 'Không tải được danh sách khiếu nại');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, pageSize, reloadKey, message]);

  const open = (c: Complaint) => {
    setNote(c.resolution_note ?? '');
    setSelected(c);
  };

  const act = async (action: Action) => {
    if (!selected) return;
    const text = note.trim();
    if (action !== 'IN_REVIEW' && text.length < 10) {
      message.warning('Ghi chú kết quả cho khách cần ít nhất 10 ký tự');
      return;
    }
    setBusy(action);
    try {
      const updated = await complaintService.updateStatus(selected.id, action, text.length >= 10 ? text : undefined);
      message.success(`Khiếu nại #${updated.id}: ${COMPLAINT_STATUS_TAG[updated.status].text}`);
      setSelected(updated);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không cập nhật được khiếu nại');
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    { title: '#', dataIndex: 'id', width: 70 },
    {
      title: 'Khiếu nại',
      render: (_: unknown, c: Complaint) => (
        <div>
          <Text strong>{c.title}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>{COMPLAINT_CATEGORY_LABEL[c.category]}</div>
        </div>
      ),
    },
    {
      title: 'Đơn / Chỗ nghỉ',
      render: (_: unknown, c: Complaint) => (
        <div>
          <div>{c.booking_code}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{c.homestay.name}</div>
        </div>
      ),
    },
    { title: 'Khách', render: (_: unknown, c: Complaint) => c.reporter.full_name ?? `#${c.reporter.id}` },
    { title: 'Gửi lúc', dataIndex: 'created_at', render: fmt },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: ComplaintStatus) => <Tag color={COMPLAINT_STATUS_TAG[s].color}>{COMPLAINT_STATUS_TAG[s].text}</Tag>,
    },
    {
      title: '',
      render: (_: unknown, c: Complaint) => (
        <Button size="small" type={isOpen(c.status) ? 'primary' : 'default'} onClick={() => open(c)}>
          {isOpen(c.status) ? 'Xử lý' : 'Xem'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Khiếu nại của khách
        </Title>
        <Select
          aria-label="Lọc trạng thái"
          allowClear
          placeholder="Tất cả trạng thái"
          style={{ width: 200 }}
          value={status}
          onChange={(v) => reload({ page: 1, status: v })}
          options={(Object.keys(COMPLAINT_STATUS_TAG) as ComplaintStatus[]).map((s) => ({
            value: s,
            label: COMPLAINT_STATUS_TAG[s].text,
          }))}
        />
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Khiếu nại đang mở hiện trước và tạm giữ khoản giải ngân của đơn cho tới khi được đóng.
      </Text>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, size) => reload({ page: size !== pageSize ? 1 : p, pageSize: size }),
        }}
      />

      <Drawer
        title={selected ? `Khiếu nại #${selected.id}` : ''}
        open={!!selected}
        onClose={() => setSelected(null)}
        size={520}
        destroyOnHidden
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Trạng thái">
                <Tag color={COMPLAINT_STATUS_TAG[selected.status].color}>{COMPLAINT_STATUS_TAG[selected.status].text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Loại">{COMPLAINT_CATEGORY_LABEL[selected.category]}</Descriptions.Item>
              <Descriptions.Item label="Đơn">
                {selected.booking_code} ({selected.check_in_date} → {selected.check_out_date})
              </Descriptions.Item>
              <Descriptions.Item label="Chỗ nghỉ">{selected.homestay.name}</Descriptions.Item>
              <Descriptions.Item label="Khách">{selected.reporter.full_name ?? `#${selected.reporter.id}`}</Descriptions.Item>
              <Descriptions.Item label="Gửi lúc">{fmt(selected.created_at)}</Descriptions.Item>
              {selected.resolved_at && <Descriptions.Item label="Đóng lúc">{fmt(selected.resolved_at)}</Descriptions.Item>}
            </Descriptions>

            <Title level={5} style={{ marginTop: 16 }}>
              {selected.title}
            </Title>
            <Paragraph style={{ whiteSpace: 'pre-line' }}>{selected.description}</Paragraph>
            {selected.attachments.length > 0 && (
              <Image.PreviewGroup>
                <Space wrap style={{ marginBottom: 16 }}>
                  {selected.attachments.map((src, i) => (
                    <Image key={src} src={src} alt={`Ảnh ${i + 1}`} width={88} height={88} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ))}
                </Space>
              </Image.PreviewGroup>
            )}

            {isOpen(selected.status) ? (
              <>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  Ghi chú kết quả gửi khách
                </Text>
                <Input.TextArea
                  aria-label="Ghi chú kết quả"
                  rows={4}
                  maxLength={2000}
                  showCount
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Bắt buộc khi giải quyết hoặc bác bỏ. Khách sẽ thấy ghi chú này trong chi tiết đơn."
                />
                <Space wrap style={{ marginTop: 12 }}>
                  {selected.status === 'OPEN' && (
                    <Button loading={busy === 'IN_REVIEW'} disabled={!!busy} onClick={() => act('IN_REVIEW')}>
                      Nhận xử lý
                    </Button>
                  )}
                  <Button type="primary" loading={busy === 'RESOLVED'} disabled={!!busy} onClick={() => act('RESOLVED')}>
                    Đã giải quyết
                  </Button>
                  <Button danger loading={busy === 'DISMISSED'} disabled={!!busy} onClick={() => act('DISMISSED')}>
                    Bác bỏ
                  </Button>
                </Space>
              </>
            ) : (
              selected.resolution_note && (
                <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6 }}>
                  <Text strong>Ghi chú xử lý:</Text> {selected.resolution_note}
                </div>
              )
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
