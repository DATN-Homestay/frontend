import { Button, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  HeartFilled,
  HeartOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { HomestayItem } from '../../types/customer';
import { getHomestayCoverImage } from '../../utils/imageHelper';
import {
  PROPERTY_TYPE_LABELS,
  facilitiesOf,
  isBookableOnStayAI,
  minNightlyPrice,
  propertyTypeOf,
  ratingLabel,
} from '../../utils/homestaySearch';

const { Text, Title } = Typography;

interface Props {
  homestay: HomestayItem;
  nights: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: (coverImage: string) => void;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/** Thẻ kết quả dạng ngang: ảnh – thông tin – điểm & giá (bố cục giống trang kết quả Booking.com) */
export default function SearchResultCard({ homestay: h, nights, isFavorite, onToggleFavorite, onOpen }: Props) {
  const cover = getHomestayCoverImage(h);
  const price = minNightlyPrice(h);
  const rating = Number(h.average_rating) || 0;
  const reviews = Number(h.total_reviews) || 0;
  const type = propertyTypeOf(h);
  const facilities = facilitiesOf(h).slice(0, 3);
  const stayai = isBookableOnStayAI(h);
  const open = () => onOpen(cover);

  return (
    <article
      className="search-result-card"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
      }}
    >
      <div
        style={{ position: 'relative', flex: '0 0 240px', maxWidth: '100%', height: 220, borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}
        onClick={open}
      >
        <img alt={h.name} src={cover} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <button
          type="button"
          aria-label={isFavorite ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
          title={isFavorite ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          }}
        >
          {isFavorite ? (
            <HeartFilled style={{ color: '#ef4444', fontSize: 18 }} />
          ) : (
            <HeartOutlined style={{ color: '#334155', fontSize: 18 }} />
          )}
        </button>
      </div>

      <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Title level={4} style={{ margin: 0, color: '#4338ca', cursor: 'pointer' }} onClick={open}>
          {h.name}
        </Title>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <Tag style={{ margin: 0 }}>{PROPERTY_TYPE_LABELS[type] ?? type}</Tag>
          {stayai ? (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
              Đặt ngay trên StayAI
            </Tag>
          ) : (
            <Tag color="blue" style={{ margin: 0 }}>
              Đặt qua Booking.com
            </Tag>
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          <EnvironmentOutlined /> {[h.district, h.city].filter(Boolean).join(', ') || h.address}
        </Text>
        {h.address && (
          <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
            {h.address}
          </Text>
        )}
        {facilities.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {facilities.map((f) => (
              <li key={f} style={{ fontSize: 13, color: '#15803d' }}>
                <CheckOutlined /> {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          flex: '0 0 200px',
          marginLeft: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          textAlign: 'right',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <Text strong style={{ display: 'block', fontSize: 15 }}>
              {ratingLabel(rating)}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {reviews > 0 ? `${reviews.toLocaleString('vi-VN')} đánh giá` : 'Chưa có đánh giá'}
            </Text>
          </div>
          {rating > 0 && (
            <div
              aria-label={`Điểm ${rating.toFixed(1)} trên 5`}
              style={{
                background: '#4338ca',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                minWidth: 40,
                height: 40,
                borderRadius: '8px 8px 8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        <div>
          {price !== null ? (
            <>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                Mỗi đêm từ
              </Text>
              <Text strong style={{ fontSize: 22, color: '#0f172a', display: 'block' }}>
                {vnd(price)}
              </Text>
              {nights > 0 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {nights} đêm: khoảng {vnd(price * nights)}
                </Text>
              )}
            </>
          ) : (
            <Text type="secondary">Xem giá trong trang chi tiết</Text>
          )}
          <Button type="primary" onClick={open} style={{ marginTop: 10, background: '#4f46e5', fontWeight: 600 }}>
            Xem chỗ trống <RightOutlined />
          </Button>
        </div>
      </div>
    </article>
  );
}
