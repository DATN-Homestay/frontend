import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Drawer, Empty, Grid, Pagination, Result, Select, Skeleton, Space, Tag, Typography } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import SearchBar, { type SearchBarValue } from '../../components/search/SearchBar';
import FilterSidebar from '../../components/search/FilterSidebar';
import SearchResultCard from '../../components/search/SearchResultCard';
import { loadAllHomestays } from '../../services/homestayCache';
import { useFavorites } from '../../contexts/useFavorites';
import type { HomestayItem } from '../../types/customer';
import {
  MEAL_OPTIONS,
  PRICE_BUCKETS,
  PROPERTY_TYPE_LABELS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  SOURCE_LABELS,
  applyFilters,
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
      label: a,
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

  const sidebar = facets && <FilterSidebar facets={facets} criteria={criteria} onChange={update} />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        {/* key theo URL để ô tìm kiếm nạp lại khi bấm Quay lại/Tiến tới */}
        <SearchBar
          key={`${criteria.city}|${criteria.district}|${criteria.checkIn}|${criteria.checkOut}|${criteria.adults}|${criteria.children}|${criteria.rooms}`}
          variant="compact"
          value={criteria}
          onSubmit={onSearch}
        />
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {wide && (
          <div style={{ flex: '0 0 280px', position: 'sticky', top: 16, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
            {sidebar ?? <Skeleton active paragraph={{ rows: 12 }} />}
          </div>
        )}

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {place}: {all ? `${results.length.toLocaleString('vi-VN')} chỗ nghỉ` : 'đang tìm…'}
              </Title>
              <Text type="secondary">
                {criteria.checkIn && criteria.checkOut
                  ? `${fmtDate(criteria.checkIn)} – ${fmtDate(criteria.checkOut)} · ${nights} đêm`
                  : 'Chưa chọn ngày'}
                {criteria.adults !== undefined &&
                  ` · ${criteria.adults + (criteria.children ?? 0)} khách · ${criteria.rooms ?? 1} phòng`}
              </Text>
            </div>
            <Space wrap>
              {!wide && (
                <Button icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>
                  Bộ lọc{chips.length ? ` (${chips.length})` : ''}
                </Button>
              )}
              <Select
                aria-label="Sắp xếp"
                value={criteria.sort}
                onChange={(v: SortKey) => update({ sort: v })}
                options={SORT_OPTIONS}
                style={{ minWidth: 210 }}
                prefix="Sắp xếp:"
              />
            </Space>
          </div>

          {chips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' }}>
              {chips.map((c) => (
                <Tag
                  key={c.key}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    update(c.clear);
                  }}
                  style={{ padding: '2px 8px', fontSize: 13 }}
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
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
              Giá hiển thị là giá phòng thấp nhất mỗi đêm; tình trạng còn phòng theo ngày được kiểm tra khi bạn mở chỗ nghỉ.
            </Text>
          )}

          {!all && !failed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton.Node key={i} active style={{ width: '100%', height: 250 }} />
              ))}
            </div>
          ) : failed ? (
            <Result
              status="warning"
              title="Không tải được danh sách chỗ nghỉ"
              subTitle="Kiểm tra kết nối rồi thử lại."
              extra={<Button onClick={() => window.location.reload()}>Tải lại</Button>}
            />
          ) : results.length === 0 ? (
            <Empty
              description="Không có chỗ nghỉ phù hợp với bộ lọc hiện tại"
              style={{ padding: '48px 0', background: '#fff', borderRadius: 12 }}
            >
              {chips.length > 0 && (
                <Button type="primary" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              )}
            </Empty>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
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
        </main>
      </div>

      {!wide && (
        <Drawer
          title="Bộ lọc"
          placement="left"
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
