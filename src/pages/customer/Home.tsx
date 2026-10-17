import { useState, useEffect } from 'react';
import {
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
} from 'antd';
import {
  SearchOutlined,
  StarFilled,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  UserOutlined,
  CalendarOutlined,
  MinusOutlined,
  PlusOutlined,
  HomeOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { HomestayItem } from '../../types/customer';
import {
  ALL_LOCATIONS_LIST,
  VIETNAM_LOCATIONS,
  POPULAR_DESTINATIONS,
} from '../../data/vietnamLocations';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allHomestays, setAllHomestays] = useState<HomestayItem[]>([]);
  const [filteredHomestays, setFilteredHomestays] = useState<HomestayItem[]>([]);

  // SEARCH FORM STATES (CLEAN STANDARD SEARCH)
  const [searchCity, setSearchCity] = useState<string>('Đà Lạt');
  const [searchDistrict, setSearchDistrict] = useState<string>('Tất cả quận/huyện');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // GUESTS & ROOMS SELECTOR STATE (POPOVER)
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);
  const [guestConfig, setGuestConfig] = useState({
    adults: 2,
    children: 0,
    rooms: 1,
  });

  useEffect(() => {
    loadHomestays();
  }, []);

  const loadHomestays = async () => {
    setLoading(true);
    try {
      const res = await customerService.getHomestays();
      const items = res.items || [];
      setAllHomestays(items);
      applyFilter(items, searchCity, searchDistrict, guestConfig.adults + guestConfig.children);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (
    list: HomestayItem[],
    city: string,
    district: string,
    totalGuests: number,
  ) => {
    let result = [...list];

    // Filter by city (clean string matching with popular destination aliases)
    if (city && city !== 'Tất cả') {
      const cityLower = city.toLowerCase();
      const aliases: Record<string, string[]> = {
        'lâm đồng': ['đà lạt', 'lâm đồng', 'bảo lộc'],
        'khánh hòa': ['nha trang', 'cam ranh', 'khánh hòa'],
        'kiên giang': ['phú quốc', 'rạch giá', 'kiên giang'],
        'lào cai': ['sa pa', 'sapa', 'lào cai'],
        'quảng ninh': ['hạ long', 'bãi cháy', 'quảng ninh'],
        'bình thuận': ['phan thiết', 'mũi né', 'bình thuận'],
        'bà rịa - vũng tàu': ['vũng tàu', 'hồ tràm', 'bà rịa'],
        'quảng nam': ['hội an', 'quảng nam'],
      };
      const validNames = aliases[cityLower] || [cityLower];

      result = result.filter((h) => {
        const hCity = (h.city || '').toLowerCase();
        return validNames.some((v) => hCity.includes(v) || v.includes(hCity));
      });
    }

    // Filter by district (clean string matching)
    if (district && district !== 'Tất cả quận/huyện') {
      const matchKw = district.replace(/quận|huyện|thành phố|thị xã|phường|xã/gi, '').trim().toLowerCase();
      result = result.filter(
        (h) =>
          (h.district && (h.district.toLowerCase().includes(matchKw) || matchKw.includes(h.district.toLowerCase()))) ||
          (h.address && h.address.toLowerCase().includes(matchKw)),
      );
    }

    // Filter by capacity
    if (totalGuests > 0) {
      result = result.filter((h) => {
        if (!h.rooms || h.rooms.length === 0) return true;
        return h.rooms.some((r) => r.capacity >= totalGuests);
      });
    }

    setFilteredHomestays(result);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      applyFilter(allHomestays, searchCity, searchDistrict, guestConfig.adults + guestConfig.children);
      setLoading(false);
    }, 250);
  };

  // INVISIBLE RAG RECOMMENDATION: TỰ ĐỘNG PHÂN TÍCH HÀNH VI ĐẨY HOMESTAY PHÙ HỢP NHẤT LÊN TOP
  // Tiêu chí: eKYC chính chủ 4 lớp, rating >= 4.8, tiện nghi BBQ/View/Không gian yên tĩnh
  const aiRecommendedHomestays = filteredHomestays.filter(
    (h) => h.is_claimed === 1 && Number(h.average_rating) >= 4.8,
  );

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

      <Button
        type="primary"
        block
        onClick={() => setGuestPopoverOpen(false)}
        style={{
          borderRadius: 8,
          height: 38,
          background: '#6366f1',
          fontWeight: 600,
        }}
      >
        Xong
      </Button>
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
            Hơn 1.000+ chỗ nghỉ đã xác thực eKYC chính chủ và bảo vệ thanh toán Escrow 24 giờ
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
            {/* CỘT 1: TỈNH / THÀNH PHỐ (ĐẦY ĐỦ 63 TỈNH THÀNH) */}
            <div style={{ flex: '1 1 180px', textAlign: 'left', minWidth: 160 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
                TỈNH / THÀNH PHỐ
              </Text>
              <Select
                showSearch
                value={searchCity}
                onChange={(val) => {
                  setSearchCity(val);
                  setSearchDistrict('Tất cả quận/huyện');
                }}
                filterOption={(input, option) =>
                  ((option?.value as string) || '').toLowerCase().includes(input.toLowerCase())
                }
                suffixIcon={<EnvironmentOutlined style={{ color: '#6366f1' }} />}
                style={{ width: '100%' }}
                variant="borderless"
                options={ALL_LOCATIONS_LIST.map((city) => ({
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
                }))}
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
                value={searchDistrict}
                onChange={(val) => setSearchDistrict(val)}
                filterOption={(input, option) =>
                  ((option?.value as string) || '').toLowerCase().includes(input.toLowerCase())
                }
                suffixIcon={<HomeOutlined style={{ color: '#6366f1' }} />}
                style={{ width: '100%' }}
                variant="borderless"
                options={(VIETNAM_LOCATIONS[searchCity] || ['Tất cả quận/huyện']).map((district) => ({
                  value: district,
                  label: <span>{district}</span>,
                }))}
              />
            </div>

            <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />

            {/* CỘT 3: NGÀY ĐI - NGÀY VỀ */}
            <div style={{ flex: '1.4 1 230px', textAlign: 'left', minWidth: 220 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
                NGÀY NHẬN - TRẢ PHÒNG
              </Text>
              <RangePicker
                placeholder={['Ngày đi', 'Ngày về']}
                format="DD/MM/YYYY"
                style={{ width: '100%', border: 'none' }}
                suffixIcon={<CalendarOutlined style={{ color: '#6366f1' }} />}
                onChange={(_, dateStrings) => setDateRange([dateStrings[0], dateStrings[1]])}
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
                    {guestConfig.adults} người lớn · {guestConfig.children} trẻ em · {guestConfig.rooms} phòng
                  </Text>
                </div>
              </Popover>
            </div>

            {/* NÚT TÌM KIẾM */}
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleSearchSubmit}
              style={{
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                padding: '0 28px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                flexShrink: 0,
              }}
            >
              Tìm kiếm
            </Button>
          </div>
        </div>
      </div>

      {/* QUICK DESTINATIONS CHIPS */}
      <div style={{ marginBottom: 32, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text strong style={{ color: '#64748b', marginRight: 4 }}>
          Điểm đến nổi bật:
        </Text>
        {POPULAR_DESTINATIONS.map((c) => (
          <Button
            key={c}
            type={searchCity === c ? 'primary' : 'default'}
            shape="round"
            onClick={() => {
              setSearchCity(c);
              setSearchDistrict('Tất cả quận/huyện');
              applyFilter(allHomestays, c, 'Tất cả quận/huyện', guestConfig.adults + guestConfig.children);
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

      {/* ======================================================== */}
      {/* PHẦN 1: GỢI Ý THÔNG MINH DỰA TRÊN HÀNH VI (INVISIBLE RAG) */}
      {/* ĐƯỢC ƯU TIÊN ĐẨY LÊN TOP ĐẦU TRANG CHỦ */}
      {/* ======================================================== */}
      {aiRecommendedHomestays.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f8f7ff 0%, #f1f0fe 100%)',
            border: '1px solid #c7d2fe',
            borderRadius: 20,
            padding: '24px 24px 28px',
            marginBottom: 36,
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <Space size="middle">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 20,
                  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
                }}
              >
                <ThunderboltOutlined />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Title level={3} style={{ margin: 0, color: '#1e1b4b', fontSize: 20 }}>
                    Đề xuất dành riêng cho bạn
                  </Title>
                  <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
                    <FireOutlined /> AI Gợi ý ngầm (Invisible RAG)
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tối ưu dựa trên hành vi tìm kiếm: Ưu tiên view đẹp · Yên tĩnh · Bếp BBQ · eKYC chính chủ 4 lớp
                </Text>
              </div>
            </Space>

            <Tag color="cyan" style={{ padding: '4px 10px', fontSize: 13, borderRadius: 8, border: 'none', background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>
              ✨ Độ tương thích 98%
            </Tag>
          </div>

          {/* Grid các Homestay được AI đẩy lên Top */}
          <Row gutter={[20, 20]}>
            {aiRecommendedHomestays.map((h) => {
              const firstRoom = h.rooms?.[0];
              const coverImage =
                firstRoom?.images?.[0]?.image_url ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';
              const price = firstRoom?.base_price || 600000;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={'top_' + h.id}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/homestay/${h.id}`)}
                    cover={
                      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                        <img
                          alt={h.name}
                          src={coverImage}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <Tag
                          color="purple"
                          style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            fontWeight: 700,
                            borderRadius: 6,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          ⭐ AI Đề xuất Top 1
                        </Tag>
                        {h.is_claimed === 1 && (
                          <Tag
                            color="success"
                            icon={<CheckCircleOutlined />}
                            style={{ position: 'absolute', bottom: 10, left: 12, fontWeight: 600 }}
                          >
                            Chính chủ eKYC
                          </Tag>
                        )}
                      </div>
                    }
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: '2px solid #a5b4fc',
                      background: '#ffffff',
                    }}
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
                        <Text strong style={{ color: '#0f172a' }}>
                          {Number(h.average_rating) > 0 ? Number(h.average_rating).toFixed(1) : 'Mới'}
                        </Text>
                      </Space>
                    </div>

                    <Text
                      type="secondary"
                      style={{ fontSize: 13, display: 'block', marginBottom: 12 }}
                    >
                      <EnvironmentOutlined /> {h.city} {h.district ? `(${h.district})` : ''} • {h.address}
                    </Text>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginTop: 8,
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
        </div>
      )}

      {/* ======================================================== */}
      {/* PHẦN 2: KHÁM PHÁ TẤT CẢ CHỖ NGHỈ TẠI ĐỊA ĐIỂM */}
      {/* ======================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Tất cả chỗ nghỉ tại {searchCity} {searchDistrict !== 'Tất cả quận/huyện' ? `• ${searchDistrict}` : ''}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Tìm thấy <strong>{filteredHomestays.length}</strong> homestay phù hợp cho {guestConfig.adults + guestConfig.children} khách ({guestConfig.rooms} phòng)
            {dateRange ? ` • ${dateRange[0]} đến ${dateRange[1]}` : ''}
          </Text>
        </div>
        <Tag color="purple" style={{ padding: '4px 10px', fontSize: 13 }}>
          Cam kết chuẩn giá • Không phí ẩn
        </Tag>
      </div>

      {/* HOMESTAYS GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Đang tải danh sách homestay...</div>
        </div>
      ) : filteredHomestays.length === 0 ? (
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
            Thử thay đổi khu vực quận/huyện hoặc điều chỉnh số lượng khách để xem thêm kết quả.
          </Paragraph>
          <Button
            type="primary"
            onClick={() => {
              setSearchCity('Đà Lạt');
              setSearchDistrict('Tất cả quận/huyện');
              setGuestConfig({ adults: 2, children: 0, rooms: 1 });
              applyFilter(allHomestays, 'Đà Lạt', 'Tất cả quận/huyện', 2);
            }}
            style={{ borderRadius: 8, background: '#6366f1' }}
          >
            Đặt lại bộ lọc
          </Button>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {filteredHomestays.map((h) => {
            const firstRoom = h.rooms?.[0];
            const coverImage =
              firstRoom?.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';
            const price = firstRoom?.base_price || 600000;

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={h.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/homestay/${h.id}`)}
                  cover={
                    <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}>
                      <img
                        alt={h.name}
                        src={coverImage}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {h.is_claimed === 1 && (
                        <Tag
                          color="success"
                          icon={<CheckCircleOutlined />}
                          style={{ position: 'absolute', top: 12, left: 12, fontWeight: 600 }}
                        >
                          Chính chủ eKYC
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
                    style={{ fontSize: 13, display: 'block', marginBottom: 12 }}
                  >
                    <EnvironmentOutlined /> {h.city} {h.district ? `(${h.district})` : ''} • {h.address}
                  </Text>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginTop: 8,
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
      )}
    </div>
  );
}
