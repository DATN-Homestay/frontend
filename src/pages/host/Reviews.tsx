import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Empty, Image, Input, Modal, Pagination, Rate, Segmented, Skeleton, Tabs, Tag, Typography } from 'antd';
import { MessageOutlined, StarFilled } from '@ant-design/icons';
import { hostService } from '../../services/hostService';
import type { HostReviewItem, HostReviewList } from '../../types/host';
import { complaintService } from '../../services/complaintService';
import { COMPLAINT_CATEGORY_LABEL, COMPLAINT_STATUS_TAG, type Complaint, type Paginated } from '../../types/customer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ASPECTS: { key: keyof HostReviewItem; label: string }[] = [
  { key: 'cleanliness_rating', label: 'Sạch sẽ' },
  { key: 'service_rating', label: 'Phục vụ' },
  { key: 'location_rating', label: 'Vị trí' },
  { key: 'value_rating', label: 'Đáng giá tiền' },
];

const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

function ReviewCard({ r, onReply }: { r: HostReviewItem; onReply: () => void }) {
  return (
    <Card size="small" style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Text strong>{r.customer_name}</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {r.homestay.name}
            {r.booking_code ? ` · Đơn ${r.booking_code}` : ''} · {fmt(r.created_at)}
          </Text>
        </div>
        <span>
          <Rate disabled value={r.rating_overall} style={{ fontSize: 14, color: '#f59e0b' }} />
          {r.status !== 'APPROVED' && (
            <Tag color="default" style={{ marginLeft: 8 }}>
              Đã ẩn
            </Tag>
          )}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '6px 0', fontSize: 12, color: '#64748b' }}>
        {ASPECTS.map((a) => (
          <span key={a.key}>
            {a.label}: {String(r[a.key])}
            <StarFilled style={{ color: '#f59e0b', marginLeft: 2 }} />
          </span>
        ))}
      </div>
      <Paragraph style={{ margin: '6px 0', whiteSpace: 'pre-line' }}>{r.comment}</Paragraph>
      {r.photos.length > 0 && (
        <Image.PreviewGroup>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {r.photos.map((src) => (
              <Image key={src} src={src} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />
            ))}
          </div>
        </Image.PreviewGroup>
      )}
      {r.host_reply ? (
        <div style={{ background: '#f8fafc', borderLeft: '3px solid #4f46e5', padding: '8px 12px', borderRadius: 6 }}>
          <Text strong style={{ fontSize: 13 }}>Phản hồi của bạn</Text>
          {r.host_replied_at && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
              {fmt(r.host_replied_at)}
            </Text>
          )}
          <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{r.host_reply}</Paragraph>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={onReply}>
            Sửa phản hồi
          </Button>
        </div>
      ) : (
        <Button type="primary" icon={<MessageOutlined />} onClick={onReply}>
          Trả lời
        </Button>
      )}
    </Card>
  );
}

