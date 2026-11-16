import { useEffect, useState } from 'react';
import { Alert, App, Button, Empty, Input, InputNumber, Skeleton, Table, Tabs, Tag } from 'antd';
import { ArrowRightOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined, ReloadOutlined, RobotOutlined, SafetyCertificateOutlined, SaveOutlined, SettingOutlined, StarOutlined, UndoOutlined } from '@ant-design/icons';
import { ApiError } from '../../services/apiClient';
import { systemSettingsService, type SettingHistory, type SettingsGroup, type SystemSettingsData } from '../../services/systemSettingsService';
import './Configs.css';

const groups: { key: SettingsGroup; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'booking', label: 'Đặt phòng', description: 'Thời gian thanh toán và giới hạn đặt phòng cho khách.', icon: <CalendarOutlined /> },
  { key: 'reviews', label: 'Đánh giá sau lưu trú', description: 'Thời hạn khách được chia sẻ trải nghiệm sau chuyến đi.', icon: <StarOutlined /> },
  { key: 'ai', label: 'Gợi ý giá AI', description: 'Giữ giá đề xuất trong biên độ phù hợp và dữ liệu còn hiệu lực.', icon: <RobotOutlined /> },
];
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', hour12: false });
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối hệ thống. Vui lòng thử lại.';

