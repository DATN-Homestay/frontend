import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Spin,
  DatePicker,
  Popover,
  Select,
  Pagination,
} from 'antd';
import {
  SearchOutlined,
  StarFilled,
  EnvironmentOutlined,
  CheckCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  MinusOutlined,
  PlusOutlined,
  HomeOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useHomestayCatalog } from './useHomestayCatalog';
import HomestayRecommendations from '../../features/recommendations/HomestayRecommendations';
import { useTrackHomestaySearch } from '../../features/recommendations/useTrackHomestaySearch';
import { useFavorites } from '../../contexts/useFavorites';
import { getHomestayCoverImage } from '../../utils/imageHelper';
import {
  ALL_LOCATIONS_LIST,
  VIETNAM_LOCATIONS,
  POPULAR_DESTINATIONS,
} from '../../data/vietnamLocations';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function HomePage() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const trackSearch = useTrackHomestaySearch();

  // SEARCH FORM STATES (HOÀN TOÀN TỰ DO - KHÔNG BẮT BUỘC CHỌN BẤT KỲ BỘ LỌC NÀO ĐỂ HIỆN TOÀN BỘ HOMESTAY)
  const [searchCity, setSearchCity] = useState<string | undefined>(undefined);
  const [searchDistrict, setSearchDistrict] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // GUESTS & ROOMS SELECTOR STATE (MẶC ĐỊNH KHÔNG LỌC SỨC CHỨA ĐỂ HIỂN THỊ ĐỦ 100% DỮ LIỆU CÀO VỀ)
  const [filterByGuests, setFilterByGuests] = useState<boolean>(false);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);
  const [guestConfig, setGuestConfig] = useState({
    adults: 2,
    children: 0,
    rooms: 1,
  });

  // PHÂN TRANG (PAGINATION) CHỐNG LAG KHI RENDER DANH SÁCH HOMESTAY LỚN
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  const [criteria, setCriteria] = useState<{ city?: string; district?: string; guests?: number; rooms?: number }>({});
  const [revision, setRevision] = useState(0);
  const { items: homestays, total, allTotal, loading, error } = useHomestayCatalog(criteria.city, currentPage, pageSize, criteria, revision);

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(size && size !== pageSize ? 1 : page);
    if (size) setPageSize(size);
    document.getElementById('all-homestays-section')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const applyFilter = (city?: string, district?: string, useGuestFilter = false, totalGuests = 0, rooms = 1) => {
    const clean = (value?: string) => value && !value.startsWith('Tất cả') ? value : undefined;
    setCriteria({ city: clean(city), district: clean(district), guests: useGuestFilter ? totalGuests : undefined, rooms: useGuestFilter ? rooms : undefined });
    setCurrentPage(1);
    setRevision((value) => value + 1);
  };

  const handleSearchSubmit = () => {
    void trackSearch({ city: searchCity, district: searchDistrict,
      guests: filterByGuests ? guestConfig.adults + guestConfig.children : undefined,
      rooms: filterByGuests ? guestConfig.rooms : undefined });
    applyFilter(searchCity, searchDistrict, filterByGuests, guestConfig.adults + guestConfig.children, guestConfig.rooms);
  };

  const handleResetFilters = () => {
    setSearchCity(undefined);
    setSearchDistrict(undefined);
    setFilterByGuests(false);
    setDateRange(null);
    applyFilter(undefined, undefined, false, 0, 1);
  };

  // POPOVER CHỌN SỐ LƯỢNG NGƯỜI & PHÒNG
  const guestPopoverContent = (
    <div style={{ width: 280, padding: '8px 4px' }}>
      {/* Người lớn */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
          Người lớn
        </Text>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            overflow: 'hidden',
            height: 38,
          }}
        >
          <Button
            type="text"
            icon={<MinusOutlined />}
            disabled={guestConfig.adults <= 1}
            onClick={() =>
              setGuestConfig((prev) => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))
            }
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
          <Text strong style={{ width: 32, textAlign: 'center', fontSize: 15 }}>
            {guestConfig.adults}
          </Text>
          <Button
            type="text"
            icon={<PlusOutlined />}
            disabled={guestConfig.adults >= 16}
            onClick={() => setGuestConfig((prev) => ({ ...prev, adults: prev.adults + 1 }))}
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </div>
      </div>

      {/* Trẻ em */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
          Trẻ em
        </Text>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            overflow: 'hidden',
            height: 38,
          }}
        >
          <Button
            type="text"
            icon={<MinusOutlined />}
            disabled={guestConfig.children <= 0}
            onClick={() =>
              setGuestConfig((prev) => ({ ...prev, children: Math.max(0, prev.children - 1) }))
            }
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
          <Text strong style={{ width: 32, textAlign: 'center', fontSize: 15 }}>
            {guestConfig.children}
          </Text>
          <Button
            type="text"
            icon={<PlusOutlined />}
            disabled={guestConfig.children >= 10}
            onClick={() => setGuestConfig((prev) => ({ ...prev, children: prev.children + 1 }))}
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </div>
      </div>

      {/* Phòng */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
          Phòng
        </Text>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            overflow: 'hidden',
            height: 38,
          }}
        >
          <Button
            type="text"
            icon={<MinusOutlined />}
            disabled={guestConfig.rooms <= 1}
            onClick={() =>
              setGuestConfig((prev) => ({ ...prev, rooms: Math.max(1, prev.rooms - 1) }))
            }
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
          <Text strong style={{ width: 32, textAlign: 'center', fontSize: 15 }}>
            {guestConfig.rooms}
          </Text>
          <Button
            type="text"
            icon={<PlusOutlined />}
            disabled={guestConfig.rooms >= 10}
            onClick={() => setGuestConfig((prev) => ({ ...prev, rooms: prev.rooms + 1 }))}
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button
          type="primary"
          style={{ flex: 1, background: '#6366f1', borderRadius: 8, height: 38, fontWeight: 600 }}
          onClick={() => {
            setFilterByGuests(true);
            setGuestPopoverOpen(false);
            applyFilter(
              searchCity,
              searchDistrict,
              true,
              guestConfig.adults + guestConfig.children,
              guestConfig.rooms,
            );
          }}
        >
          Áp dụng lọc
        </Button>
        <Button
          style={{ flex: 1, borderRadius: 8, height: 38 }}
          onClick={() => {
            setFilterByGuests(false);
            setGuestPopoverOpen(false);
            applyFilter(
              searchCity,
              searchDistrict,
              false,
              0,
              1,
            );
          }}
        >
          Xem tất cả
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {/* HERO BANNER VỚI THANH TÌM KIẾM CHUẨN */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          borderRadius: 24,
          padding: '44px 32px 52px',
          color: '#ffffff',
          marginBottom: 36,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Title
            level={1}
            style={{ color: '#ffffff', margin: '0 0 10px', fontWeight: 800, letterSpacing: -1, fontSize: 36 }}
          >
            Tìm homestay hoàn hảo cho kỳ nghỉ của bạn
          </Title>
          <Paragraph style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 32 }}>
            Khám phá toàn bộ {allTotal.toLocaleString('vi-VN')} chỗ nghỉ đã xác thực eKYC chính chủ và bảo vệ thanh toán Escrow 24 giờ
          </Paragraph>

          {/* ======================================================== */}
          {/* SEARCH BAR CHÍNH (ĐỊA ĐIỂM + NGÀY ĐI/VỀ + SỐ KHÁCH/PHÒNG) */}
          {/* ======================================================== */}
          <div
            style={{
              background: '#ffffff',
              padding: '12px 14px',
              borderRadius: 18,
              boxShadow: '0 20px 30px rgba(0,0,0,0.25)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            {/* CỘT 1: TỈNH / THÀNH PHỐ (ĐẦY ĐỦ 63 TỈNH THÀNH + TẤT CẢ) */}
            <div style={{ flex: '1 1 180px', textAlign: 'left', minWidth: 160 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
                TỈNH / THÀNH PHỐ
              </Text>
              <Select
                showSearch
                allowClear
                placeholder="Tất cả điểm đến (Toàn quốc)"
                value={searchCity || undefined}
                onChange={(val) => {
                  const cityVal = val && val !== 'Tất cả điểm đến' ? val : undefined;
                  setSearchCity(cityVal);
                  setSearchDistrict(undefined);
                  applyFilter(
                          cityVal,
                    undefined,
                    filterByGuests,
                    filterByGuests ? guestConfig.adults + guestConfig.children : 0,
                    filterByGuests ? guestConfig.rooms : 1,
                  );
                }}
                filterOption={(input, option) =>
                  ((option?.value as string) || '').toLowerCase().includes(input.toLowerCase())
                }
                suffixIcon={<EnvironmentOutlined style={{ color: '#6366f1' }} />}
                style={{ width: '100%' }}
                variant="borderless"
                options={[
                  {
                    value: 'Tất cả điểm đến',
                    label: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#4f46e5' }}>🌟 Tất cả điểm đến (Toàn quốc)</span>
                        <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', border: 'none' }}>
                          ALL
                        </Tag>
                      </div>
                    ),
                  },
                  ...ALL_LOCATIONS_LIST.map((city) => ({
                    value: city,
                    label: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: POPULAR_DESTINATIONS.includes(city) ? 600 : 400 }}>{city}</span>
                        {POPULAR_DESTINATIONS.includes(city) && (
                          <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', border: 'none' }}>
                            HOT
                          </Tag>
                        )}
                      </div>
                    ),
                  })),
                ]}
              />
            </div>

            <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />

            {/* CỘT 2: QUẬN / HUYỆN */}
            <div style={{ flex: '1 1 180px', textAlign: 'left', minWidth: 160 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
                QUẬN / HUYỆN / KHU VỰC
              </Text>
              <Select
                showSearch
                allowClear
                placeholder="Tất cả quận/huyện"
                value={searchDistrict || undefined}
                onChange={(val) => {
                  const distVal = val && val !== 'Tất cả quận/huyện' ? val : undefined;
                  setSearchDistrict(distVal);
                  applyFilter(
                          searchCity,
                    distVal,
                    filterByGuests,
                    filterByGuests ? guestConfig.adults + guestConfig.children : 0,
                    filterByGuests ? guestConfig.rooms : 1,
                  );
                }}
                filterOption={(input, option) =>
                  ((option?.value as string) || '').toLowerCase().includes(input.toLowerCase())
                }
                suffixIcon={<HomeOutlined style={{ color: '#6366f1' }} />}
                style={{ width: '100%' }}
                variant="borderless"
                options={[
                  { value: 'Tất cả quận/huyện', label: 'Tất cả quận/huyện' },
                  ...((searchCity && searchCity !== 'Tất cả điểm đến' && VIETNAM_LOCATIONS[searchCity]) || [])
                    .filter((w) => w !== 'Tất cả quận/huyện')
                    .map((district) => ({
                      value: district,
                      label: <span>{district}</span>,
                    })),
                ]}
              />
            </div>

            <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />

            {/* CỘT 3: NGÀY ĐI - NGÀY VỀ */}
            <div style={{ flex: '1.4 1 230px', textAlign: 'left', minWidth: 220 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
                NGÀY NHẬN - TRẢ PHÒNG
              </Text>
              <RangePicker
                allowClear
                placeholder={['Ngày đi', 'Ngày về']}
                format="DD/MM/YYYY"
                style={{ width: '100%', border: 'none' }}
                suffixIcon={<CalendarOutlined style={{ color: '#6366f1' }} />}
                onChange={(_, dateStrings) => {
                  if (dateStrings && dateStrings[0] && dateStrings[1]) {
                    setDateRange([dateStrings[0], dateStrings[1]]);
                  } else {
                    setDateRange(null);
                  }
                }}
              />
            </div>

            <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />

            {/* CỘT 4: SỐ LƯỢNG NGƯỜI & PHÒNG */}
            <div style={{ flex: '1.4 1 220px', textAlign: 'left', minWidth: 200 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
                KHÁCH & PHÒNG
              </Text>
              <Popover
                content={guestPopoverContent}
                trigger="click"
                open={guestPopoverOpen}
                onOpenChange={setGuestPopoverOpen}
                placement="bottomRight"
              >
                <div
                  style={{
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                  }}
                >
                  <UserOutlined style={{ color: '#6366f1' }} />
                  <Text strong style={{ color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {filterByGuests
                      ? `${guestConfig.adults} người lớn · ${guestConfig.children} trẻ em · ${guestConfig.rooms} phòng`
                      : 'Tất cả khách & phòng (Bất kỳ)'}
                  </Text>
                  {!filterByGuests && (
                    <Tag color="default" style={{ fontSize: 10, margin: 0, padding: '0 4px', border: 'none', background: '#f1f5f9' }}>
                      Toàn bộ
                    </Tag>
                  )}
                </div>
              </Popover>
            </div>

            {/* CÁC NÚT HÀNH ĐỘNG */}
            <Space size={8}>
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleSearchSubmit}
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  padding: '0 24px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                  flexShrink: 0,
                }}
              >
                Tìm kiếm
              </Button>
              <Button
                size="large"
                onClick={handleResetFilters}
                style={{
                  height: 48,
                  borderRadius: 12,
                  padding: '0 16px',
                  fontWeight: 600,
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  flexShrink: 0,
                }}
              >
                Xem tất cả ({allTotal})
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* QUICK DESTINATIONS CHIPS */}
      <div style={{ marginBottom: 32, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text strong style={{ color: '#64748b', marginRight: 4 }}>
          Điểm đến nổi bật:
        </Text>
        <Button
          type={!searchCity || searchCity === 'Tất cả điểm đến' ? 'primary' : 'default'}
          shape="round"
          onClick={() => {
            setSearchCity(undefined);
            setSearchDistrict(undefined);
            applyFilter(
              undefined,
              undefined,
              filterByGuests,
              filterByGuests ? guestConfig.adults + guestConfig.children : 0,
              filterByGuests ? guestConfig.rooms : 1,
            );
          }}
          style={{
            background: !searchCity || searchCity === 'Tất cả điểm đến' ? '#6366f1' : '#ffffff',
            borderColor: !searchCity || searchCity === 'Tất cả điểm đến' ? '#6366f1' : '#cbd5e1',
            fontWeight: 600,
          }}
        >
          🌟 Tất cả ({allTotal})
        </Button>
        {POPULAR_DESTINATIONS.map((c) => (
          <Button
            key={c}
            type={searchCity === c ? 'primary' : 'default'}
            shape="round"
            onClick={() => {
              const nextCity = searchCity === c ? undefined : c;
              if (nextCity) void trackSearch({ city: nextCity,
                guests: filterByGuests ? guestConfig.adults + guestConfig.children : undefined,
                rooms: filterByGuests ? guestConfig.rooms : undefined });
              setSearchCity(nextCity);
              setSearchDistrict(undefined);
              applyFilter(
                  nextCity,
                undefined,
                filterByGuests,
                filterByGuests ? guestConfig.adults + guestConfig.children : 0,
                filterByGuests ? guestConfig.rooms : 1,
              );
            }}
            style={{
              background: searchCity === c ? '#6366f1' : '#ffffff',
              borderColor: searchCity === c ? '#6366f1' : '#cbd5e1',
              fontWeight: 500,
            }}
          >
            {c}
          </Button>
        ))}
      </div>

      <HomestayRecommendations />

      <div id="all-homestays-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            {!searchCity || searchCity === 'Tất cả điểm đến'
              ? 'Tất cả chỗ nghỉ trên toàn quốc'
              : `Tất cả chỗ nghỉ tại ${searchCity} ${searchDistrict && searchDistrict !== 'Tất cả quận/huyện' ? `• ${searchDistrict}` : ''}`}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Tìm thấy <strong>{total}</strong> chỗ nghỉ
            {filterByGuests
              ? ` phù hợp cho ${guestConfig.adults + guestConfig.children} khách (${guestConfig.rooms} phòng)`
              : ''}
            {dateRange ? ` • ${dateRange[0]} đến ${dateRange[1]}` : ''}
          </Text>
        </div>
        <Space>
          {(searchCity || searchDistrict || filterByGuests || dateRange) && (
            <Button
              type="link"
              onClick={handleResetFilters}
              style={{ color: '#6366f1', fontWeight: 600, padding: 0 }}
            >
              Hiển thị tất cả ({allTotal} căn)
            </Button>
          )}
        </Space>
      </div>

      {/* HOMESTAYS GRID */}
      {error ? (
        <Alert type="error" showIcon title="Chưa tải được danh sách" description={error}
          action={<Button onClick={() => setRevision((value) => value + 1)}>Thử lại danh sách</Button>} />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Đang tải danh sách homestay...</div>
        </div>
      ) : total === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#ffffff',
            borderRadius: 16,
            border: '1px dashed #cbd5e1',
          }}
        >
          <Title level={4} style={{ color: '#64748b' }}>
            Không tìm thấy homestay phù hợp với tiêu chí của bạn
          </Title>
          <Paragraph type="secondary">
            Thử thay đổi khu vực quận/huyện hoặc bấm nút bên dưới để xem toàn bộ homestays.
          </Paragraph>
          <Button
            type="primary"
            onClick={handleResetFilters}
            style={{ borderRadius: 8, background: '#6366f1' }}
          >
            Hiển thị tất cả ({allTotal} căn)
          </Button>
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {homestays.map((h, index) => {
              const firstRoom = h.rooms?.[0];
              const coverImage = getHomestayCoverImage(h);
              const price = Number(firstRoom?.base_price) || 600000;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={h.id}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/homestay/${h.id}`, { state: { coverImage } })}
                    cover={
                      <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleFavorite(h.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 12,
                            zIndex: 2,
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                            transition: 'all 0.15s ease-in-out',
                          }}
                          title={isFavorite(h.id) ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
                        >
                          {isFavorite(h.id) ? (
                            <HeartFilled style={{ color: '#ef4444', fontSize: 18 }} />
                          ) : (
                            <HeartOutlined style={{ color: '#64748b', fontSize: 18 }} />
                          )}
                        </button>
                        <img
                          alt={h.name}
                          loading={index < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          src={coverImage}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      {h.is_claimed === 1 ? (
                        <Tag
                          color="success"
                          icon={<CheckCircleOutlined />}
                          style={{ position: 'absolute', top: 12, left: 12, fontWeight: 600 }}
                        >
                          Chính chủ eKYC
                        </Tag>
                      ) : (
                        <Tag
                          color="blue"
                          style={{ position: 'absolute', top: 12, left: 12, fontWeight: 600 }}
                        >
                          Booking.com
                        </Tag>
                      )}
                      {h.rooms && h.rooms.length > 0 && (
                        <Tag
                          color="default"
                          style={{
                            position: 'absolute',
                            bottom: 10,
                            left: 12,
                            fontWeight: 600,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            border: 'none',
                          }}
                        >
                          {h.rooms.length} loại phòng
                        </Tag>
                      )}
                    </div>
                  }
                  style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}
                  styles={{ body: { padding: '16px' } }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}
                  >
                    <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                      {h.name}
                    </Text>
                    <Space size={4}>
                      <StarFilled style={{ color: '#f59e0b' }} />
                      <Text strong>
                        {Number(h.average_rating) > 0 ? Number(h.average_rating).toFixed(1) : 'Mới'}
                      </Text>
                    </Space>
                  </div>

                  <Text
                    type="secondary"
                    style={{ fontSize: 13, display: 'block', marginBottom: 8 }}
                  >
                    <EnvironmentOutlined /> {h.city} {h.district ? `(${h.district})` : ''} • {h.address}
                  </Text>

                  {h.source_url && (
                    <div style={{ marginBottom: 10 }}>
                      <a
                        href={h.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: 11,
                          color: '#2563eb',
                          background: '#eff6ff',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #bfdbfe',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        🌐 Xem trên Booking.com
                      </a>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginTop: 4,
                    }}
                  >
                    <div>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>Từ </Text>
                      <Text strong style={{ fontSize: 18, color: '#6366f1' }}>
                        {price.toLocaleString('vi-VN')}đ
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}> /đêm</Text>
                    </div>
                    <Tag color="purple">Escrow 24h</Tag>
                  </div>
                </Card>
              </Col>
            );
          })}
          </Row>

          {/* THANH PHÂN TRANG CHỐNG LAG */}
          {total > pageSize && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 40,
                padding: '16px 24px',
                background: '#ffffff',
                borderRadius: 14,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                border: '1px solid #e2e8f0',
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                pageSizeOptions={['12', '24', '48']}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => (
                  <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>
                    Hiển thị <strong>{range[0]}-{range[1]}</strong> trên tổng số <strong>{total}</strong> homestay
                  </Text>
                )}
                onChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
