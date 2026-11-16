import { ArrowUpOutlined, CheckOutlined, EnvironmentOutlined, HeartFilled, HeartOutlined, StarFilled } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { HomestayItem } from '../types/customer';
import { getHomestayCoverImage } from '../utils/imageHelper';
import { minNightlyPrice } from '../utils/homestaySearch';

export default function StayCard({ homestay: h, index = 0, favorite, onFavorite, query = '' }: {
  homestay: HomestayItem; index?: number; favorite: boolean; onFavorite: () => void; query?: string;
}) {
  const coverImage = getHomestayCoverImage(h);
  const price = minNightlyPrice(h);
  const rating = Number(h.average_rating);
  return <article className="stay-card">
    <div className="stay-card-media">
      <Link to={`/homestay/${h.id}${query}`} state={{ coverImage }} aria-label={`Xem ${h.name}`}>
        <img src={coverImage} alt={h.name} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
      </Link>
      <span className={`stay-card-source${h.is_claimed === 1 ? ' is-verified' : ''}`}>
        {h.is_claimed === 1 ? <><CheckOutlined /> Chính chủ</> : 'Booking.com'}
      </span>
      <button className={`stay-card-save${favorite ? ' is-saved' : ''}`} type="button" aria-pressed={favorite}
        aria-label={`${favorite ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}: ${h.name}`}
        onClick={onFavorite}>{favorite ? <HeartFilled /> : <HeartOutlined />}</button>
    </div>
    <div className="stay-card-copy">
      <div className="stay-card-location"><span><EnvironmentOutlined /> {[h.district, h.city].filter(Boolean).join(', ') || 'Việt Nam'}</span>
        <span className="stay-card-rating"><StarFilled /> {rating > 0 ? rating.toFixed(1) : 'Mới'}</span>
      </div>
      <h3><Link to={`/homestay/${h.id}${query}`} state={{ coverImage }}>{h.name}</Link></h3>
      <p className="stay-card-description">{(h.rooms?.length ?? 0) > 0 ? `${h.rooms!.length} loại phòng` : 'Khám phá không gian lưu trú'}{h.rooms?.[0]?.capacity ? ` · Từ ${h.rooms[0].capacity} khách` : ''}</p>
      <div className="stay-card-bottom"><div>{price ? <><span>Từ </span><strong>{price.toLocaleString('vi-VN')}<small>đ</small></strong><span> / đêm</span></> : <span>Xem giá & tình trạng phòng</span>}</div>
        <Link to={`/homestay/${h.id}${query}`} state={{ coverImage }} className="stay-card-open" aria-label={`Chi tiết ${h.name}`}><ArrowUpOutlined rotate={45} /></Link>
      </div>
    </div>
  </article>;
}
