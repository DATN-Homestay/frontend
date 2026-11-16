import { useState } from 'react';
import { Alert, Button, Pagination } from 'antd';
import { ArrowRightOutlined, ArrowUpOutlined, CompassOutlined, SafetyCertificateOutlined, SlidersOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import SearchBar, { type SearchBarValue } from '../../components/search/SearchBar';
import StayCard from '../../components/StayCard';
import HomestayRecommendations from '../../features/recommendations/HomestayRecommendations';
import { useTrackHomestaySearch } from '../../features/recommendations/useTrackHomestaySearch';
import { useFavorites } from '../../contexts/useFavorites';
import { useHomestayCatalog } from './useHomestayCatalog';
import { POPULAR_DESTINATIONS } from '../../data/vietnamLocations';
import './Home.css';

export default function HomePage() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const trackSearch = useTrackHomestaySearch();
  const [search, setSearch] = useState<SearchBarValue>({});
  const [searchVersion, setSearchVersion] = useState(0);
  const [criteria, setCriteria] = useState<{ city?: string; district?: string; guests?: number; rooms?: number }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [revision, setRevision] = useState(0);
  const { items: homestays, total, allTotal, loading, error } = useHomestayCatalog(criteria.city, page, pageSize, criteria, revision);

  const applySearch = (value: SearchBarValue) => {
    const clean = (text?: string) => text && !text.startsWith('Tất cả') ? text : undefined;
    const city = clean(value.city);
    const district = clean(value.district);
    const guests = value.adults !== undefined ? value.adults + (value.children ?? 0) : undefined;
    setSearch({ ...value, city, district });
    setCriteria({ city, district, guests, rooms: guests ? value.rooms : undefined });
    setPage(1);
    setRevision((current) => current + 1);
    void trackSearch({ city, district, guests, rooms: guests ? value.rooms : undefined });
  };
  const chooseCity = (city?: string) => {
    applySearch({ ...search, city, district: undefined });
    setSearchVersion((current) => current + 1);
  };
  const resetSearch = () => {
    applySearch({});
    setSearchVersion((current) => current + 1);
  };
  const dates = new URLSearchParams();
  if (search.checkIn && search.checkOut) {
    dates.set('checkin', search.checkIn);
    dates.set('checkout', search.checkOut);
  }
  const stayQuery = dates.size ? `?${dates.toString()}` : '';
  const hasFilters = !!(criteria.city || criteria.district || criteria.guests || search.checkIn);

  return <div className="home-page">
    <section className="home-hero" aria-label="Khám phá StayAI">
      <div className="home-hero-copy">
        <span className="eyebrow">STAY SOMEWHERE, FEEL SOMETHING</span>
        <h1>Một nơi ở.<br />Ngàn trải nghiệm<br /><em>của riêng bạn.</em></h1>
        <p>Rời xa nhịp sống thường ngày. Tìm một góc nhỏ thật vừa ý, và để những kỷ niệm bắt đầu.</p>
        <div className="home-hero-footnote"><span /> Đi theo cảm hứng. Ở theo cách của bạn.</div>
      </div>
      <div className="home-hero-photo">
        <img src="/images/retreat.jpg" alt="Không gian nghỉ dưỡng yên bình bên hồ bơi" fetchPriority="high" />
        <div className="home-photo-top"><span>THE ART OF GETTING AWAY</span><small>01 / 03</small></div>
        <div className="home-photo-caption"><span>Chậm lại một chút.<br />Tận hưởng nhiều hơn.</span><Link to="/search" aria-label="Khám phá tất cả chỗ nghỉ"><ArrowUpOutlined rotate={45} /></Link></div>
      </div>
    </section>

    <div className="home-search-wrap"><SearchBar key={searchVersion} value={search} onSubmit={applySearch} /></div>
    <section className="home-benefits" aria-label="Trải nghiệm cùng StayAI">
      <div className="home-benefit"><CompassOutlined /><div><strong>Nhiều nơi ở, nhiều cảm hứng</strong><p>Từ căn nhà nhỏ đến không gian nghỉ dưỡng.</p></div></div>
      <div className="home-benefit"><SafetyCertificateOutlined /><div><strong>Rõ ràng để an tâm</strong><p>Thông tin chỗ nghỉ và thanh toán minh bạch.</p></div></div>
      <div className="home-benefit"><ThunderboltOutlined /><div><strong>Tìm nơi dành cho bạn</strong><p>Gợi ý theo sở thích, đặt phòng thuận tiện.</p></div></div>
    </section>

    <section className="home-destination-bar" aria-label="Điểm đến phổ biến">
      <span>Bạn muốn đến đâu?</span>
      <div className="home-destination-chips">
        <Button type={!criteria.city ? 'primary' : 'default'} onClick={() => chooseCity()}>Tất cả ({allTotal})</Button>
        {POPULAR_DESTINATIONS.slice(0, 7).map((city) => <Button key={city} type={criteria.city === city ? 'primary' : 'default'} onClick={() => chooseCity(city)}>{city}</Button>)}
      </div>
    </section>

    <HomestayRecommendations />

    <section id="all-homestays-section" className="home-catalog" aria-label="Danh sách chỗ nghỉ">
      <div className="section-heading"><div><span className="eyebrow">FIND YOUR NEXT STAY</span>
        <h2>{criteria.city ? `Một nơi thuộc về ${criteria.city}` : 'Tất cả chỗ nghỉ trên toàn quốc'}</h2>
        <p>Tìm thấy <strong>{total.toLocaleString('vi-VN')}</strong> chỗ nghỉ{criteria.guests ? ` cho ${criteria.guests} khách` : ''}. Chọn một nơi để bắt đầu hành trình.</p>
      </div><div>{hasFilters ? <Button type="text" onClick={resetSearch}>Xóa bộ lọc <ArrowRightOutlined /></Button>
        : <Link className="section-link" to="/search"><SlidersOutlined /> Tìm kiếm & lọc nâng cao <ArrowRightOutlined /></Link>}</div></div>
      {error ? <Alert type="error" showIcon title="Chưa tải được danh sách" description={error} action={<Button onClick={() => setRevision((current) => current + 1)}>Thử lại danh sách</Button>} />
        : loading ? <div className="home-loading" aria-label="Đang tải chỗ nghỉ">{Array.from({ length: 8 }, (_, i) => <div className="home-loading-card" key={i} />)}</div>
        : total === 0 ? <div className="home-empty"><CompassOutlined style={{ fontSize: 30, color: '#9aaa88' }} /><h3>Chưa tìm thấy chỗ nghỉ phù hợp</h3><p>Thử thay đổi điểm đến hoặc bộ lọc để khám phá nhiều lựa chọn hơn.</p><Button onClick={resetSearch}>Hiển thị tất cả ({allTotal} căn)</Button></div>
        : <div className="home-catalog-grid">{homestays.map((homestay, index) => <StayCard key={homestay.id} homestay={homestay} index={index} query={stayQuery}
          favorite={isFavorite(homestay.id)} onFavorite={() => void toggleFavorite(homestay.id)} />)}</div>}
      {total > pageSize && <div className="home-pagination"><Pagination current={page} pageSize={pageSize} total={total} pageSizeOptions={['12', '24', '48']} showSizeChanger
        onChange={(next, size) => { setPage(size !== pageSize ? 1 : next); setPageSize(size); document.getElementById('all-homestays-section')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }} /></div>}
    </section>

    <section className="home-collections" aria-label="Cảm hứng du lịch"><div className="section-heading"><div><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Mỗi chuyến đi, một sắc thái.</h2><p>Đôi khi, một chút cảm hứng là tất cả những gì bạn cần.</p></div><Link className="section-link" to="/search">Khám phá thêm <ArrowRightOutlined /></Link></div>
      <div className="home-collection-grid">
        <Link className="home-collection" to="/search?city=Đà%20Lạt"><img src="/images/nature.jpg" alt="Cảm hứng nghỉ giữa thiên nhiên xanh" loading="lazy" /><div><span><small>INTO THE GREEN</small><strong>Về với thiên nhiên</strong></span><ArrowUpOutlined rotate={45} /></div></Link>
        <Link className="home-collection" to="/search?city=Nha%20Trang"><img src="/images/coast.jpg" alt="Cảm hứng cho kỳ nghỉ bên bờ biển" loading="lazy" /><div><span><small>BY THE SEA</small><strong>Để biển vỗ về</strong></span><ArrowUpOutlined rotate={45} /></div></Link>
        <Link className="home-collection" to="/search"><img src="/images/retreat.jpg" alt="Cảm hứng cho một cuối tuần thư giãn" loading="lazy" /><div><span><small>TAKE IT SLOW</small><strong>Ở chậm một chút</strong></span><ArrowUpOutlined rotate={45} /></div></Link>
      </div>
    </section>
    <section className="home-host-banner"><div><span className="eyebrow">A HOME WORTH SHARING</span><h2>Không gian của bạn.<br />Câu chuyện của những vị khách.</h2><p>Đưa chỗ nghỉ của bạn đến gần hơn với những người yêu trải nghiệm.</p></div><Button type="primary" href="/auth/register?role=HOST">Trở thành chủ nhà <ArrowRightOutlined /></Button></section>
  </div>;
}