function SettingsHistoryTable({ version }: { version: number }) {
  const [rows, setRows] = useState<SettingHistory[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    systemSettingsService.history(page).then((data) => {
      if (!alive) return;
      setRows(data.items); setTotal(data.meta.total); setError('');
    }).catch((err) => { if (alive) setError(errorText(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page, version, reload]);

  return <div className="settings-history">
    <div className="settings-history-heading"><div><h2>Lịch sử thay đổi</h2><p>Mỗi giá trị được lưu kèm người thực hiện, thời gian và lý do.</p></div>
      <Button icon={<ReloadOutlined />} onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Tải lại</Button></div>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
    <Table<SettingHistory> rowKey="id" loading={loading} dataSource={rows} scroll={{ x: 850 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thay đổi cấu hình nào" /> }}
      pagination={{ current: page, pageSize: 10, total, showSizeChanger: false, onChange: (value) => { setLoading(true); setPage(value); } }}
      columns={[
        { title: 'Thời gian', dataIndex: 'created_at', width: 175, render: dateTime },
        { title: 'Cấu hình', dataIndex: 'label', width: 230, render: (label, row) => <div><strong>{label}</strong><small className="settings-history-version">Phiên bản {row.revision}</small></div> },
        { title: 'Thay đổi', width: 150, render: (_, row) => <span className="settings-history-change">{row.old_value}<ArrowRightOutlined /><strong>{row.new_value} {row.unit}</strong></span> },
        { title: 'Người thực hiện', dataIndex: 'actor_name', width: 160 },
        { title: 'Lý do', dataIndex: 'reason' },
      ]} />
  </div>;
}

export default function ConfigsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<SystemSettingsData | null>(null);
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState('settings');

  useEffect(() => {
    let alive = true;
    systemSettingsService.get().then((response) => {
      if (!alive) return;
      setData(response); setDraft(Object.fromEntries(response.items.map((item) => [item.key, item.value])));
      setReason(''); setError(''); setConflict(false);
    }).catch((err) => { if (alive) setError(errorText(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);

  const changes = data?.items.filter((item) => draft[item.key] !== item.value) ?? [];
  const invalid = data?.items.some((item) => !Number.isInteger(draft[item.key]) || Number(draft[item.key]) < item.min || Number(draft[item.key]) > item.max) ?? false;
  const refresh = () => { setLoading(true); setReload((value) => value + 1); };
  const undo = () => {
    if (data) setDraft(Object.fromEntries(data.items.map((item) => [item.key, item.value])));
    setReason('');
  };
  const save = async () => {
    if (!data || saving || !changes.length || invalid || reason.trim().length < 5 || conflict) return;
    setSaving(true); setError('');
    try {
      const response = await systemSettingsService.update(data.revision, changes.map((item) => ({ key: item.key, value: draft[item.key]! })), reason.trim());
      setData(response); setDraft(Object.fromEntries(response.items.map((item) => [item.key, item.value]))); setReason('');
      message.success('Đã lưu cấu hình. Các thao tác tiếp theo sẽ dùng giá trị mới.');
    } catch (err) {
      setConflict(err instanceof ApiError && err.status === 409); setError(errorText(err));
    } finally { setSaving(false); }
  };

  return <div className="system-settings-page">
    <header className="settings-page-heading"><div className="settings-page-heading-copy"><span className="settings-page-icon"><SettingOutlined /></span>
      <div><span className="settings-eyebrow">QUẢN TRỊ NỀN TẢNG</span><h1>Cấu hình hệ thống</h1><p>Thiết lập các quy tắc vận hành cho đặt phòng, đánh giá và gợi ý giá.</p></div></div>
      {data && <Tag className="settings-version"><CheckCircleOutlined /> Phiên bản {data.revision}</Tag>}
    </header>

    {error && <Alert className="settings-error" type={conflict ? 'warning' : 'error'} showIcon title={error}
      action={<Button size="small" onClick={data && !conflict ? () => void save() : refresh} disabled={saving}>{conflict ? 'Tải bản mới' : data ? 'Thử lưu lại' : 'Thử lại'}</Button>}
      description={conflict ? 'Bản chỉnh sửa của bạn vẫn được giữ. Tải bản mới sẽ thay thế bản chỉnh sửa này.' : undefined} />}

    {loading ? <div className="settings-loading"><Skeleton active paragraph={{ rows: 8 }} /></div> : data ? <>
      <Tabs activeKey={tab} onChange={setTab} className="settings-tabs" items={[
        { key: 'settings', label: <span><SettingOutlined /> Cấu hình vận hành{changes.length > 0 && <span className="settings-tab-count">{changes.length}</span>}</span>, children: <>
          <div className="settings-policy-panel"><div className="settings-policy-title"><SafetyCertificateOutlined /><div><h2>Chính sách nền tảng</h2><p>Các quy tắc cố định đang áp dụng trong dự án.</p></div><Tag>Chỉ xem</Tag></div>
            <div className="settings-policy-grid">{data.policies.map((policy) => <div key={policy.key}><span>{policy.label}</span><strong>{policy.value}</strong><p>{policy.description}</p></div>)}</div>
          </div>

          <div className="settings-groups">{groups.map((group) => <section className="settings-group" key={group.key} aria-labelledby={`settings-${group.key}`}>
            <div className="settings-group-heading"><span className={`settings-group-icon settings-group-icon--${group.key}`}>{group.icon}</span><div><h2 id={`settings-${group.key}`}>{group.label}</h2><p>{group.description}</p></div></div>
            <div className="settings-fields">{data.items.filter((item) => item.group === group.key).map((item) => {
              const changed = draft[item.key] !== item.value;
              const invalidField = !Number.isInteger(draft[item.key]) || Number(draft[item.key]) < item.min || Number(draft[item.key]) > item.max;
              return <div className={`settings-field${changed ? ' is-changed' : ''}`} key={item.key}>
                <div className="settings-field-copy"><label htmlFor={`setting-${item.key}`}>{item.label}{changed && <span className="settings-changed-dot" aria-label="Đã chỉnh sửa" />}</label><p id={`hint-${item.key}`}>{item.description}</p></div>
                <div className="settings-field-control"><InputNumber<number> id={`setting-${item.key}`} aria-describedby={`hint-${item.key} range-${item.key}`} aria-invalid={invalidField}
                  value={draft[item.key]} disabled={saving} min={item.min} max={item.max} step={1} changeOnBlur={false} status={invalidField ? 'error' : undefined}
                  onInput={(text) => { const value = text.trim() ? Number(text) : null; setDraft((current) => ({ ...current, [item.key]: value !== null && Number.isFinite(value) ? value : null })); }}
                  suffix={item.unit} onChange={(value) => setDraft((current) => ({ ...current, [item.key]: value }))} />
                  <span className={invalidField ? 'settings-range is-invalid' : 'settings-range'} id={`range-${item.key}`}>{invalidField ? 'Nhập số nguyên' : 'Cho phép'} {item.min}–{item.max} · Mặc định {item.defaultValue}</span>
                </div>
              </div>;
            })}</div>
          </section>)}</div>

          {changes.length > 0 && <section className="settings-review" aria-label="Thay đổi đang chờ lưu"><h2>Xem lại {changes.length} thay đổi</h2>
            <div className="settings-change-list">{changes.map((item) => <div key={item.key}><span>{item.label}</span><span>{item.value}<ArrowRightOutlined /><strong>{draft[item.key] ?? '—'} {item.unit}</strong></span></div>)}</div>
            <label htmlFor="settings-reason">Lý do thay đổi</label><Input.TextArea id="settings-reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving} maxLength={500} showCount rows={2} placeholder="Ví dụ: Rút ngắn thời gian giữ phòng vào mùa cao điểm" />
            <p>Nhập ít nhất 5 ký tự để lưu vào lịch sử thay đổi.</p>
          </section>}

          <div className="settings-save-bar"><div><ClockCircleOutlined /><span>{changes.length ? `${changes.length} thay đổi chưa lưu` : `Đã cập nhật: ${dateTime(data.updated_at)}`}</span></div>
            <div className="settings-save-actions"><Button type="text" disabled={saving} onClick={() => setDraft(Object.fromEntries(data.items.map((item) => [item.key, item.defaultValue])))}>Dùng mặc định</Button>
              <Button icon={<UndoOutlined />} disabled={!changes.length || saving} onClick={undo}>Hoàn tác</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!changes.length || invalid || reason.trim().length < 5 || conflict} onClick={() => void save()}>Lưu thay đổi</Button></div>
          </div>
        </> },
        { key: 'history', label: <span><HistoryOutlined /> Lịch sử thay đổi</span>, children: <SettingsHistoryTable version={data.revision} /> },
      ]} />
    </> : !error && <Empty description="Không tải được cấu hình hệ thống" />}
  </div>;
}