function ReviewsTab() {
  const { message } = App.useApp();
  const [filter, setFilter] = useState<'unreplied' | 'all'>('unreplied');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HostReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<HostReviewItem | null>(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  // Đổi bộ lọc / trang / vừa lưu phản hồi thì tải lại; bỏ kết quả cũ nếu đã đổi tiếp
  useEffect(() => {
    let alive = true;
    hostService
      .getReviews({ status: filter, page, limit: 10 })
      .then((d) => alive && setData(d))
      .catch((err: Error) => alive && message.error(err.message || 'Không tải được đánh giá'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filter, page, reloadKey, message]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const openReply = (r: HostReviewItem) => {
    setReply(r.host_reply ?? '');
    setTarget(r);
  };

  const save = async () => {
    if (!target) return;
    const text = reply.trim();
    if (text.length < 10) {
      message.warning('Phản hồi cần ít nhất 10 ký tự');
      return;
    }
    setSaving(true);
    try {
      await hostService.replyReview(target.id, text);
      message.success('Đã lưu phản hồi');
      setTarget(null);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được phản hồi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Segmented
        value={filter}
        onChange={(v) => {
          setFilter(v as 'unreplied' | 'all');
          setPage(1);
          setLoading(true);
        }}
        options={[
          { value: 'unreplied', label: `Chưa trả lời${data ? ` (${data.unreplied})` : ''}` },
          { value: 'all', label: 'Tất cả' },
        ]}
        style={{ marginBottom: 16 }}
      />
      {loading && !data ? (
        <Skeleton active />
      ) : !data || data.items.length === 0 ? (
        <Empty description={filter === 'unreplied' ? 'Bạn đã trả lời hết đánh giá' : 'Chưa có đánh giá nào'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: loading ? 0.6 : 1 }}>
          {data.items.map((r) => (
            <ReviewCard key={r.id} r={r} onReply={() => openReply(r)} />
          ))}
          {data.meta.total > data.meta.limit && (
            <Pagination
              style={{ alignSelf: 'center' }}
              current={page}
              pageSize={data.meta.limit}
              total={data.meta.total}
              onChange={(p) => {
                setPage(p);
                setLoading(true);
              }}
              showSizeChanger={false}
            />
          )}
        </div>
      )}

      <Modal
        title={target?.host_reply ? 'Sửa phản hồi' : `Trả lời ${target?.customer_name ?? ''}`}
        open={!!target}
        onCancel={() => setTarget(null)}
        onOk={save}
        okText="Lưu phản hồi"
        cancelText="Hủy"
        confirmLoading={saving}
      >
        {target && (
          <Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ fontStyle: 'italic' }}>
            “{target.comment}”
          </Paragraph>
        )}
        <TextArea
          aria-label="Nội dung phản hồi"
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={1000}
          showCount
          placeholder="Cảm ơn khách, giải thích hoặc ghi nhận góp ý… Phản hồi sẽ hiển thị công khai dưới đánh giá."
        />
      </Modal>
    </>
  );
}

/** Khiếu nại của khách về nhà của chủ nhà (chỉ xem; admin xử lý) */
function ComplaintsTab() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Complaint> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    complaintService
      .listForHost({ page, limit: 10 })
      .then((d) => alive && setData(d))
      .catch((err: Error) => alive && message.error(err.message || 'Không tải được khiếu nại'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, message]);

  if (loading && !data) return <Skeleton active />;
  if (!data || data.items.length === 0) return <Empty description="Chưa có khiếu nại nào về chỗ nghỉ của bạn" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: loading ? 0.6 : 1 }}>
      <Text type="secondary">
        Khiếu nại đang mở sẽ tạm giữ khoản giải ngân của đơn đó cho tới khi StayAI xử lý xong. Bạn có thể nhắn tin cho khách
        để giải quyết.
      </Text>
      {data.items.map((c) => (
        <Card key={c.id} size="small" style={{ borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <Tag color={COMPLAINT_STATUS_TAG[c.status].color}>{COMPLAINT_STATUS_TAG[c.status].text}</Tag>
              <Text strong>{c.title}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {c.homestay.name} · Đơn {c.booking_code} · {fmt(c.created_at)}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {COMPLAINT_CATEGORY_LABEL[c.category]}
          </Text>
          <Paragraph style={{ margin: '6px 0', whiteSpace: 'pre-line' }}>{c.description}</Paragraph>
          {c.attachments.length > 0 && (
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {c.attachments.map((src) => (
                  <Image key={src} src={src} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />
                ))}
              </div>
            </Image.PreviewGroup>
          )}
          {c.resolution_note && (
            <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6, fontSize: 13 }}>
              <strong>Kết quả xử lý:</strong> {c.resolution_note}
            </div>
          )}
        </Card>
      ))}
      {data.meta.total > data.meta.limit && (
        <Pagination
          style={{ alignSelf: 'center' }}
          current={page}
          pageSize={data.meta.limit}
          total={data.meta.total}
          onChange={(p) => {
            setPage(p);
            setLoading(true);
          }}
          showSizeChanger={false}
        />
      )}
    </div>
  );
}

export default function HostReviewsPage() {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Đánh giá & Khiếu nại
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Trả lời đánh giá giúp khách sau tin tưởng hơn. Phản hồi hiển thị công khai trên trang homestay.
      </Text>
      <Tabs
        items={[
          {
            key: 'reviews',
            label: 'Đánh giá',
            children: <ReviewsTab />,
          },
          {
            key: 'complaints',
            label: 'Khiếu nại',
            children: <ComplaintsTab />,
          },
        ]}
      />
    </div>
  );
}
