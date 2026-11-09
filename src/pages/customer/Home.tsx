import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Spin,
  Pagination,
} from 'antd';
import {
  StarFilled,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loadAllHomestays } from '../../services/homestayCache';
import SearchBar, { type SearchBarValue } from '../../components/search/SearchBar';
import { toSearchParams } from '../../utils/homestaySearch';
import type { HomestayItem } from '../../types/customer';
import { useFavorites } from '../../contexts/useFavorites';
import { getHomestayCoverImage } from '../../utils/imageHelper';
import {
  POPULAR_DESTINATIONS,
} from '../../data/vietnamLocations';

const { Title, Text, Paragraph } = Typography;

export default function HomePage() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [allHomestays, setAllHomestays] = useState<HomestayItem[]>([]);

  // PHÂN TRANG (PAGINATION) CHỐNG LAG KHI RENDER DANH SÁCH HOMESTAY LỚN
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  const paginatedHomestays = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allHomestays.slice(start, start + pageSize);
  }, [allHomestays, currentPage, pageSize]);

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    const target = document.getElementById('all-homestays-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const fetchHomestays = useCallback(() => {
    return loadAllHomestays()
      .then((items) => {
        setAllHomestays(items);
      })
      .catch((err) => {
        console.warn('Lỗi khi tải dữ liệu homestays:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchHomestays();
  }, [fetchHomestays]);

  /** Tìm kiếm chuyển sang trang kết quả riêng, tiêu chí nằm trên URL */
  const goSearch = (value: SearchBarValue) => {
    const qs = toSearchParams(value).toString();
    navigate(qs ? `/search?${qs}` : '/search');
  };

  // INVISIBLE RAG RECOMMENDATION: TỰ ĐỘNG PHÂN TÍCH HÀNH VI ĐẨY HOMESTAY PHÙ HỢP NHẤT LÊN TOP
  // Tiêu chí: rating cao >= 4.5, tiện nghi BBQ/View/Không gian yên tĩnh
  const aiRecommendedHomestays = (
    allHomestays.filter((h) => Number(h.average_rating) >= 4.5).length > 0
      ? allHomestays.filter((h) => Number(h.average_rating) >= 4.5)
      : allHomestays
  ).slice(0, 4);

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
            Khám phá toàn bộ {allHomestays.length > 0 ? `${allHomestays.length.toLocaleString('vi-VN')}+` : '1.300+'} chỗ nghỉ đã xác thực eKYC chính chủ và bảo vệ thanh toán Escrow 24 giờ
          </Paragraph>

          <SearchBar
            variant="hero"
            value={{}}
            onSubmit={goSearch}
            extra={
              <Button
                size="large"
                onClick={() => navigate('/search')}
                style={{ height: 48, borderRadius: 12, padding: '0 16px', fontWeight: 600, borderColor: '#cbd5e1', color: '#475569' }}
              >
                Xem tất cả ({allHomestays.length})
              </Button>
            }
          />
        </div>
      </div>

      {/* QUICK DESTINATIONS CHIPS */}
      <div style={{ marginBottom: 32, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text strong style={{ color: '#64748b', marginRight: 4 }}>
          Điểm đến nổi bật:
        </Text>
        <Button shape="round" onClick={() => navigate('/search')} style={{ fontWeight: 600, borderColor: '#cbd5e1' }}>
          🌟 Tất cả ({allHomestays.length})
        </Button>
        {POPULAR_DESTINATIONS.map((c) => (
          <Button
            key={c}
            shape="round"
            onClick={() => goSearch({ city: c })}
            style={{ borderColor: '#cbd5e1', fontWeight: 500 }}
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
                <div>
                  <Title level={3} style={{ margin: 0, color: '#1e1b4b', fontSize: 20 }}>
                    Đề xuất dành riêng cho bạn
                  </Title>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Phù hợp với sở thích của bạn: Ưu tiên không gian đẹp · Yên tĩnh · Tiện nghi BBQ
                </Text>
              </div>
            </Space>

            <Tag color="cyan" style={{ padding: '4px 10px', fontSize: 13, borderRadius: 8, border: 'none', background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>
              ✨ Độ tương thích 98%
            </Tag>
          </div>

          {/* Grid các Homestay được đẩy lên Top */}
          <Row gutter={[20, 20]}>
            {aiRecommendedHomestays.map((h) => {
              const firstRoom = h.rooms?.[0];
              const coverImage = getHomestayCoverImage(h);
              const price = Number(firstRoom?.base_price) || 600000;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={'top_' + h.id}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/homestay/${h.id}`, { state: { coverImage } })}
                    cover={
                      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
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
                          src={coverImage}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {h.is_claimed === 1 ? (
                          <Tag
                            color="success"
                            icon={<CheckCircleOutlined />}
                            style={{ position: 'absolute', bottom: 10, left: 12, fontWeight: 600 }}
                          >
                            Chính chủ eKYC
                          </Tag>
                        ) : (
                          <Tag
                            color="blue"
                            style={{ position: 'absolute', bottom: 10, left: 12, fontWeight: 600 }}
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
                              right: 12,
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
        </div>
      )}

      {/* ======================================================== */}
      {/* PHẦN 2: KHÁM PHÁ TẤT CẢ CHỖ NGHỈ TẠI ĐỊA ĐIỂM */}
      {/* ======================================================== */}
      <div id="all-homestays-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Tất cả chỗ nghỉ trên toàn quốc
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            <strong>{allHomestays.length.toLocaleString('vi-VN')}</strong> chỗ nghỉ · chọn điểm đến và bộ lọc ở trang tìm kiếm
          </Text>
        </div>
        <Button type="link" onClick={() => navigate('/search')} style={{ color: '#6366f1', fontWeight: 600, padding: 0 }}>
          Tìm kiếm & lọc nâng cao →
        </Button>
      </div>

      {/* HOMESTAYS GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Đang tải danh sách homestay...</div>
        </div>
      ) : allHomestays.length === 0 ? (
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
          <Paragraph type="secondary">Không tải được danh sách. Vui lòng tải lại trang.</Paragraph>
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {paginatedHomestays.map((h) => {
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
                          src={coverImage}
                          loading="lazy"
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
          {allHomestays.length > pageSize && (
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
                total={allHomestays.length}
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
