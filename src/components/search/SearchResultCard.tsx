import { Button, Tag } from 'antd';
import { CheckCircleOutlined, CheckOutlined, EnvironmentOutlined, HeartFilled, HeartOutlined, RightOutlined } from '@ant-design/icons';
import type { HomestayItem } from '../../types/customer';
import { getHomestayCoverImage } from '../../utils/imageHelper';
import { PROPERTY_TYPE_LABELS, facilitiesOf, isBookableOnStayAI, minNightlyPrice, propertyTypeOf, ratingLabel } from '../../utils/homestaySearch';

interface Props {
  homestay: HomestayItem;
  nights: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: (coverImage: string) => void;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

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
    <article className="search-result-card">
      <div className="search-card-media">
        <button type="button" className="search-card-photo" onClick={open} aria-label={`Xem ${h.name}`}>
          <img alt={h.name} src={cover} loading="lazy" />
        </button>
        <span className="search-card-type">{PROPERTY_TYPE_LABELS[type] ?? type}</span>
        <button
          type="button"
          className={`search-card-save${isFavorite ? ' is-saved' : ''}`}
          aria-label={isFavorite ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
          aria-pressed={isFavorite}
          title={isFavorite ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
          onClick={onToggleFavorite}
        >
          {isFavorite ? <HeartFilled /> : <HeartOutlined />}
        </button>
      </div>

      <div className="search-card-info">
        <span className="search-card-location"><EnvironmentOutlined /> {[h.district, h.city].filter(Boolean).join(', ') || h.address}</span>
        <h3><button type="button" onClick={open}>{h.name}</button></h3>
        {h.address && <p className="search-card-address" title={h.address}>{h.address}</p>}
        <Tag className={`search-card-source${stayai ? ' is-verified' : ''}`} icon={stayai ? <CheckCircleOutlined /> : undefined}>
          {stayai ? 'Đặt ngay trên StayAI' : 'Đặt qua Booking.com'}
        </Tag>
        {facilities.length > 0 && (
          <ul className="search-card-facilities">
            {facilities.map((f) => <li key={f}><CheckOutlined /><span>{f}</span></li>)}
          </ul>
        )}
      </div>

      <div className="search-card-offer">
        <div className="search-card-rating">
          <div>
            <strong>{ratingLabel(rating)}</strong>
            <span>{reviews > 0 ? `${reviews.toLocaleString('vi-VN')} đánh giá` : 'Chưa có đánh giá'}</span>
          </div>
          {rating > 0 && <span className="search-card-score" aria-label={`Điểm ${rating.toFixed(1)} trên 5`}>{rating.toFixed(1)}</span>}
        </div>
        <div className="search-card-booking">
          {price !== null ? (
            <div className="search-card-price">
              <span>Mỗi đêm từ</span>
              <strong>{vnd(price)}</strong>
              {nights > 0 && <span>{nights} đêm: khoảng {vnd(price * nights)}</span>}
            </div>
          ) : <span className="search-card-price-unavailable">Xem giá trong trang chi tiết</span>}
          <Button type="primary" onClick={open} aria-label={`Xem chỗ trống tại ${h.name}`}>Xem chỗ trống <RightOutlined /></Button>
        </div>
      </div>
    </article>
  );
}
