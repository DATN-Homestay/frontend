import { useState, useEffect, useMemo } from 'react';
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
  Progress,
  Image,
  Drawer,
  Input,
  Badge,
  Modal,
} from 'antd';
import {
  StarFilled,
  EnvironmentOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  RobotOutlined,
  UserOutlined,
  CheckOutlined,
  MessageOutlined,
  SendOutlined,
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
} from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { HomestayItem, RoomItem } from '../../types/customer';
import { getHomestayCoverImage, getAllHomestayImages } from '../../utils/imageHelper';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface ReviewItem {
  id: string;
  customer_name: string;
  customer_avatar: string;
  stay_date: string;
  rating_overall: number;
  comment: string;
  photos?: string[];
  created_at: string;
  host_reply?: {
    content: string;
    created_at: string;
  };
}

interface ChatMessage {
  id: string;
  sender: 'host' | 'customer';
  text: string;
  timestamp: string;
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const initialCoverFromState = (location.state as any)?.coverImage;

  const [homestay, setHomestay] = useState<HomestayItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(initialCoverFromState || null);

  // ROOM DETAIL MODAL STATE
  const [roomDetailModalOpen, setRoomDetailModalOpen] = useState(false);
  const [activeDetailRoom, setActiveDetailRoom] = useState<RoomItem | null>(null);
  const [modalActiveImgIndex, setModalActiveImgIndex] = useState(0);

  const handleOpenRoomDetail = (room: RoomItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveDetailRoom(room);
    setModalActiveImgIndex(0);
    setRoomDetailModalOpen(true);
  };

