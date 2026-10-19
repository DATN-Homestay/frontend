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

  // CHAT WITH HOST STATE
  const [chatOpen, setChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'host',
      text: 'Dạ em chào anh/chị ạ! Em là Hoàng Lan Anh - Chủ nhà của Mây Homestay Đà Lạt. Anh/chị đang quan tâm đến loại phòng nào hoặc có câu hỏi gì về lịch trình, tiện nghi cứ nhắn cho em nhé! 😊',
      timestamp: '10:00',
    },
  ]);

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

  // MOCK ABSA REVIEW SENTIMENT METRICS (REQ-019, BR-016)
  const absaMetrics = {
    average_rating: 4.8,
    total_reviews: 24,
    cleanliness: 4.9,
    noise_quiet: 4.8,
    host_service: 4.9,
    location: 4.7,
    ai_summary_vn:
      'Đa số khách hàng đánh giá cao sự sạch sẽ vượt trội (4.9/5), không gian cực kỳ yên tĩnh (4.8/5) và lòng hiếu khách của chị chủ nhà (4.9/5). Khu vực nướng BBQ ngoài trời có view ngắm hoàng hôn là điểm cộng lớn nhất. Đường lên dốc nhẹ nhưng xe ô tô 7 chỗ vào tận sân dễ dàng.',
  };

  // MOCK REALISTIC REVIEWS LIST (04_Thiet_ke_API_Specification.md: Phân hệ 9)
  const reviews: ReviewItem[] = [
    {
      id: 'rev-1',
      customer_name: 'Nguyễn Văn An',
      customer_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
      stay_date: 'Tháng 10/2026',
      rating_overall: 5,
      comment:
        'Homestay view đồi thông cực chill, phòng ốc sạch sẽ không một hạt bụi! Chị chủ nhà siêu nhiệt tình chuẩn bị sẵn than và vỉ nướng BBQ cho nhóm mình. Không gian cực kỳ yên tĩnh đúng như mong muốn, chắc chắn sẽ quay lại nhiều lần!',
      photos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600',
      ],
      created_at: '2026-10-14T15:30:00Z',
      host_reply: {
        content:
          'Dạ em cảm ơn anh An và các bạn đã lựa chọn Mây Homestay ạ! Rất vui vì anh/chị đã có kỳ nghỉ trọn vẹn tại Đà Lạt. Hẹn gặp lại nhóm mình lần tới nha!',
        created_at: '2026-10-14T17:00:00Z',
      },
    },
    {
      id: 'rev-2',
      customer_name: 'Trần Thị Mai Phương',
      customer_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
      stay_date: 'Tháng 10/2026',
      rating_overall: 5,
      comment:
        'Không gian yên tĩnh đúng như mô tả trên AI Search. Buổi tối săn mây và nướng thịt ngoài trời ngắm thành phố lên đèn tuyệt đẹp. Nước nóng và áp lực nước tắm rất mạnh, phòng thơm mùi tinh dầu gỗ thông nhẹ nhàng.',
      photos: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600'],
      created_at: '2026-10-11T10:15:00Z',
    },
    {
      id: 'rev-3',
      customer_name: 'Lê Minh Trí',
      customer_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
      stay_date: 'Tháng 09/2026',
      rating_overall: 4.5,
      comment:
        'Phòng Deluxe rộng rãi, nệm êm ái nằm không bị đau lưng. Đường vào homestay hơi dốc một chút nhưng xe ô tô 7 chỗ vào tận sân thoải mái. Chị chủ hỗ trợ nhóm mình nhận phòng sớm lúc 12h trưa mà không tính thêm phí.',
      created_at: '2026-09-28T09:40:00Z',
    },
  ];

  useEffect(() => {
    if (id) {
      loadDetail(id);
    }
  }, [id]);

  const loadDetail = async (homestayId: string) => {
    setLoading(true);
    const mockRooms: RoomItem[] = [
      {
        id: '101',
        homestay_id: homestayId,
        room_name: 'Phòng Deluxe Hướng Đồi (Deluxe Mountain View)',
        capacity: 2,
        base_price: 650000,
        bed_info: '1 Giường đôi Queen Size',
        area_sqm: 28,
        amenities: ['Ban công ngắm mây', 'Bồn tắm nằm', 'Điều hòa 2 chiều', 'Wifi 150Mbps', 'Máy sấy tóc'],
        images: [
          {
            id: '1',
            image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
            is_primary: 1,
            sort_order: 1,
          },
        ],
      },
      {
        id: '102',
        homestay_id: homestayId,
        room_name: 'Phòng Gia Đình Sân Hiên Riêng (Family Suite)',
        capacity: 4,
        base_price: 1150000,
        bed_info: '2 Giường đôi King Size',
        area_sqm: 48,
        amenities: ['Sân hiên nướng BBQ', 'Bếp nấu riêng', 'Smart TV 55 inch', 'Tủ lạnh lớn', 'View thung lũng'],
        images: [
          {
            id: '2',
            image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            is_primary: 1,
            sort_order: 1,
          },
        ],
      },
      {
        id: '103',
        homestay_id: homestayId,
        room_name: 'Bungalow Gỗ Thông Giữa Vườn Hoa (Cozy Cabin)',
        capacity: 3,
        base_price: 850000,
        bed_info: '1 Giường King + 1 Giường Sofa',
        area_sqm: 35,
        amenities: ['Lối đi riêng', 'Lò sưởi củi', 'Bàn trà ngoài trời', 'Bao gồm bữa sáng', 'Đỗ xe 7 chỗ'],
        images: [
          {
            id: '3',
            image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            is_primary: 1,
            sort_order: 1,
          },
        ],
      },
    ];

    try {
      const res: any = await customerService.getHomestayDetail(homestayId);
      const data = res?.data ?? res;
      // If backend returned homestay with rooms, enrich with mockRooms if empty
      const rooms = data?.rooms?.length ? data.rooms : mockRooms;
      setHomestay({ ...data, rooms });
      setSelectedRoom(rooms[0]);
      setActiveImage(null);
    } catch {
      // Mock fallback
      setHomestay({
        id: homestayId,
        name: 'Mây Homestay Đà Lạt',
        city: 'Đà Lạt',
        address: '123 Đường An Bình, Phường 3, Đà Lạt',
        latitude: 11.9404,
        longitude: 108.4583,
        average_rating: 4.8,
        total_reviews: 24,
        is_claimed: 1,
        cancellation_policy: 'FLEXIBLE',
        amenities_json: { wifi: true, bbq: true, kitchen: true, mountain_view: true },
        rooms: mockRooms,
      });
      setSelectedRoom(mockRooms[0]);
      setActiveImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    if (!selectedRoom) {
      message.warning('Vui lòng chọn một loại phòng');
      return;
    }
    const checkIn = dateRange?.[0] || '2026-10-20';
    const checkOut = dateRange?.[1] || '2026-10-22';
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
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600';

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
                      border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      boxShadow: isSelected ? '0 4px 14px rgba(99, 102, 241, 0.15)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 18,
                      alignItems: 'center',
                    }}
                  >
                    {/* Room Thumbnail */}
                    <div style={{ width: 150, height: 110, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                      <img
                        src={roomImg}
                        alt={r.room_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Room Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 16, color: isSelected ? '#4338ca' : '#1e293b' }}>
                          {r.room_name}
                        </Text>
                        {isSelected && <Tag color="purple">Đang chọn</Tag>}
                      </div>

                      <Space size={10} style={{ color: '#64748b', fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span>
                          <TeamOutlined style={{ color: '#6366f1' }} /> {r.capacity} khách
                        </span>
                        {r.bed_info && <span>• {r.bed_info}</span>}
                        {r.area_sqm && <span>• {r.area_sqm} m²</span>}
                      </Space>

                      {/* Room Amenities Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(r.amenities || ['Ban công ngắm đồi', 'Bếp nướng BBQ', 'Wifi tốc độ cao']).map(
                          (a, idx) => (
                            <Tag
                              key={idx}
                              style={{
                                margin: 0,
                                fontSize: 11,
                                background: isSelected ? '#ede9fe' : '#f1f5f9',
                                border: 'none',
                                color: isSelected ? '#5b21b6' : '#475569',
                              }}
                            >
                              {a}
                            </Tag>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Room Price & Button */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 140 }}>
                      <Text strong style={{ fontSize: 20, color: '#6366f1' }}>
                        {Number(r.base_price).toLocaleString('vi-VN')}đ
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 10 }}>
                        /đêm
                      </Text>
                      <Button
                        type={isSelected ? 'primary' : 'default'}
                        size="middle"
                        style={{
                          borderRadius: 8,
                          background: isSelected ? '#6366f1' : undefined,
                          borderColor: isSelected ? '#6366f1' : '#cbd5e1',
                          fontWeight: 600,
                        }}
                      >
                        {isSelected ? '✓ Đang chọn' : 'Chọn phòng'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160"
                    size={56}
                    style={{ border: '2px solid #6366f1' }}
                  />
                </Badge>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 16, color: '#1e293b' }}>
                      Chủ nhà: Chị Hoàng Lan Anh
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
            title={
              <Space>
                <StarFilled style={{ color: '#f59e0b' }} />
                <span>Đánh giá từ khách hàng ({absaMetrics.total_reviews} lượt)</span>
              </Space>
            }
            style={{ borderRadius: 16, marginBottom: 32 }}
          >
            {/* AI ABSA INSIGHT BANNER */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                padding: '20px',
                borderRadius: 14,
                border: '1px solid #c4b5fd',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                  }}
                >
                  <RobotOutlined />
                </div>
                <div>
                  <Text strong style={{ color: '#4338ca', fontSize: 15 }}>
                    AI Tóm tắt Đánh giá Đa khía cạnh (ABSA Insight)
                  </Text>
                  <Tag color="purple" style={{ marginLeft: 8 }}>
                    Cập nhật tự động 00:00 hàng ngày
                  </Tag>
                </div>
              </div>
              <Paragraph style={{ color: '#334155', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {absaMetrics.ai_summary_vn}
              </Paragraph>
            </div>

            {/* 4 ASPECT-BASED RATINGS METRICS */}
            <Row gutter={[24, 16]} style={{ marginBottom: 28 }}>
              <Col xs={24} sm={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13 }}>Vệ sinh (Cleanliness)</Text>
                  <Text strong style={{ color: '#6366f1' }}>{absaMetrics.cleanliness} / 5.0</Text>
                </div>
                <Progress percent={Math.round((absaMetrics.cleanliness / 5) * 100)} showInfo={false} strokeColor="#6366f1" />
              </Col>

              <Col xs={24} sm={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13 }}>Độ yên tĩnh & Không gian (Noise/Quiet)</Text>
                  <Text strong style={{ color: '#6366f1' }}>{absaMetrics.noise_quiet} / 5.0</Text>
                </div>
                <Progress percent={Math.round((absaMetrics.noise_quiet / 5) * 100)} showInfo={false} strokeColor="#6366f1" />
              </Col>

              <Col xs={24} sm={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13 }}>Dịch vụ & Thái độ Chủ nhà (Service)</Text>
                  <Text strong style={{ color: '#6366f1' }}>{absaMetrics.host_service} / 5.0</Text>
                </div>
                <Progress percent={Math.round((absaMetrics.host_service / 5) * 100)} showInfo={false} strokeColor="#6366f1" />
              </Col>

              <Col xs={24} sm={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13 }}>Vị trí & Đường đi (Location)</Text>
                  <Text strong style={{ color: '#6366f1' }}>{absaMetrics.location} / 5.0</Text>
                </div>
                <Progress percent={Math.round((absaMetrics.location / 5) * 100)} showInfo={false} strokeColor="#6366f1" />
              </Col>
            </Row>

            <Divider style={{ margin: '20px 0' }} />

            {/* REVIEWS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {reviews.map((rev) => (
                <div key={rev.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Space size="middle">
                      <Avatar src={rev.customer_avatar} icon={<UserOutlined />} size={44} />
                      <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>
                          {rev.customer_name}
                        </Text>
                        <Space size={6}>
                          <Tag color="cyan" style={{ fontSize: 11, border: 'none' }}>
                            <CheckOutlined /> Khách đã lưu trú ({rev.stay_date})
                          </Tag>
                        </Space>
                      </div>
                    </Space>

                    <Rate disabled defaultValue={rev.rating_overall} style={{ fontSize: 14, color: '#f59e0b' }} />
                  </div>

                  <Paragraph style={{ color: '#334155', fontSize: 14, lineHeight: 1.6, margin: '8px 0 12px' }}>
                    {rev.comment}
                  </Paragraph>

                  {/* REVIEW ATTACHED PHOTOS */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <Image.PreviewGroup>
                        {rev.photos.map((photo, pIdx) => (
                          <Image
                            key={pIdx}
                            src={photo}
                            width={110}
                            height={80}
                            style={{ borderRadius: 8, objectFit: 'cover' }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  )}

                  {/* HOST REPLY */}
                  {rev.host_reply && (
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: 10,
                        borderLeft: '3px solid #6366f1',
                        marginTop: 10,
                      }}
                    >
                      <Text strong style={{ color: '#4338ca', fontSize: 13, display: 'block', marginBottom: 2 }}>
                        Phản hồi từ Chủ nhà (Host)
                      </Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {rev.host_reply.content}
                      </Text>
                    </div>
                  )}
                </div>
              ))}
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
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160"
                size={40}
                style={{ border: '2px solid #6366f1' }}
              />
            </Badge>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block' }}>
                Chị Hoàng Lan Anh
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                🟢 Đang trực tuyến • Host {homestay.name}
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
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160"
                    size={32}
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
    </div>
  );
}
