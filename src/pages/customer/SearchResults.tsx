import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Drawer, Empty, Grid, Pagination, Result, Select, Skeleton, Tag, Typography } from 'antd';
import { FilterOutlined, InfoCircleOutlined, RightOutlined } from '@ant-design/icons';
import SearchBar, { type SearchBarValue } from '../../components/search/SearchBar';
import FilterSidebar from '../../components/search/FilterSidebar';
import SearchResultCard from '../../components/search/SearchResultCard';
import { loadAllHomestays } from '../../services/homestayCache';
import { useFavorites } from '../../contexts/useFavorites';
import type { HomestayItem } from '../../types/customer';
import './SearchResults.css';
import {
  MEAL_OPTIONS,
  PRICE_BUCKETS,
  PROPERTY_TYPE_LABELS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  SOURCE_LABELS,
  applyFilters,
  amenityLabel,
  computeFacets,
  isAllPlaces,
  nightsBetween,
  parseCriteria,
  sortHomestays,
  toSearchParams,
  type SearchCriteria,
  type SortKey,
} from '../../utils/homestaySearch';

const { Title, Text } = Typography;
const PAGE_SIZE = 20;

const fmtDate = (d: string) => d.split('-').reverse().join('/');

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = useMemo(() => parseCriteria(searchParams), [searchParams]);
  const screens = Grid.useBreakpoint();
  const wide = screens.lg !== false;
  const { isFavorite, toggleFavorite } = useFavorites();

  const [all, setAll] = useState<HomestayItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAllHomestays()
      .then((items) => {
        if (!alive) return;
        setAll(items);
        setFailed(items.length === 0);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: Partial<SearchCriteria>) => {
    // Đổi bộ lọc thì quay về trang 1; chỉ giữ số trang khi chính nó được đổi
    const next = { ...criteria, page: 1, ...patch };
    setSearchParams(toSearchParams(next));
  };

  const results = useMemo(() => (all ? sortHomestays(applyFilters(all, criteria), criteria.sort) : []), [all, criteria]);
  const facets = useMemo(() => (all ? computeFacets(all, criteria) : null), [all, criteria]);
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);

  const lastPage = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(criteria.page, lastPage);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const place = [criteria.district, isAllPlaces(criteria.city) ? 'Tất cả điểm đến' : criteria.city].filter(Boolean).join(', ');

  const chips: { key: string; label: string; clear: Partial<SearchCriteria> }[] = [
    ...criteria.prices.map((p) => ({
      key: `price-${p}`,
      label: PRICE_BUCKETS.find((b) => b.key === p)?.label ?? p,
      clear: { prices: criteria.prices.filter((x) => x !== p) },
    })),
    ...(criteria.minRating !== undefined
      ? [{
          key: 'rating',
          label: RATING_OPTIONS.find((r) => r.value === criteria.minRating)?.label ?? `Từ ${criteria.minRating}`,
          clear: { minRating: undefined },
        }]
      : []),
    ...criteria.types.map((t) => ({
      key: `type-${t}`,
      label: PROPERTY_TYPE_LABELS[t] ?? t,
      clear: { types: criteria.types.filter((x) => x !== t) },
    })),
    ...criteria.amenities.map((a) => ({
      key: `amenity-${a}`,
      label: amenityLabel(a),
      clear: { amenities: criteria.amenities.filter((x) => x !== a) },
    })),
    ...criteria.meals.map((m) => ({
      key: `meal-${m}`,
      label: MEAL_OPTIONS.find((o) => o.key === m)?.label ?? m,
      clear: { meals: criteria.meals.filter((x) => x !== m) },
    })),
    ...criteria.sources.map((s) => ({
      key: `source-${s}`,
      label: SOURCE_LABELS[s],
      clear: { sources: criteria.sources.filter((x) => x !== s) },
    })),
  ];

  const clearFilters = () =>
    update({ prices: [], minRating: undefined, types: [], amenities: [], meals: [], sources: [] });

  const onSearch = (v: SearchBarValue) => update({ ...v });

  const openHomestay = (h: HomestayItem, coverImage: string) => {
    const qs = new URLSearchParams();
    if (criteria.checkIn && criteria.checkOut) {
      qs.set('checkin', criteria.checkIn);
      qs.set('checkout', criteria.checkOut);
    }
    const q = qs.toString();
    navigate(`/homestay/${h.id}${q ? `?${q}` : ''}`, { state: { coverImage } });
  };

  const sidebar = facets && <FilterSidebar facets={facets} criteria={criteria} onChange={update} onReset={clearFilters} />;

  return (
    <div className="search-page">
      <nav className="search-breadcrumb" aria-label="Đường dẫn trang">
        <Link to="/">Trang chủ</Link><RightOutlined /><span aria-current="page">Tìm chỗ nghỉ</span>
      </nav>

      <section className="search-intro" aria-labelledby="search-title">
        <span className="eyebrow">KHÁM PHÁ CHỖ NGHỈ</span>
        <h1 id="search-title">Tìm một nơi ở, <em>đúng ý bạn.</em></h1>
        <p>Từ căn phòng nhỏ ấm cúng đến biệt thự cho cả gia đình. Chọn nơi phù hợp cho chuyến đi của bạn.</p>
        {/* key theo URL để ô tìm kiếm nạp lại khi bấm Quay lại/Tiến tới */}
        <SearchBar
          key={`${criteria.city}|${criteria.district}|${criteria.checkIn}|${criteria.checkOut}|${criteria.adults}|${criteria.children}|${criteria.rooms}`}
          variant="compact"
          value={criteria}
          onSubmit={onSearch}
        />
      </section>

      <div className="search-layout">
        {wide && (
          <div className="search-sidebar">
            {sidebar ?? <Skeleton active paragraph={{ rows: 12 }} />}
          </div>
        )}

        <section className="search-results" aria-label="Kết quả tìm kiếm" aria-busy={!all && !failed}>
          <div className="search-results-heading">
            <div aria-live="polite" aria-atomic="true">
              <Title level={2} className="search-results-title">
                {place}: {all ? `${results.length.toLocaleString('vi-VN')} chỗ nghỉ` : 'đang tìm…'}
              </Title>
              <Text type="secondary" className="search-trip-summary">
                {criteria.checkIn && criteria.checkOut
                  ? `${fmtDate(criteria.checkIn)} – ${fmtDate(criteria.checkOut)} · ${nights} đêm`
                  : 'Chưa chọn ngày · Khám phá mọi lựa chọn'}
                {criteria.adults !== undefined &&
                  ` · ${criteria.adults + (criteria.children ?? 0)} khách · ${criteria.rooms ?? 1} phòng`}
              </Text>
            </div>
          </div>
          <div className="search-toolbar">
            <span className="search-results-range">
              {all && !failed ? results.length > 0
                ? `Hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, results.length)} trong ${results.length.toLocaleString('vi-VN')} chỗ nghỉ`
                : 'Hãy thử điều chỉnh bộ lọc của bạn'
                : 'Đang tìm chỗ nghỉ cho bạn...'}
            </span>
            <div className="search-toolbar-actions">
              {!wide && (
                <Button className="search-mobile-filter" aria-label={`Bộ lọc${chips.length ? ` (${chips.length})` : ''}`} icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)} disabled={!facets}>
                  Bộ lọc{chips.length ? ` (${chips.length})` : ''}
                </Button>
              )}
              <Select
                aria-label="Sắp xếp"
                value={criteria.sort}
                onChange={(v: SortKey) => update({ sort: v })}
                options={SORT_OPTIONS}
                className="search-sort"
                prefix="Sắp xếp:"
              />
            </div>
          </div>

          {chips.length > 0 && (
            <div className="search-active-filters" aria-label="Bộ lọc đang áp dụng">
              <span className="search-active-label"><FilterOutlined /> Đang chọn:</span>
              {chips.map((c) => (
                <Tag
                  key={c.key}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    update(c.clear);
                  }}
                  className="search-filter-chip"
                >
                  {c.label}
                </Tag>
              ))}
              <Button type="link" size="small" onClick={clearFilters}>
                Xóa tất cả bộ lọc
              </Button>
            </div>
          )}

          {criteria.checkIn && (
            <p className="search-price-note"><InfoCircleOutlined />
              <span>Giá hiển thị là giá phòng thấp nhất mỗi đêm; tình trạng còn phòng theo ngày được kiểm tra khi bạn mở chỗ nghỉ.</span>
            </p>
          )}

          {!all && !failed ? (
            <div className="search-result-list">
              {[0, 1, 2].map((i) => (
                <Skeleton.Node key={i} active style={{ width: '100%', height: 250 }} />
              ))}
            </div>
          ) : failed ? (
            <Result
              className="search-empty-state"
              status="warning"
              title="Không tải được danh sách chỗ nghỉ"
              subTitle="Kiểm tra kết nối rồi thử lại."
              extra={<Button onClick={() => window.location.reload()}>Tải lại</Button>}
            />
          ) : results.length === 0 ? (
            <Empty
              className="search-empty-state"
              description="Không có chỗ nghỉ phù hợp với bộ lọc hiện tại"
            >
              <p className="search-empty-hint">Thử bớt một vài tiêu chí hoặc chọn điểm đến khác để có thêm lựa chọn.</p>
              {chips.length > 0 && (
                <Button type="primary" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              )}
            </Empty>
          ) : (
            <>
              <div className="search-result-list">
                {pageItems.map((h) => (
                  <SearchResultCard
                    key={h.id}
                    homestay={h}
                    nights={nights}
                    isFavorite={isFavorite(h.id)}
                    onToggleFavorite={() => void toggleFavorite(h.id)}
                    onOpen={(cover) => openHomestay(h, cover)}
                  />
                ))}
              </div>
              {results.length > PAGE_SIZE && (
                <div className="search-pagination">
                  <Pagination
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={results.length}
                    showSizeChanger={false}
                    onChange={(p) => update({ page: p })}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {!wide && (
        <Drawer
          title="Bộ lọc"
          className="search-filter-drawer"
          placement="right"
          size="min(390px, 100vw)"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { padding: 0 } }}
          footer={
            <Button type="primary" block onClick={() => setDrawerOpen(false)}>
              Xem {results.length.toLocaleString('vi-VN')} chỗ nghỉ
            </Button>
          }
        >
          {sidebar}
        </Drawer>
      )}
    </div>
  );
}