  // CHAT WITH HOST STATE
  const [chatOpen, setChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'host',
      text: 'Dạ em chào anh/chị ạ! Chào mừng anh/chị đến với cơ sở lưu trú của chúng em. Anh/chị đang quan tâm đến loại phòng nào hoặc có câu hỏi gì về lịch trình, tiện nghi cứ nhắn cho em nhé! 😊',
      timestamp: '10:00',
    },
  ]);

  useEffect(() => {
    if (homestay?.name) {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'm1') {
          return [
            {
              id: 'm1',
              sender: 'host',
              text: `Dạ em chào anh/chị ạ! Chào mừng anh/chị đến với ${homestay.name}. Anh/chị đang quan tâm đến loại phòng nào hoặc có câu hỏi gì về phòng ốc, tiện nghi cứ nhắn cho em nhé! 😊`,
              timestamp: '10:00',
            },
          ];
        }
        return prev;
      });
    }
  }, [homestay?.name]);

  const quickQuestions = [
    '🚗 Homestay có chỗ đỗ ô tô 7 chỗ an toàn không?',
    '⏰ Nhóm mình có thể nhận phòng sớm lúc 11h30 không?',
    '🥩 Có sẵn bếp và than nướng BBQ ngoài trời không?',
    '🐶 Nhà mình có nhận mang theo cún cưng không?',
  ];

  const handleSendMessage = (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;
    const newMsg: ChatMessage = {
      id: 'm_' + Date.now(),
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    if (!customText) setInputText('');

    // Simulate smart reply from host
    setTimeout(() => {
      let reply = 'Dạ em cảm ơn anh/chị! Em đã ghi nhận câu hỏi và sẽ hỗ trợ chu đáo nhất cho chuyến đi của mình ạ.';
      if (textToSend.includes('đỗ ô tô') || textToSend.includes('7 chỗ')) {
        reply = 'Dạ sân homestay rất rộng rãi, xe ô tô 7 chỗ và 16 chỗ vào quay đầu tận sân hoàn toàn miễn phí và có camera an ninh 24/7 anh/chị yên tâm nhé ạ!';
      } else if (textToSend.includes('sớm') || textToSend.includes('11h')) {
        reply = 'Dạ nếu hôm đó phòng trống sớm em sẽ hỗ trợ anh/chị nhận phòng trước lúc 11h30 mà không tính thêm bất kỳ phụ phí nào ạ!';
      } else if (textToSend.includes('BBQ') || textToSend.includes('nướng')) {
        reply = 'Dạ sân nướng BBQ ngoài trời bên em có sẵn bếp, vỉ nướng, bàn ghế view đồi thông. Em chuẩn bị sẵn than sạch nếu nhóm mình cần luôn ạ.';
      } else if (textToSend.includes('cún') || textToSend.includes('thú cưng')) {
        reply = 'Dạ homestay rất thân thiện với thú cưng (Pet-friendly) và hoàn toàn miễn phí, chỉ cần bé ngoan và giữ vệ sinh chung là được ạ! 🐾';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'm_' + (Date.now() + 1),
          sender: 'host',
          text: reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 700);
  };

  useEffect(() => {
    if (id) {
      loadDetail(id);
    }
  }, [id]);

  const loadDetail = async (homestayId: string) => {
    setLoading(true);
    try {
      const res: any = await customerService.getHomestayDetail(homestayId);
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
          amenities: data.amenities_json?.popular_facilities?.slice(0, 5) || ['Wifi miễn phí', 'Phòng tắm riêng'],
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
    } catch (err: any) {
      message.error('Không tìm thấy thông tin homestay hoặc kết nối máy chủ gián đoạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    if (!selectedRoom) {
      message.warning('Vui lòng chọn một loại phòng');
      return;
    }
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning('Vui lòng chọn ngày nhận phòng và trả phòng');
      return;
    }
    const checkIn = dateRange[0];
    const checkOut = dateRange[1];
    navigate(
      `/checkout?roomId=${selectedRoom.id}&homestayId=${homestay?.id}&checkIn=${checkIn}&checkOut=${checkOut}`,
    );
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
  const reviewScores = amenitiesData.review_scores || {
    cleanliness: 9.3,
    comfort: 9.4,
    facilities: 9.0,
    location: 8.9,
    staff: 9.5,
    value_for_money: 9.2,
    wifi: 9.6,
  };

  const groupedFacilities: Record<string, string[]> =
    amenitiesData.grouped_facilities && Object.keys(amenitiesData.grouped_facilities).length > 0
      ? amenitiesData.grouped_facilities
      : {
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
        };

  const popularFacilities: string[] =
    amenitiesData.popular_facilities && amenitiesData.popular_facilities.length > 0
      ? amenitiesData.popular_facilities
      : amenitiesData.items || [
          'WiFi miễn phí',
          'Chỗ đỗ xe miễn phí',
          'Xe đưa đón sân bay',
          'Phòng không hút thuốc',
          'Lễ tân 24 giờ',
          'Nhà hàng',
          'Sân vườn',
          'Hệ thống sưởi',
          'Máy pha trà/cà phê trong tất cả các phòng',
        ];

  const overallRating10 = Number(
    (homestay.average_rating
      ? homestay.average_rating > 5
        ? homestay.average_rating
        : homestay.average_rating * 2
      : 9.1
    ).toFixed(1),
  );
  const overallRatingStr = overallRating10.toFixed(1).replace('.', ',');
  const scoreWord = overallRating10 >= 9.0 ? 'Tuyệt hảo' : overallRating10 >= 8.0 ? 'Rất tốt' : 'Hài lòng';

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
            <Tag color="blue">Booking.com Verified</Tag>
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
        <Title level={2} style={{ margin: 0 }}>
          {homestay.name}
        </Title>
        <Text type="secondary">
          <EnvironmentOutlined /> {homestay.address} •{' '}
          <StarFilled style={{ color: '#f59e0b' }} /> {homestay.average_rating} ({homestay.total_reviews} đánh giá)
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
              <Tag
                color="default"
                style={{
                  position: 'absolute',
                  bottom: 14,
                  left: 14,
                  fontWeight: 600,
                  background: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                }}
              >
                📸 {allImages.length || 1} ảnh thật từ Booking.com
              </Tag>
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
          {/* ROOM SELECTION LIST */}
          <Card
            id="rooms-section"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <HomeOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                  <span style={{ fontWeight: 600 }}>Các hạng phòng khả dụng ({homestay.rooms?.length || 0} loại phòng)</span>
                </Space>
                <Tag color="cyan">Giá minh bạch • Đã gồm bảo đảm Escrow 24h</Tag>
              </div>
            }
            style={{ borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {homestay.rooms?.map((r) => {
                const isSelected = selectedRoom?.id === r.id;
                const roomImg =
                  r.images?.[0]?.image_url ||
                  getHomestayCoverImage(homestay);
                const roomPhotoCount = r.images?.length || 0;
                const roomBadges = r.room_details_json?.badges?.slice(0, 5) ||
                  (r.amenities && r.amenities.length > 0 ? r.amenities.slice(0, 5) : ['Phòng tắm riêng', 'WiFi miễn phí', 'TV màn hình phẳng']);

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRoom(r);
                      if (r.images?.[0]?.image_url) {
                        setActiveImage(r.images[0].image_url);
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
                <Text style={{ color: '#008009', fontWeight: 500, fontSize: 14, display: 'block', marginTop: 4 }}>
                  Tiện nghi tuyệt vời! Điểm đánh giá: {Number(reviewScores.facilities || 9.0).toFixed(0)}
                </Text>
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

            <Divider style={{ margin: '20px 0' }} />

            {/* Grouped Facilities Multi-Column List matching Screenshot 2 */}
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
          </Card>

          {/* HOST PROFILE & DIRECT CHAT CARD */}
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
                onClick={() => setChatOpen(true)}
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
                <span>Đánh giá từ khách hàng ({homestay.total_reviews || absaMetrics.total_reviews} lượt)</span>
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
                        background: '#003b95',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 18,
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
                        · {homestay.total_reviews || 573} đánh giá
                      </span>
                      <span
                        onClick={() => {
                          const el = document.getElementById('user-comments-list');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ color: '#006ce4', fontSize: 14, marginLeft: 12, cursor: 'pointer', fontWeight: 500 }}
                      >
                        Đọc tất cả đánh giá
                      </span>
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
                  const scoreVal = Number(item.score || 9.0);
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
            </div>

            <Divider style={{ margin: '24px 0' }} />

            {/* REVIEWS LIST */}
            <div id="user-comments-list" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {homestay.reviews && homestay.reviews.length > 0 ? (
                homestay.reviews.map((rev: any) => (
                  <div key={rev.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Space size="middle">
                        <Avatar style={{ backgroundColor: '#003b95' }} icon={<UserOutlined />} size={44} />
                        <div>
                          <Text strong style={{ fontSize: 15, display: 'block' }}>
                            {rev.customer?.name || 'Khách lưu trú'}
                          </Text>
                          <Space size={6}>
                            <Tag color="cyan" style={{ fontSize: 11, border: 'none' }}>
                              <CheckOutlined /> Khách đã lưu trú
                            </Tag>
                          </Space>
                        </div>
                      </Space>

                      <Rate disabled defaultValue={rev.rating_overall || 5} style={{ fontSize: 14, color: '#f59e0b' }} />
                    </div>

                    <Paragraph style={{ color: '#334155', fontSize: 14, lineHeight: 1.6, margin: '8px 0 12px' }}>
                      {rev.comment}
                    </Paragraph>
                  </div>
                ))
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
                onChange={(_, dateStrings) => setDateRange([dateStrings[0], dateStrings[1]])}
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleBooking}
              style={{
                height: 48,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              Đặt phòng ngay
            </Button>

            <Button
              size="large"
              block
              icon={<MessageOutlined />}
              onClick={() => setChatOpen(true)}
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

            <Text
              type="secondary"
              style={{ fontSize: 12, textAlign: 'center', display: 'block', marginTop: 14 }}
            >
              🛡️ Bảo vệ thanh toán: Giữ tiền trong Escrow 24h
            </Text>
          </Card>
        </Col>
      </Row>

      {/* CHAT WITH HOST DRAWER */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Badge dot status="success" offset={[-4, 32]}>
              <Avatar
                size={40}
                style={{ backgroundColor: '#003b95', border: '2px solid #6366f1', color: '#fff' }}
                icon={<UserOutlined />}
              />
            </Badge>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block' }}>
                {homestay.host?.name || `Đại diện ${homestay.name}`}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                🟢 Đang trực tuyến • Quản lý {homestay.name}
              </Text>
            </div>
          </div>
        }
        placement="right"
        onClose={() => setChatOpen(false)}
        open={chatOpen}
        width={450}
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            height: '100%',
          },
        }}
      >
        {/* ROOM CONTEXT BAR */}
        <div
          style={{
            background: '#f8fafc',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Hạng phòng đang quan tâm:</Text>
          <Text strong style={{ fontSize: 13, color: '#4338ca' }}>
            {selectedRoom?.room_name || 'Phòng Deluxe Hướng Đồi'} ({(selectedRoom?.base_price || 650000).toLocaleString('vi-VN')}đ/đêm)
          </Text>
        </div>

        {/* QUICK QUESTION PILLS (AI SMART REPLY) */}
        <div style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
            💡 Gợi ý câu hỏi nhanh (AI Smart Reply):
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickQuestions.map((q, idx) => (
              <Tag
                key={idx}
                onClick={() => handleSendMessage(q)}
                style={{
                  cursor: 'pointer',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  background: '#f1f5f9',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  margin: 0,
                  transition: 'all 0.2s',
                }}
              >
                {q}
              </Tag>
            ))}
          </div>
        </div>

        <Divider style={{ margin: '10px 0' }} />

        {/* MESSAGE BUBBLES STREAM */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingRight: 4,
            marginBottom: 16,
          }}
        >
          {messages.map((m) => {
            const isHost = m.sender === 'host';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: isHost ? 'flex-start' : 'flex-end',
                  gap: 8,
                }}
              >
                {isHost && (
                  <Avatar
                    size={32}
                    style={{ backgroundColor: '#003b95', color: '#fff' }}
                    icon={<UserOutlined />}
                  />
                )}
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: isHost ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                    background: isHost ? '#f1f5f9' : '#6366f1',
                    color: isHost ? '#1e293b' : '#ffffff',
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div>{m.text}</div>
                  <div
                    style={{
                      fontSize: 10,
                      textAlign: isHost ? 'left' : 'right',
                      marginTop: 4,
                      color: isHost ? '#94a3b8' : '#e0e7ff',
                    }}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MESSAGE INPUT */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
          <Input
            placeholder="Nhập câu hỏi cho Chủ nhà..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPressEnter={() => handleSendMessage()}
            style={{ borderRadius: 8, height: 40 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSendMessage()}
            style={{
              borderRadius: 8,
              height: 40,
              background: '#6366f1',
              fontWeight: 600,
            }}
          >
            Gửi
          </Button>
        </div>
      </Drawer>

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
          content: { borderRadius: 12, overflow: 'hidden', padding: 0 },
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
            ? room.images.map((img) => img.image_url)
            : (homestay?.images?.map((img) => img.image_url) || [getHomestayCoverImage(homestay)]);

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
                      {roomPhotos.map((_, idx) => (
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
                    {roomPhotos.map((photo, idx) => {
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
