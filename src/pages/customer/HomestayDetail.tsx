import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  DatePicker,
  message,
  Spin,
  Divider,
  Avatar,
  Rate,
  Image,
  Badge,
  Modal,
} from 'antd';
import {
  StarFilled,
  EnvironmentOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  CheckOutlined,
  MessageOutlined,
  TeamOutlined,
  HomeOutlined,
  WifiOutlined,
  CarOutlined,
  CoffeeOutlined,
  FireOutlined,
  SmileOutlined,
  RocketOutlined,
  CustomerServiceOutlined,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
  PictureOutlined,
  HeartOutlined,
  HeartFilled,
  GiftOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { customerService } from '../../services/customerService';
import type { PublicReview } from '../../types/customer';
import type { HomestayItem, RoomItem, AvailableCoupon } from '../../types/customer';
import { getHomestayCoverImage, getAllHomestayImages } from '../../utils/imageHelper';
import { useFavorites } from '../../contexts/useFavorites';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('tắm')) return '🚿';
  if (name.includes('ngủ')) return '🛏️';
  if (name.includes('ngoài trời') || name.includes('sân vườn') || name.includes('hiên')) return '🌳';
  if (name.includes('bếp') || name.includes('nấu')) return '🍳';
  if (name.includes('tiện ích') || name.includes('trong phòng')) return '🧰';
  if (name.includes('hoạt động') || name.includes('thể thao')) return '🏃';
  if (name.includes('khách') || name.includes('sofa')) return '🛋️';
  if (name.includes('truyền thông') || name.includes('công nghệ') || name.includes('tv')) return '📺';
  if (name.includes('đồ ăn') || name.includes('uống') || name.includes('nhà hàng')) return '☕';
  if (name.includes('internet') || name.includes('wifi')) return '🌐';
  if (name.includes('đậu xe') || name.includes('đỗ xe')) return '🚗';
  if (name.includes('phương tiện') || name.includes('xe đưa đón')) return '🚌';
  if (name.includes('lễ tân')) return '🛎️';
  if (name.includes('lau dọn') || name.includes('giặt')) return '🧹';
  if (name.includes('doanh nhân') || name.includes('fax')) return '💼';
  if (name.includes('an ninh') || name.includes('bảo vệ')) return '🛡️';
  if (name.includes('khuyết tật')) return '♿';
  if (name.includes('sức khỏe') || name.includes('massage')) return '💆';
  if (name.includes('ngôn ngữ')) return '🗣️';
  return '✨';
};

const getPopularFacilityIcon = (facilityName: string) => {
  const name = facilityName.toLowerCase();
  if (name.includes('wifi') || name.includes('mạng')) return <WifiOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('đỗ xe') || name.includes('đậu xe')) return <CarOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('đưa đón') || name.includes('sân bay')) return <RocketOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('không hút thuốc')) return <CheckCircleOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('lễ tân')) return <CustomerServiceOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('nhà hàng') || name.includes('ăn')) return <CoffeeOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('sân vườn') || name.includes('ngoài trời')) return <SmileOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('sưởi') || name.includes('điều hòa')) return <FireOutlined style={{ color: '#008009', fontSize: 16 }} />;
  if (name.includes('trà') || name.includes('cà phê')) return <CoffeeOutlined style={{ color: '#008009', fontSize: 16 }} />;
  return <CheckCircleOutlined style={{ color: '#008009', fontSize: 16 }} />;
};

export default function HomestayDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <HomestayDetailContent key={id} />;
}

function HomestayDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const initialCoverFromState = (location.state as any)?.coverImage;

  const [homestay, setHomestay] = useState<HomestayItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  // Ngày mang sang từ trang kết quả tìm kiếm (?checkin=&checkout=), bỏ qua nếu sai hoặc đã qua
  const [dateRange, setDateRange] = useState<[string, string] | null>(() => {
    const qs = new URLSearchParams(location.search);
    const ci = qs.get('checkin');
    const co = qs.get('checkout');
    const ok = (d: string | null): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && dayjs(d).isValid();
    if (!ok(ci) || !ok(co) || co <= ci || dayjs(ci).isBefore(dayjs().startOf('day'))) return null;
    return [ci, co];
  });
  const [activeImage, setActiveImage] = useState<string | null>(initialCoverFromState || null);

  // Availability & Quoting state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [roomAvailabilityQuote, setRoomAvailabilityQuote] = useState<any | null>(null);



  // ROOM DETAIL MODAL STATE
  const [roomDetailModalOpen, setRoomDetailModalOpen] = useState(false);
  const [activeDetailRoom, setActiveDetailRoom] = useState<RoomItem | null>(null);
  const [modalActiveImgIndex, setModalActiveImgIndex] = useState(0);

  // MÃ GIẢM GIÁ KHẢ DỤNG CHO HOMESTAY
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | null>(null);

  const handleOpenRoomDetail = (room: RoomItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveDetailRoom(room);
    setModalActiveImgIndex(0);
    setRoomDetailModalOpen(true);
  };

  const openHostChat = () => {
    if (id) navigate(`/messages?homestay=${encodeURIComponent(id)}`);
  };

  const fetchDetail = useCallback((homestayId: string) => {
    return customerService
      .getHomestayDetail(homestayId)
      .then((res: any) => {
        const data = res?.data ?? res;
        // If backend returned rooms, use them. Otherwise build room structure from real property images & price
        const realImages: string[] = data?.amenities_json?.property_images || [];
        const fallbackRooms: RoomItem[] = [
          {
            id: `${data.id}-room-1`,
            homestay_id: data.id,
            room_name: 'Phòng Tiêu Chuẩn Booking',
            capacity: 2,
            base_price: data.rooms?.[0]?.base_price || 650000,
            bed_info: '1 Giường đôi lớn',
            area_sqm: 25,
            amenities: data.amenities_json?.popular_facilities?.slice(0, 5) || [
              'Wifi miễn phí',
              'Phòng tắm riêng',
            ],
            images: realImages.slice(0, 4).map((url: string, idx: number) => ({
              id: `${data.id}-img-${idx}`,
              image_url: url,
              is_primary: idx === 0 ? 1 : 0,
              sort_order: idx,
            })),
          },
        ];

        const rooms = data?.rooms?.length ? data.rooms : fallbackRooms;
        setHomestay({ ...data, rooms });
        setSelectedRoom(rooms[0]);
        setActiveImage(null);
      })
      .catch(() => {
        message.error('Không tìm thấy thông tin homestay hoặc kết nối máy chủ gián đoạn.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (id) {
      fetchDetail(id);
      customerService.getHomestayCoupons(id).then((coupons) => {
        setAvailableCoupons(coupons);
      });
    }
  }, [id, fetchDetail]);

  // Đánh giá thật của khách đã lưu trú (đã duyệt, tên được che bớt)
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [reviewMeta, setReviewMeta] = useState<{ page: number; total_pages: number } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const loadReviews = async (homestayId: string, page: number) => {
    setLoadingReviews(true);
    try {
      const res = await customerService.getHomestayReviews(homestayId, page, 5);
      setPublicReviews((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
      setReviewMeta({ page: res.meta.page, total_pages: res.meta.total_pages });
    } catch {
      // Lỗi tải đánh giá không được làm hỏng cả trang chi tiết
      if (page === 1) setPublicReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (id) loadReviews(id, 1);
  }, [id]);

  const isBookingComHomestay =
    homestay?.is_claimed === 0 ||
    !!homestay?.source_url?.toLowerCase().includes('booking.com');

  // Kiểm tra tình trạng phòng real-time khi khách chọn ngày và phòng (đối với homestay chính chủ)
  useEffect(() => {
    if (!selectedRoom?.id || !dateRange?.[0] || !dateRange?.[1] || isBookingComHomestay) {
      setRoomAvailabilityQuote(null);
      return;
    }

    let isSubscribed = true;
    setCheckingAvailability(true);
    customerService
      .quoteBooking({
        room_id: String(selectedRoom.id),
        check_in_date: dateRange[0],
        check_out_date: dateRange[1],
      })
      .then((quote: any) => {
        if (isSubscribed) {
          const q = quote?.data ?? quote;
          setRoomAvailabilityQuote(q);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi kiểm tra tình trạng phòng:', err);
        if (isSubscribed) {
          setRoomAvailabilityQuote({ available: false, error: true, error_message: err?.message });
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setCheckingAvailability(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedRoom?.id, dateRange, isBookingComHomestay]);

  const handleBooking = () => {
    // 1. NẾU LÀ HOMESTAY TỪ BOOKING.COM: DẪN TRỰC TIẾP SANG BOOKING.COM
    if (isBookingComHomestay) {
      let base =
        homestay?.source_url ||
        `https://www.booking.com/searchresults.vi.html?ss=${encodeURIComponent(homestay?.name || 'Homestay')}`;

      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        base = `https://${base.replace(/^\/+/, '')}`;
      }

      const [cleanBase, existingQuery] = base.split('?');
      const params = new URLSearchParams(existingQuery || '');

      if (dateRange?.[0] && dateRange?.[1]) {
        params.set('checkin', dateRange[0]);
        params.set('checkout', dateRange[1]);
      }
      params.set('group_adults', '2');
      params.set('no_rooms', '1');
      params.delete('aid');
      params.delete('label');

      const targetUrl = `${cleanBase}?${params.toString()}`;

      // Mở an toàn bằng thẻ anchor có rel="noopener noreferrer" để không lộ Referer localhost và tránh bị chặn
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('Đang chuyển hướng sang trang đặt phòng trên Booking.com...');
      return;
    }

    // 2. NẾU LÀ HOMESTAY CHỦ NHÀ ĐĂNG KÝ TRÊN SÀN STAYAI
    if (!selectedRoom) {
      message.warning('Vui lòng chọn một loại phòng');
      return;
    }
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning('Vui lòng chọn ngày nhận phòng và trả phòng');
      return;
    }

    if (roomAvailabilityQuote && !roomAvailabilityQuote.available) {
      message.error('Rất tiếc, phòng này đã có người đặt trong khoảng ngày bạn chọn. Vui lòng chọn ngày khác!');
      return;
    }

    const checkIn = dateRange[0];
    const checkOut = dateRange[1];

    const couponParam = selectedCouponCode ? `&coupon=${encodeURIComponent(selectedCouponCode)}` : '';
    navigate(
      `/checkout?roomId=${selectedRoom.id}&homestayId=${homestay?.id}&checkIn=${checkIn}&checkOut=${checkOut}${couponParam}`,
    );
  };

  const handleClaimHomestay = () => {
    navigate(`/host/verification?tab=property&homestay_id=${homestay?.id}`);
  };

  // Ảnh bìa chính: luôn ưu tiên ảnh truyền từ trang chủ hoặc ảnh tính toán chuẩn xác từ helper
  const primaryCover = useMemo(() => {
    return initialCoverFromState || getHomestayCoverImage(homestay);
  }, [homestay, initialCoverFromState]);

  const coverImage = activeImage || primaryCover;

  // Thu thập toàn bộ ảnh thật của homestay từ các phòng đã cào về Booking.com
  const allImages = useMemo(() => {
    return getAllHomestayImages(homestay, coverImage);
  }, [homestay, coverImage]);

  const secondImage = allImages[1] || allImages[0] || coverImage;
  const thirdImage = allImages[2] || allImages[1] || coverImage;

  if (loading || !homestay) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Trích xuất dữ liệu tiện nghi phân nhóm & điểm số chi tiết từ amenities_json
  const amenitiesData = (homestay.amenities_json as Record<string, any>) || {};

  // Đánh giá thực tế từ khách hàng
  const totalReviewsCount = Number(homestay.total_reviews) || 0;
  const avgRatingNum = Number(homestay.average_rating) || 0;
  const hasReviews = totalReviewsCount > 0 || avgRatingNum > 0 || (homestay.reviews && homestay.reviews.length > 0);
  const hasRealReviewScores = Boolean(
    amenitiesData.review_scores && Object.keys(amenitiesData.review_scores).length > 0,
  );
  const reviewScores = amenitiesData.review_scores || null;

  // Tiện nghi phân nhóm
  const hasGroupedFacilities = Boolean(
    amenitiesData.grouped_facilities && Object.keys(amenitiesData.grouped_facilities).length > 0,
  );
  const isCrawled = Boolean(homestay.source_url && homestay.is_claimed !== 1);
  const hostItems: string[] = Array.isArray(amenitiesData.items) ? amenitiesData.items : [];

  const groupedFacilities: Record<string, string[]> = hasGroupedFacilities
    ? { ...amenitiesData.grouped_facilities }
    : hostItems.length > 0
      ? { 'Tiện nghi chỗ nghỉ': hostItems }
      : isCrawled
        ? {
            'Phòng tắm': [
              'Giấy vệ sinh',
              'Khăn tắm',
              'Bồn tắm hoặc vòi sen',
              'Dép lê',
              'Đồ vệ sinh cá nhân miễn phí',
              'Máy sấy tóc',
              'Phòng tắm riêng',
            ],
            'Phòng ngủ': ['Bộ khăn trải giường', 'Tủ hoặc phòng để quần áo'],
            'Ngoài trời': ['Bàn ghế ngoài trời', 'Khu vực ăn uống ngoài trời', 'Sân thượng / hiên', 'Sân vườn'],
            'Nhà bếp': ['Bàn ăn', 'Máy pha cà phê', 'Ấm đun nước điện', 'Tủ lạnh', 'Bếp nấu gia đình'],
            'Tiện ích trong phòng': ['Ổ cắm gần giường', 'Giá treo quần áo', 'Bàn làm việc'],
            'Truyền thông & Công nghệ': ['Dịch vụ phát trực tuyến (như Netflix)', 'TV màn hình phẳng'],
            'Đồ ăn & thức uống': ['Minibar', 'Nhà hàng', 'Máy pha trà/cà phê'],
            'Internet': ['Wi-fi có ở toàn bộ khách sạn và miễn phí.'],
            'Chỗ đậu xe': ['Có chỗ đỗ xe riêng miễn phí tại chỗ (không cần đặt chỗ trước).'],
            'Dịch vụ lễ tân': ['Lễ tân 24 giờ', 'Bàn bán tour', 'Giữ hành lí', 'Nhận/trả phòng riêng', 'Tủ khóa'],
            'An ninh': [
              'Bình chữa cháy',
              'Hệ thống CCTV bên ngoài chỗ nghỉ',
              'Hệ thống CCTV trong khu vực chung',
              'Thiết bị báo cháy',
              'Báo động an ninh',
              'Bảo vệ 24/7',
            ],
            'Tổng quát': ['Điều hòa nhiệt độ', 'Hệ thống sưởi', 'Phòng không hút thuốc', 'Khu vực xem TV/sảnh chung'],
          }
        : {};

  const hasPopularFacilities = Boolean(
    amenitiesData.popular_facilities && amenitiesData.popular_facilities.length > 0,
  );
  const popularFacilities: string[] = hasPopularFacilities
    ? amenitiesData.popular_facilities
    : hostItems.length > 0
      ? hostItems
      : isCrawled
        ? [
            'WiFi miễn phí',
            'Chỗ đỗ xe miễn phí',
            'Xe đưa đón sân bay',
            'Phòng không hút thuốc',
            'Lễ tân 24 giờ',
            'Nhà hàng',
            'Sân vườn',
            'Hệ thống sưởi',
            'Máy pha trà/cà phê trong tất cả các phòng',
          ]
        : [];

  const overallRating10 = hasReviews
    ? Number(
        (avgRatingNum > 5
          ? avgRatingNum
          : avgRatingNum * 2
        ).toFixed(1),
      )
    : 0;
  const overallRatingStr = hasReviews ? overallRating10.toFixed(1).replace('.', ',') : 'Mới';
  const scoreWord = !hasReviews
    ? 'Chưa có đánh giá'
    : overallRating10 >= 9.0
      ? 'Tuyệt hảo'
      : overallRating10 >= 8.0
        ? 'Rất tốt'
        : overallRating10 >= 7.0
          ? 'Tốt'
          : 'Hài lòng';

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        Quay lại tìm kiếm
      </Button>

      {/* HEADER INFO */}
      <div style={{ marginBottom: 20 }}>
        <Space size="small" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          {homestay.is_claimed === 1 ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Chính chủ eKYC 4 Lớp
            </Tag>
          ) : (
            <Space size={6} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Tag color="blue">Booking.com Verified</Tag>
              <Tag color="orange">Chưa có chủ chính thức</Tag>
              <Button
                type="link"
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={handleClaimHomestay}
                style={{
                  color: '#6366f1',
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '0 4px',
                  height: 'auto',
                }}
              >
                Xác thực chủ nhà ↗
              </Button>
            </Space>
          )}
          <Tag color="blue">{homestay.city}</Tag>
          <Tag color="purple">Bảo vệ tiền đặt cọc Escrow 24h</Tag>
          {homestay.source_url && (
            <a
              href={homestay.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: '#2563eb',
                fontWeight: 600,
                background: '#eff6ff',
                padding: '2px 10px',
                borderRadius: 6,
                border: '1px solid #bfdbfe',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginLeft: 4,
              }}
            >
              🌐 Xem trang gốc trên Booking.com
            </a>
          )}
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <Title level={2} style={{ margin: 0 }}>
            {homestay.name}
          </Title>
          <Button
            type={isFavorite(homestay.id) ? 'primary' : 'default'}
            danger={isFavorite(homestay.id)}
            icon={isFavorite(homestay.id) ? <HeartFilled /> : <HeartOutlined />}
            onClick={() => void toggleFavorite(homestay.id)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            {isFavorite(homestay.id) ? 'Đã lưu yêu thích' : 'Lưu vào yêu thích'}
          </Button>
        </div>
        <Text type="secondary">
          <EnvironmentOutlined /> {homestay.address} •{' '}
          {hasReviews ? (
            <>
              <StarFilled style={{ color: '#f59e0b' }} /> {overallRatingStr} ({totalReviewsCount} đánh giá)
            </>
          ) : (
            <Tag color="cyan" style={{ border: 'none', fontWeight: 600 }}>Chỗ nghỉ mới · Chưa có đánh giá</Tag>
          )}
        </Text>
      </div>

      {/* GALLERY COVER - HIỂN THỊ ĐÚNG ẢNH THẬT TỪ BOOKING.COM */}
      <Image.PreviewGroup>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={16}>
            <div style={{ height: 420, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <Image
                src={coverImage}
                alt="Cover"
                style={{ width: '100%', height: 420, objectFit: 'cover' }}
              />
            </div>
          </Col>
          <Col span={8}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 420 }}>
              <div
                style={{ flex: 1, borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setActiveImage(secondImage)}
              >
                <Image
                  src={secondImage}
                  alt="Room"
                  style={{ width: '100%', height: 202, objectFit: 'cover' }}
                />
              </div>
              <div
                style={{ flex: 1, borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setActiveImage(thirdImage)}
              >
                <Image
                  src={thirdImage}
                  alt="View"
                  style={{ width: '100%', height: 202, objectFit: 'cover' }}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Image.PreviewGroup>

      {/* THUMBNAILS BAR CHO TẤT CẢ ẢNH THẬT */}
      {allImages.length > 3 && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 24,
          }}
        >
          {allImages.map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => setActiveImage(imgUrl)}
              style={{
                width: 88,
                height: 60,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                cursor: 'pointer',
                border: coverImage === imgUrl ? '2px solid #6366f1' : '1px solid #cbd5e1',
                opacity: coverImage === imgUrl ? 1 : 0.7,
                transition: 'all 0.2s',
              }}
            >
              <img
                src={imgUrl}
                alt={`Photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* DETAILS & BOOKING CARD */}
      <Row gutter={[32, 32]}>
        <Col xs={24} md={16}>
          {/* MÃ GIẢM GIÁ & ƯU ĐÃI KHẢ DỤNG */}
          {!isBookingComHomestay && availableCoupons.length > 0 && (
            <Card
              style={{
                borderRadius: 16,
                marginBottom: 24,
                background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
                border: '1px solid #fde68a',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)',
              }}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Space>
                    <GiftOutlined style={{ color: '#d97706', fontSize: 18 }} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#92400e' }}>
                      Ưu đãi & Mã giảm giá áp dụng ({availableCoupons.length} mã)
                    </span>
                  </Space>
                  <Tag color="gold" style={{ borderRadius: 6, fontWeight: 600 }}>Tiết kiệm ngay khi đặt phòng</Tag>
                </div>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {availableCoupons.map((c) => {
                  const isSelected = selectedCouponCode === c.code;
                  return (
                    <div
                      key={c.id}
                      style={{
                        border: isSelected ? '2px solid #ea580c' : '1px dashed #f59e0b',
                        background: isSelected ? '#fff7ed' : '#ffffff',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 8,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Tag color="orange" style={{ fontWeight: 800, fontSize: 13, padding: '2px 8px' }}>
                            {c.code}
                          </Tag>
                          {c.sponsor_by === 'PLATFORM' ? (
                            <Tag color="blue" style={{ fontSize: 11 }}>Sàn StayAI</Tag>
                          ) : (
                            <Tag color="purple" style={{ fontSize: 11 }}>Chủ nhà</Tag>
                          )}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                          {c.discount_type === 'PERCENTAGE'
                            ? `Giảm ${c.discount_value}%${c.max_discount ? ` (Tối đa ${(c.max_discount / 1000).toLocaleString('vi-VN')}k)` : ''}`
                            : `Giảm ${(c.discount_value).toLocaleString('vi-VN')}đ`}
                        </div>
                        {c.name && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{c.name}</div>
                        )}
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          • Đơn tối thiểu: {Number(c.min_order_value) > 0 ? `${Number(c.min_order_value).toLocaleString('vi-VN')}đ` : 'Không giới hạn'}
                        </div>
                        {c.target_audience === 'LOYALTY' && (
                          <div style={{ marginTop: 6 }}>
                            <Tag color="magenta" style={{ fontSize: 11, fontWeight: 600, borderRadius: 4 }}>
                              👑 Khách quen ({[
                                c.min_completed_bookings ? `≥${c.min_completed_bookings} đơn` : null,
                                c.min_total_spent ? `≥${(Number(c.min_total_spent) / 1000000).toFixed(1).replace('.0', '')}tr` : null,
                              ].filter(Boolean).join(c.loyalty_condition_type === 'AND' ? ' VÀ ' : ' HOẶC ')})
                            </Tag>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <Button
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(c.code);
                            message.success(`Đã sao chép mã ${c.code}`);
                          }}
                          style={{ borderRadius: 6, fontSize: 12 }}
                        >
                          Sao chép mã
                        </Button>
                        <Button
                          type={isSelected ? 'primary' : 'default'}
                          size="small"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCouponCode(null);
                              message.info('Đã bỏ chọn mã');
                            } else {
                              setSelectedCouponCode(c.code);
                              message.success(`Đã chọn mã ${c.code}. Mã sẽ tự áp dụng khi bạn đặt phòng!`);
                            }
                          }}
                          style={{
                            borderRadius: 6,
                            fontSize: 12,
                            background: isSelected ? '#ea580c' : undefined,
                            borderColor: '#ea580c',
                            color: isSelected ? '#ffffff' : '#ea580c',
                            fontWeight: 600,
                          }}
                        >
                          {isSelected ? '✓ Đang dùng' : 'Dùng mã này'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ROOM SELECTION LIST */}
          <Card
            id="rooms-section"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <HomeOutlined style={{ color: isBookingComHomestay ? '#003580' : '#6366f1', fontSize: 18 }} />
                  <span style={{ fontWeight: 600 }}>
                    {isBookingComHomestay
                      ? `Thông tin các hạng phòng (${homestay.rooms?.length || 0} loại phòng tham khảo)`
                      : `Các hạng phòng khả dụng (${homestay.rooms?.length || 0} loại phòng)`}
                  </span>
                </Space>
                {isBookingComHomestay ? (
                  <Tag color="blue">Dữ liệu từ Booking.com • Đặt phòng trực tiếp tại đối tác</Tag>
                ) : (
                  <Tag color="cyan">Giá minh bạch • Đã gồm bảo đảm Escrow 24h</Tag>
                )}
              </div>
            }
            style={{ borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {homestay.rooms?.map((r) => {
                const isSelected = !isBookingComHomestay && selectedRoom?.id === r.id;
                const roomImg =
                  r.images?.[0]?.image_url ||
                  getHomestayCoverImage(homestay);
                const roomPhotoCount = r.images?.length || 0;
                const roomBadges = r.room_details_json?.badges?.slice(0, 5) ||
                  (r.amenities && r.amenities.length > 0 ? r.amenities.slice(0, 5) : ['Phòng tắm riêng', 'WiFi miễn phí', 'TV màn hình phẳng']);

                return (
                  <div
                    key={r.id}
                    onClick={(e) => {
                      if (isBookingComHomestay) {
                        handleOpenRoomDetail(r, e);
                      } else {
                        setSelectedRoom(r);
                        if (r.images?.[0]?.image_url) {
                          setActiveImage(r.images[0].image_url);
                        }
                      }
                    }}
                    style={{
                      padding: 18,
                      borderRadius: 14,
                      border: isSelected ? '2px solid #006ce4' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f7ff' : '#ffffff',
                      boxShadow: isSelected ? '0 4px 14px rgba(0, 108, 228, 0.12)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 18,
                      alignItems: 'center',
                    }}
                  >
                    {/* Room Thumbnail with Photo Count & Quick View */}
                    <div
                      onClick={(e) => handleOpenRoomDetail(r, e)}
                      style={{
                        position: 'relative',
                        width: 160,
                        height: 115,
                        borderRadius: 10,
                        overflow: 'hidden',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                      title="Bấm để xem toàn bộ ảnh và chi tiết phòng"
                    >
                      <img
                        src={roomImg}
                        alt={r.room_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {roomPhotoCount > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            padding: '2px 7px',
                            borderRadius: 12,
                            background: 'rgba(0, 0, 0, 0.72)',
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <PictureOutlined /> {roomPhotoCount} ảnh
                        </div>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(0, 108, 228, 0.9)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        Xem chi tiết
                      </div>
                    </div>

                    {/* Room Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text
                          strong
                          onClick={(e) => handleOpenRoomDetail(r, e)}
                          style={{
                            fontSize: 16,
                            color: isSelected ? '#006ce4' : '#1e293b',
                            cursor: 'pointer',
                          }}
                        >
                          {r.room_name}
                        </Text>
                        {isSelected && <Tag color="blue">Đang chọn</Tag>}
                      </div>

                      <Space size={10} style={{ color: '#475569', fontSize: 13, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span>
                          <TeamOutlined style={{ color: '#006ce4' }} /> {r.capacity} khách
                        </span>
                        {r.area_sqm && <span>• 📐 {r.area_sqm} m²</span>}
                        {r.bed_info && <span>• 🛏️ {r.bed_info}</span>}
                      </Space>

                      {/* Room Amenities Badges (chuẩn Booking) */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        {roomBadges.map((badgeText, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: isSelected ? '#e0f2fe' : '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: isSelected ? '#0369a1' : '#334155',
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {badgeText}
                          </span>
                        ))}
                      </div>

                      {/* Clickable link xem chi tiết phòng */}
                      <div
                        onClick={(e) => handleOpenRoomDetail(r, e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#006ce4',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: 2,
                        }}
                      >
                        <EyeOutlined /> Xem chi tiết phòng & toàn bộ ảnh ↗
                      </div>
                    </div>

                    {/* Room Price & Actions */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 150 }}>
                      <Text strong style={{ fontSize: 20, color: '#006ce4' }}>
                        {Number(r.base_price).toLocaleString('vi-VN')}đ
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 10 }}>
                        /đêm
                      </Text>

                      {isBookingComHomestay ? (
                        <Button
                          type="primary"
                          size="middle"
                          block
                          icon={<EyeOutlined />}
                          onClick={(e) => handleOpenRoomDetail(r, e)}
                          style={{
                            borderRadius: 8,
                            background: '#006ce4',
                            borderColor: '#006ce4',
                            fontWeight: 600,
                          }}
                        >
                          Xem chi tiết phòng
                        </Button>
                      ) : (
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Button
                            type={isSelected ? 'primary' : 'default'}
                            size="middle"
                            block
                            style={{
                              borderRadius: 8,
                              background: isSelected ? '#006ce4' : undefined,
                              borderColor: isSelected ? '#006ce4' : '#cbd5e1',
                              fontWeight: 600,
                            }}
                          >
                            {isSelected ? '✓ Đang chọn' : 'Chọn phòng'}
                          </Button>
                          <Button
                            type="text"
                            size="small"
                            block
                            icon={<EyeOutlined />}
                            onClick={(e) => handleOpenRoomDetail(r, e)}
                            style={{ color: '#006ce4', fontWeight: 500, fontSize: 12 }}
                          >
                            Xem chi tiết
                          </Button>
                        </Space>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ======================================================== */}
          {/* BOOKING.COM GROUPED FACILITIES (Ảnh 2) */}
          {/* ======================================================== */}
          <Card
            id="facilities-section"
            style={{
              borderRadius: 16,
              marginBottom: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#1a1a1a' }}>
                  Các tiện nghi của {homestay.name}
                </Title>
                {hasReviews && hasRealReviewScores && reviewScores?.facilities && (
                  <Text style={{ color: '#008009', fontWeight: 500, fontSize: 14, display: 'block', marginTop: 4 }}>
                    Tiện nghi tuyệt vời! Điểm đánh giá: {Number(reviewScores.facilities).toFixed(0)}
                  </Text>
                )}
              </div>

              <Button
                type="primary"
                onClick={() => {
                  const el = document.getElementById('rooms-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: '#006ce4',
                  borderColor: '#006ce4',
                  borderRadius: 6,
                  fontWeight: 600,
                  height: 38,
                }}
              >
                Xem phòng trống
              </Button>
            </div>

            {/* Popular facilities row */}
            {popularFacilities.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12, color: '#1a1a1a' }}>
                  Các tiện nghi được ưa chuộng nhất
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {popularFacilities.map((fac, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#1e293b',
                      }}
                    >
                      {getPopularFacilityIcon(fac)}
                      <span>{fac}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(groupedFacilities).length > 0 ? (
              <>
                {popularFacilities.length > 0 && <Divider style={{ margin: '20px 0' }} />}
                <Row gutter={[24, 28]}>
                  {Object.entries(groupedFacilities).map(([category, items], cIdx) => (
                    <Col xs={24} sm={12} md={8} key={cIdx}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 18 }}>{getCategoryIcon(category)}</span>
                        <Text strong style={{ fontSize: 15, color: '#1a1a1a' }}>
                          {category}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 6 }}>
                        {items.map((item, iIdx) => {
                          const hasFee = item.toLowerCase().includes('phụ phí') || item.toLowerCase().includes('thu phí');
                          const cleanText = item
                            .replace(/\(có phụ phí\)/gi, '')
                            .replace(/\(có thu phí\)/gi, '')
                            .replace(/\(phụ phí\)/gi, '')
                            .trim();

                          return (
                            <div
                              key={iIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                                fontSize: 13,
                                color: '#334155',
                                lineHeight: 1.4,
                              }}
                            >
                              <CheckOutlined style={{ color: '#008009', fontSize: 12, marginTop: 3, flexShrink: 0 }} />
                              <span>
                                {cleanText}{' '}
                                {hasFee && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: '#64748b',
                                      background: '#f1f5f9',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      marginLeft: 4,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Phụ phí
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            ) : popularFacilities.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '28px 20px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                Chủ homestay chưa cập nhật danh sách tiện nghi cho chỗ nghỉ này.
              </div>
            ) : null}
          </Card>

          {/* HOST PROFILE & DIRECT CHAT CARD (Chỉ hiển thị với homestay có chủ nhà thật xác nhận) */}
          {!isBookingComHomestay && homestay?.is_claimed === 1 && (
            <Card
              style={{
                borderRadius: 16,
                marginBottom: 24,
                border: '1px solid #c7d2fe',
                background: 'linear-gradient(135deg, #fdfbff 0%, #f5f3ff 100%)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <Space size="middle">
                  <Badge dot status="success" offset={[-6, 42]}>
                    <Avatar
                      size={56}
                      style={{ backgroundColor: '#003b95', border: '2px solid #6366f1', color: '#fff', fontSize: 22 }}
                      icon={<UserOutlined />}
                    />
                  </Badge>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 16, color: '#1e293b' }}>
                        {homestay.host?.name ? `Chủ nhà: ${homestay.host.name}` : `Đại diện: ${homestay.name}`}
                      </Text>
                      <Tag color="gold" icon={<StarFilled />}>
                        Chủ nhà Siêu cấp
                      </Tag>
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        eKYC 4 Lớp
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      🟢 Đang trực tuyến • Tỉ lệ phản hồi <strong style={{ color: '#10b981' }}>100%</strong> (trong vòng 5 phút)
                    </Text>
                  </div>
                </Space>

                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  size="large"
                  onClick={openHostChat}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  Nhắn tin với Chủ nhà
                </Button>
              </div>
            </Card>
          )}

          {/* OWNER CLAIM CARD CHO CHỦ HOMESTAY (HIỂN THỊ KHI CHƯA CÓ CHỦ CHÍNH THỨC) */}
          {homestay?.is_claimed === 0 && (
            <Card
              style={{
                borderRadius: 16,
                marginBottom: 24,
                border: '1.5px dashed #6366f1',
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <Space size="middle">
                  <Avatar
                    size={52}
                    style={{
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      fontSize: 22,
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    }}
                    icon={<SafetyCertificateOutlined />}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 16, color: '#1e1b4b' }}>
                        Bạn là chủ sở hữu của chỗ nghỉ này?
                      </Text>
                      <Tag color="purple">Dành cho Chủ Nhà</Tag>
                      <Tag color="cyan">Chưa có chủ chính thức</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', maxWidth: 640 }}>
                      Tiếp nhận quyền quản trị chỗ nghỉ, tự do cập nhật giá & đóng/mở phòng, nhận tiền cọc minh bạch qua tài khoản Ký quỹ Escrow StayAI bằng cách hoàn tất quy trình Xác thực 4 Lớp eKYC.
                    </Text>
                  </div>
                </Space>

                <Button
                  type="primary"
                  icon={<SafetyCertificateOutlined />}
                  size="large"
                  onClick={handleClaimHomestay}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  Xác thực làm chủ homestay
                </Button>
              </div>
            </Card>
          )}

          {/* ESCROW & POLICIES */}
          <Card title="Chính sách bảo đảm & Hoàn hủy" style={{ borderRadius: 14, marginBottom: 32 }}>
            <Space direction="vertical" size="small">
              <Text strong style={{ color: '#10b981' }}>
                <SafetyCertificateOutlined /> Cơ chế Escrow bảo vệ 100% tiền khách hàng:
              </Text>
              <Paragraph type="secondary">
                Tiền phòng của bạn được Sàn giữ an toàn trong tài khoản ký quỹ Escrow và chỉ giải ngân cho Chủ nhà sau 24 giờ kể từ khi bạn hoàn tất nhận phòng thực tế (Check-in).
              </Paragraph>
              <Divider style={{ margin: '8px 0' }} />
              <Text strong>Chính sách hủy phòng: {homestay.cancellation_policy}</Text>
              <Paragraph type="secondary">Hủy miễn phí trước 48 giờ so với giờ nhận phòng.</Paragraph>
            </Space>
          </Card>

          {/* ======================================================== */}
          {/* PHÂN HỆ ĐÁNH GIÁ & ABSA AI REVIEW SUMMARY (REQ-019) */}
          {/* ======================================================== */}
          <Card
            id="reviews-section"
            title={
              <Space>
                <StarFilled style={{ color: '#f59e0b' }} />
                <span>Đánh giá từ khách hàng ({homestay.total_reviews ?? 0} lượt)</span>
              </Space>
            }
            style={{ borderRadius: 16, marginBottom: 32 }}
          >
            {/* ======================================================== */}
            {/* BOOKING.COM GUEST REVIEWS BREAKDOWN (Ảnh 1) */}
            {/* ======================================================== */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#1a1a1a' }}>
                    Đánh giá của khách
                  </Title>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                    {/* Booking Rating Badge */}
                    <div
                      style={{
                        background: hasReviews ? '#003b95' : '#64748b',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 16,
                        padding: '6px 12px',
                        borderRadius: '8px 8px 8px 0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {overallRatingStr}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                        {scoreWord}
                      </span>
                      <span style={{ color: '#595959', fontSize: 14, marginLeft: 6 }}>
                        · {totalReviewsCount} đánh giá
                      </span>
                      {hasReviews && (
                        <span
                          onClick={() => {
                            const el = document.getElementById('user-comments-list');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          style={{ color: '#006ce4', fontSize: 14, marginLeft: 12, cursor: 'pointer', fontWeight: 500 }}
                        >
                          Đọc tất cả đánh giá
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="primary"
                  onClick={() => {
                    const el = document.getElementById('rooms-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    background: '#006ce4',
                    borderColor: '#006ce4',
                    borderRadius: 6,
                    fontWeight: 600,
                    height: 38,
                  }}
                >
                  Xem phòng trống
                </Button>
              </div>

              {hasReviews && hasRealReviewScores && reviewScores ? (
                <>
                  <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 14, color: '#1a1a1a' }}>
                    Hạng mục:
                  </Text>

                  {/* 7 Category Sub-Scores Grid matching Screenshot 1 */}
                  <Row gutter={[32, 16]}>
                    {[
                      { label: 'Sạch sẽ', score: reviewScores.cleanliness },
                      { label: 'Thoải mái', score: reviewScores.comfort },
                      { label: 'Tiện nghi', score: reviewScores.facilities },
                      { label: 'Địa điểm', score: reviewScores.location },
                      { label: 'Nhân viên phục vụ', score: reviewScores.staff },
                      { label: 'Đáng giá tiền', score: reviewScores.value_for_money },
                      { label: 'WiFi miễn phí', score: reviewScores.wifi },
                    ].map((item, idx) => {
                      const scoreVal = Number(item.score || 0);
                      const scoreFormatted = scoreVal.toFixed(1).replace('.', ',');
                      const percent = Math.min(100, Math.round((scoreVal / 10) * 100));

                      return (
                        <Col xs={24} sm={12} md={8} key={idx}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 6,
                            }}
                          >
                            <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{item.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{scoreFormatted}</span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              background: '#e7e7e7',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                background: '#003b95',
                                borderRadius: 3,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </>
              ) : (
                <div
                  style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                    marginTop: 14,
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  Chưa có dữ liệu đánh giá chi tiết theo từng hạng mục cho chỗ nghỉ này. Điểm chi tiết sẽ được tự động tổng hợp khi khách lưu trú gửi đánh giá.
                </div>
              )}
            </div>

            <Divider style={{ margin: '24px 0' }} />

            {/* REVIEWS LIST */}
            <div id="user-comments-list" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {publicReviews.length > 0 ? (
                publicReviews.map((rev) => (
                  <div key={rev.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Space size="middle">
                        <Avatar style={{ backgroundColor: '#003b95' }} icon={<UserOutlined />} size={44} />
                        <div>
                          <Text strong style={{ fontSize: 15, display: 'block' }}>
                            {rev.customer_name}
                          </Text>
                          <Space size={6}>
                            <Tag color="cyan" style={{ fontSize: 11, border: 'none' }}>
                              <CheckOutlined /> Khách đã lưu trú
                            </Tag>
                            {rev.stay_date && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Lưu trú đến {rev.stay_date}
                              </Text>
                            )}
                          </Space>
                        </div>
                      </Space>

                      <Rate disabled value={rev.rating_overall} style={{ fontSize: 14, color: '#f59e0b' }} />
                    </div>

                    <Paragraph style={{ color: '#334155', fontSize: 14, lineHeight: 1.6, margin: '8px 0 12px' }}>
                      {rev.comment}
                    </Paragraph>

                    {rev.photos.length > 0 && (
                      <Image.PreviewGroup>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {rev.photos.map((src, i) => (
                            <Image
                              key={src}
                              src={src}
                              alt={`Ảnh thực tế ${i + 1} của ${rev.customer_name}`}
                              width={88}
                              height={88}
                              style={{ objectFit: 'cover', borderRadius: 8 }}
                            />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    )}

                    {rev.host_reply && (
                      <div style={{ marginLeft: 16, padding: '10px 14px', background: '#f8fafc', borderLeft: '3px solid #003b95', borderRadius: 6 }}>
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                          Phản hồi từ chủ nhà
                        </Text>
                        <Text style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-line' }}>{rev.host_reply}</Text>
                      </div>
                    )}
                  </div>
                ))
              ) : loadingReviews ? (
                <Spin />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    background: '#f8fafc',
                    borderRadius: 14,
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Chưa có nhận xét nào cho chỗ nghỉ này. Hãy là người đầu tiên trải nghiệm và chia sẻ đánh giá!
                  </Text>
                </div>
              )}
              {reviewMeta && reviewMeta.page < reviewMeta.total_pages && id && (
                <Button loading={loadingReviews} onClick={() => loadReviews(id, reviewMeta.page + 1)}>
                  Xem thêm đánh giá
                </Button>
              )}
            </div>
          </Card>
        </Col>

        {/* STICKY BOOKING CARD */}
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
              position: 'sticky',
              top: 90,
              border: '1px solid #e2e8f0',
            }}
          >
            {isBookingComHomestay ? (
              <>
                <div
                  style={{
                    background: '#f0f7ff',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid #bae0ff',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>🔗</span>
                    <Text strong style={{ fontSize: 14, color: '#003580' }}>
                      Đối tác ủy quyền Booking.com
                    </Text>
                  </div>
                  <Text style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, display: 'block' }}>
                    Chỗ nghỉ này được liên kết trực tiếp từ Booking.com. Bạn có thể xem hình ảnh và tiện nghi chi tiết từng phòng ở danh sách bên cạnh.
                  </Text>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: '#64748b' }}>Giá tham khảo chỉ từ</Text>
                  <div>
                    <Text strong style={{ fontSize: 26, color: '#003580' }}>
                      {(homestay.rooms?.[0]?.base_price || 500000).toLocaleString('vi-VN')}đ
                    </Text>
                    <Text type="secondary"> /đêm</Text>
                  </div>
                </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Chọn ngày lưu trú
              </Text>
              <RangePicker
                style={{ width: '100%' }}
                // Chỉ cho chọn từ hôm nay đến 365 ngày tới, khớp luật đặt phòng của backend
                disabledDate={(current) => {
                  const startOfToday = new Date().setHours(0, 0, 0, 0);
                  return current.valueOf() < startOfToday || current.valueOf() > startOfToday + 365 * 86_400_000;
                }}
                value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
                onChange={(_, dateStrings) =>
                  setDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
                }
              />
            </div>
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px dashed #cbd5e1',
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#334155',
                    lineHeight: 1.5,
                  }}
                >
                  ℹ️ Để chọn ngày lưu trú, kiểm tra tình trạng phòng trống thực tế và hoàn tất thủ tục đặt phòng, vui lòng tiếp tục trên Booking.com.
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={handleBooking}
                  style={{
                    height: 50,
                    borderRadius: 10,
                    background: '#003580',
                    borderColor: '#003580',
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 4px 14px rgba(0, 53, 128, 0.35)',
                  }}
                >
                  Đặt phòng tại Booking.com ↗
                </Button>

                <div style={{ textAlign: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                  <Text style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Bạn là chủ sở hữu của chỗ nghỉ này?
                  </Text>
                  <Button
                    type="link"
                    icon={<SafetyCertificateOutlined />}
                    onClick={handleClaimHomestay}
                    style={{
                      color: '#6366f1',
                      fontWeight: 600,
                      fontSize: 13,
                      padding: 0,
                      height: 'auto',
                    }}
                  >
                    Xác thực làm chủ homestay ↗
                  </Button>
                </div>

                <Text
                  type="secondary"
                  style={{ fontSize: 12, textAlign: 'center', display: 'block', marginTop: 14 }}
                >
                  🔗 Đặt phòng an toàn & xác thực trực tiếp trên Booking.com
                </Text>
              </>
            ) : (
              <>
                {/* Selected Room Tag */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Hạng phòng đang chọn:</Text>
                  <Text strong style={{ fontSize: 14, color: '#4338ca' }}>
                    {selectedRoom?.room_name || 'Vui lòng chọn phòng bên trái'}
                  </Text>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: '#64748b' }}>Giá phòng niêm yết</Text>
                  <div>
                    <Text strong style={{ fontSize: 26, color: '#6366f1' }}>
                      {(selectedRoom?.base_price || 650000).toLocaleString('vi-VN')}đ
                    </Text>
                    <Text type="secondary"> /đêm</Text>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>
                    Chọn ngày lưu trú
                  </Text>
                  <RangePicker
                    style={{ width: '100%' }}
                    disabledDate={(current) => {
                      const startOfToday = dayjs().startOf('day');
                      return current && current < startOfToday;
                    }}
                    value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
                    onChange={(_, dateStrings) =>
                      setDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null)
                    }
                  />
                </div>

                {/* THÔNG BÁO TÌNH TRẠNG PHÒNG REAL-TIME */}
                {checkingAvailability && (
                  <div style={{ marginBottom: 14, textAlign: 'center', color: '#6366f1', fontSize: 13 }}>
                    <Spin size="small" style={{ marginRight: 8 }} /> Đang kiểm tra tình trạng phòng...
                  </div>
                )}

                {!checkingAvailability && roomAvailabilityQuote && (
                  <div style={{ marginBottom: 14 }}>
                    {roomAvailabilityQuote.available ? (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          padding: '10px 14px',
                          borderRadius: 8,
                          color: '#15803d',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>✓</span> Còn phòng trống cho các đêm đã chọn!
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4, color: '#166534' }}>
                          Tổng tiền: <strong>{Number(roomAvailabilityQuote.total_amount).toLocaleString('vi-VN')}đ</strong> ({roomAvailabilityQuote.nightly_prices?.length || 0} đêm)
                        </div>
                        {selectedCouponCode && (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: '#fff7ed', border: '1px dashed #f97316', borderRadius: 8, fontSize: 12, color: '#c2410c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>🏷️ Đã chọn ưu đãi: <strong>{selectedCouponCode}</strong></span>
                            <Button type="link" size="small" onClick={() => setSelectedCouponCode(null)} style={{ padding: 0, height: 'auto', fontSize: 11, color: '#ea580c' }}>Bỏ chọn</Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          padding: '10px 14px',
                          borderRadius: 8,
                          color: '#b91c1c',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚠️</span> Phòng đã kín / có khách đặt ngày này!
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4, color: '#991b1b' }}>
                          {(roomAvailabilityQuote.unavailable_dates?.length > 0 || roomAvailabilityQuote.held_dates?.length > 0)
                            ? `Các đêm đã kín phòng: ${(roomAvailabilityQuote.unavailable_dates || roomAvailabilityQuote.held_dates).join(', ')}.`
                            : 'Chủ nhà đã khóa phòng hoặc phòng đã được đặt các ngày này.'} Vui lòng chọn khoảng ngày khác.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="primary"
                  size="large"
                  block
                  disabled={roomAvailabilityQuote && !roomAvailabilityQuote.available}
                  onClick={handleBooking}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    background: roomAvailabilityQuote && !roomAvailabilityQuote.available
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    borderColor: roomAvailabilityQuote && !roomAvailabilityQuote.available ? '#94a3b8' : undefined,
                    fontWeight: 600,
                    fontSize: 15,
                    boxShadow: roomAvailabilityQuote && !roomAvailabilityQuote.available
                      ? 'none'
                      : '0 4px 12px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {roomAvailabilityQuote && !roomAvailabilityQuote.available
                    ? '⚠️ Phòng đã kín ngày này'
                    : 'Đặt phòng ngay'}
                </Button>

                {homestay?.is_claimed === 1 && (
                  <Button
                    size="large"
                    block
                    icon={<MessageOutlined />}
                    onClick={openHostChat}
                    style={{
                      marginTop: 12,
                      height: 44,
                      borderRadius: 10,
                      borderColor: '#6366f1',
                      color: '#6366f1',
                      fontWeight: 600,
                      background: '#fdfbff',
                    }}
                  >
                    Nhắn tin hỏi chủ nhà
                  </Button>
                )}

                <Text
                  type="secondary"
                  style={{ fontSize: 12, textAlign: 'center', display: 'block', marginTop: 14 }}
                >
                  🛡️ Bảo vệ thanh toán: Ký quỹ Escrow StayAI
                </Text>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* ======================================================== */}
      {/* ROOM DETAIL MODAL (Chuẩn 100% Giao diện Booking.com)   */}
      {/* ======================================================== */}
      <Modal
        open={roomDetailModalOpen}
        onCancel={() => setRoomDetailModalOpen(false)}
        footer={null}
        width={1050}
        centered
        destroyOnHidden
        styles={{
          body: { padding: 0, maxHeight: '90vh', overflowY: 'auto' },
          container: { borderRadius: 12, overflow: 'hidden', padding: 0 },
        }}
        closeIcon={
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              fontSize: 14,
              fontWeight: 'bold',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            ✕
          </div>
        }
      >
        {activeDetailRoom && (() => {
          const room = activeDetailRoom;
          const roomPhotos = (room.images && room.images.length > 0)
            ? room.images.map((img: any) => img.image_url)
            : (homestay?.images?.map((img: any) => img.image_url) || [getHomestayCoverImage(homestay)]);

          const details = room.room_details_json || {};
          const badges = details.badges || [
            `${room.area_sqm || 16} m²`,
            room.bed_info || '1 giường đôi lớn',
            'Phòng tắm riêng',
            'TV màn hình phẳng',
            'Cách âm',
            'Minibar',
            'WiFi miễn phí',
          ];
          const bathroomAmenities = details.bathroom_amenities || [
            'Đồ vệ sinh cá nhân miễn phí',
            'Khăn tắm',
            'Dép lê',
            'Vòi xịt/chậu rửa vệ sinh',
            'Máy sấy tóc',
            'Nhà vệ sinh',
            'Giấy vệ sinh',
            'Bồn tắm hoặc vòi sen',
          ];
          const views = details.views || ['Nhìn ra vườn', 'Nhìn ra địa danh', 'Nhìn ra thành phố'];
          const roomAmenities = details.room_amenities || [
            'Bộ khăn trải giường',
            'Ấm đun nước điện',
            'Ổ cắm gần giường',
            'TV màn hình phẳng',
            'Tủ lạnh',
            'Minibar',
            'Bàn làm việc',
            'Tủ quần áo',
            'Cách âm',
            'Quạt máy',
            'Máy sấy quần áo',
            'Sàn gỗ hoặc lát gạch',
          ];
          const smokingPolicy = details.smoking_policy || 'Không hút thuốc';
          const bedRatingText = details.bed_rating_text || 'Chỗ nghỉ này có giường được đánh giá là rất thoải mái (dựa trên 29 đánh giá của khách)';
          const roomDesc = room.description || `Cung cấp đồ vệ sinh cá nhân miễn phí, phòng có phòng tắm riêng với vòi sen không cửa ngăn và bồn rửa vệ sinh. Phòng rộng rãi có TV màn hình phẳng với các kênh truyền hình cáp, tường cách âm, minibar, tủ quần áo cũng như tầm nhìn ra khung cảnh xung quanh. Phòng có ${room.bed_info || '1 giường'}.`;

          const currentImgUrl = roomPhotos[modalActiveImgIndex] || roomPhotos[0];

          const prevImage = (e: React.MouseEvent) => {
            e.stopPropagation();
            setModalActiveImgIndex((prev) => (prev === 0 ? roomPhotos.length - 1 : prev - 1));
          };

          const nextImage = (e: React.MouseEvent) => {
            e.stopPropagation();
            setModalActiveImgIndex((prev) => (prev === roomPhotos.length - 1 ? 0 : prev + 1));
          };

          return (
            <div style={{ padding: 24, background: '#ffffff' }}>
              <Row gutter={[28, 24]}>
                {/* CỘT TRÁI: KHUNG ẢNH LỚN + NEXT/PREV + DOTS + THUMBNAILS */}
                <Col xs={24} lg={13}>
                  {/* Khung ảnh chính */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 380,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={currentImgUrl}
                      alt={room.room_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'opacity 0.25s ease',
                      }}
                    />

                    {/* Nút Prev */}
                    {roomPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={prevImage}
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.94)',
                          border: '1px solid rgba(0,0,0,0.1)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 16,
                          color: '#1e293b',
                          transition: 'all 0.2s ease',
                          zIndex: 2,
                        }}
                      >
                        <LeftOutlined />
                      </button>
                    )}

                    {/* Nút Next */}
                    {roomPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={nextImage}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.94)',
                          border: '1px solid rgba(0,0,0,0.1)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 16,
                          color: '#1e293b',
                          transition: 'all 0.2s ease',
                          zIndex: 2,
                        }}
                      >
                        <RightOutlined />
                      </button>
                    )}

                    {/* Badge số ảnh */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        padding: '4px 10px',
                        borderRadius: 16,
                        background: 'rgba(0, 0, 0, 0.65)',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 600,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {modalActiveImgIndex + 1} / {roomPhotos.length}
                    </div>
                  </div>

                  {/* Dots Indicator */}
                  {roomPhotos.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 10,
                        marginBottom: 12,
                      }}
                    >
                      {roomPhotos.map((_: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setModalActiveImgIndex(idx)}
                          style={{
                            width: modalActiveImgIndex === idx ? 18 : 6,
                            height: 6,
                            borderRadius: 4,
                            background: modalActiveImgIndex === idx ? '#006ce4' : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Hàng Thumbnail cuộn ngang */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 6,
                      paddingTop: 2,
                    }}
                  >
                    {roomPhotos.map((photo: any, idx: number) => {
                      const isActive = modalActiveImgIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setModalActiveImgIndex(idx)}
                          style={{
                            width: 76,
                            height: 56,
                            borderRadius: 8,
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: isActive ? '3px solid #006ce4' : '1px solid #e2e8f0',
                            boxShadow: isActive ? '0 0 0 1px #006ce4' : 'none',
                            opacity: isActive ? 1 : 0.7,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Col>

                {/* CỘT PHẢI: TÊN PHÒNG + BADGES + MÔ TẢ + TIỆN NGHI PHÂN NHÓM */}
                <Col xs={24} lg={11}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Tên phòng */}
                    <Title level={3} style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#1a1a1a' }}>
                      {room.room_name}
                    </Title>

                    {/* Badges bo viền phong cách Booking.com */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {badges.map((b, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#334155',
                          }}
                        >
                          <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {b}
                        </span>
                      ))}
                    </div>

                    {/* Dòng diện tích & giường */}
                    <div
                      style={{
                        marginBottom: 12,
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {room.area_sqm && (
                        <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                          <strong>Kích thước phòng:</strong> {room.area_sqm} m²
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: '#1e293b' }}>
                        <strong>{room.bed_info || '1 giường đôi lớn'}</strong> 🛏️
                      </div>
                      {bedRatingText && (
                        <div style={{ fontSize: 12, color: '#008009', marginTop: 4, fontWeight: 500 }}>
                          ★ {bedRatingText}
                        </div>
                      )}
                    </div>

                    {/* Đoạn mô tả phòng */}
                    {roomDesc && (
                      <Paragraph
                        style={{
                          fontSize: 13,
                          color: '#475569',
                          lineHeight: 1.6,
                          marginBottom: 14,
                        }}
                      >
                        {roomDesc}
                      </Paragraph>
                    )}

                    <Divider style={{ margin: '8px 0 14px 0' }} />

                    {/* Phân nhóm tiện nghi */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        maxHeight: 250,
                        overflowY: 'auto',
                        paddingRight: 6,
                        marginBottom: 16,
                      }}
                    >
                      {/* Trong phòng tắm riêng */}
                      {bathroomAmenities.length > 0 && (
                        <div>
                          <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                            Trong phòng tắm riêng của bạn:
                          </Text>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px' }}>
                            {bathroomAmenities.map((item, idx) => (
                              <div key={idx} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hướng tầm nhìn */}
                      {views.length > 0 && (
                        <div>
                          <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                            Hướng tầm nhìn:
                          </Text>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px' }}>
                            {views.map((item, idx) => (
                              <div key={idx} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tiện nghi phòng */}
                      {roomAmenities.length > 0 && (
                        <div>
                          <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                            Tiện nghi:
                          </Text>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px' }}>
                            {roomAmenities.slice(0, 16).map((item, idx) => (
                              <div key={idx} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hút thuốc */}
                      {smokingPolicy && (
                        <div>
                          <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                            Hút thuốc:
                          </Text>
                          <div style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {smokingPolicy}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Modal: Giá & Nút chọn phòng */}
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: 14,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Giá mỗi đêm</div>
                        <Text strong style={{ fontSize: 22, color: '#006ce4' }}>
                          {Number(room.base_price).toLocaleString('vi-VN')}đ
                        </Text>
                      </div>

                      {isBookingComHomestay ? (
                        <Button
                          type="primary"
                          size="large"
                          onClick={() => {
                            setRoomDetailModalOpen(false);
                            handleBooking();
                          }}
                          style={{
                            background: '#003580',
                            borderColor: '#003580',
                            fontWeight: 700,
                            borderRadius: 8,
                            padding: '0 24px',
                            height: 44,
                          }}
                        >
                          Đặt phòng này tại Booking.com ↗
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          size="large"
                          onClick={() => {
                            setSelectedRoom(room);
                            if (room.images?.[0]?.image_url) {
                              setActiveImage(room.images[0].image_url);
                            }
                            setRoomDetailModalOpen(false);
                            message.success(`Đã chọn phòng: ${room.room_name}`);
                          }}
                          style={{
                            background: '#006ce4',
                            borderColor: '#006ce4',
                            fontWeight: 700,
                            borderRadius: 8,
                            padding: '0 24px',
                            height: 44,
                          }}
                        >
                          {selectedRoom?.id === room.id ? '✓ Đang chọn phòng này' : 'Chọn phòng này'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
}
