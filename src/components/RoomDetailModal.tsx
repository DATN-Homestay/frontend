import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Typography, Button, Divider, Spin } from 'antd';
import { LeftOutlined, RightOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import type { RoomItem, RoomDetailsJson, RoomImageItem, HomestayItem } from '../types/customer';

const { Title, Text, Paragraph } = Typography;

export interface RoomDetailModalProps {
  open: boolean;
  onClose: () => void;
  homestayId?: string;
  homestayName?: string;
  room?:
    | RoomItem
    | {
        id: string;
        room_name: string;
        capacity?: number;
        base_price?: number;
        area_sqm?: number | null;
        bed_info?: string | null;
        description?: string | null;
        room_details_json?: RoomDetailsJson | null;
        images?: RoomImageItem[];
      }
    | null;
}

export default function RoomDetailModal({
  open,
  onClose,
  homestayId,
  homestayName,
  room,
}: RoomDetailModalProps) {
  const navigate = useNavigate();
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [homestayDetail, setHomestayDetail] = useState<HomestayItem | null>(null);
  const [loadingHomestay, setLoadingHomestay] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveImgIndex(0);
      return;
    }

    if (homestayId) {
      setLoadingHomestay(true);
      customerService
        .getHomestayDetail(homestayId)
        .then((res: any) => {
          const data = res?.data ?? res;
          setHomestayDetail(data);
        })
        .catch(() => {
          // Bỏ qua lỗi, dùng dữ liệu phòng hiện có
        })
        .finally(() => {
          setLoadingHomestay(false);
        });
    } else {
      setHomestayDetail(null);
    }
  }, [open, homestayId]);

  if (!room && !homestayDetail) {
    return null;
  }

  // Tìm phòng khớp trong homestayDetail nếu có
  const matchedRoom: any =
    homestayDetail?.rooms?.find(
      (r) => r.id === room?.id || r.room_name === room?.room_name,
    ) || room;

  const roomName = matchedRoom?.room_name || room?.room_name || 'Phòng nghỉ';
  const effectiveHomestayName = homestayDetail?.name || homestayName || 'Homestay';

  // Thu thập danh sách ảnh phòng
  const directRoomImages = (matchedRoom?.images || room?.images || [])
    .map((img: any) => (typeof img === 'string' ? img : img.image_url))
    .filter(Boolean);

  const homestayPropImages =
    (homestayDetail?.amenities_json?.property_images as string[]) ||
    homestayDetail?.images?.map((img: any) => img.image_url) ||
    [];

  const roomPhotos: string[] =
    directRoomImages.length > 0
      ? directRoomImages
      : homestayPropImages.length > 0
        ? homestayPropImages
        : [
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          ];

  const details: RoomDetailsJson = matchedRoom?.room_details_json || room?.room_details_json || {};

  const areaSqm = matchedRoom?.area_sqm || room?.area_sqm || 24;
  const bedInfo = matchedRoom?.bed_info || room?.bed_info || '1 giường đôi lớn';
  const capacity = matchedRoom?.capacity || room?.capacity || 2;

  const badges = details.badges || [
    `${areaSqm} m²`,
    bedInfo,
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
    'Bồn tắm hoặc vòi sen',
  ];

  const views = details.views || ['Nhìn ra thành phố', 'Nhìn ra sân vườn'];

  const roomAmenities = details.room_amenities || [
    'Bộ khăn trải giường',
    'Ấm đun nước điện',
    'Ổ cắm gần giường',
    'TV màn hình phẳng',
    'Tủ lạnh / Minibar',
    'Bàn làm việc',
    'Tủ quần áo',
    'Điều hòa nhiệt độ',
    'Cách âm',
  ];

  const smokingPolicy = details.smoking_policy || 'Không hút thuốc';
  const bedRatingText =
    details.bed_rating_text ||
    'Chỗ nghỉ này có giường được đánh giá là rất thoải mái (9,0/10 dựa trên đánh giá thực tế)';
  const roomDesc =
    matchedRoom?.description ||
    room?.description ||
    `Phòng nghỉ tiện nghi hiện đại với diện tích ${areaSqm}m², trang bị ${bedInfo}, view thoáng mát. Phòng tắm riêng có vòi sen, máy sấy tóc và đồ vệ sinh cá nhân miễn phí. Có ${smokingPolicy.toLowerCase()}.`;

  const currentImgUrl = roomPhotos[activeImgIndex] || roomPhotos[0];

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev === 0 ? roomPhotos.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev === roomPhotos.length - 1 ? 0 : prev + 1));
  };

  const handleGoToHomestay = () => {
    if (homestayId) {
      onClose();
      navigate(`/homestay/${homestayId}`);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1020}
      centered
      destroyOnHidden
      styles={{
        body: { padding: 0, maxHeight: '88vh', overflowY: 'auto' },
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
      <div style={{ padding: '24px 28px', background: '#ffffff' }}>
        {/* Header thông tin homestay */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
              <HomeOutlined />
              <span>{effectiveHomestayName}</span>
              {homestayDetail?.city && <span>• {homestayDetail.city}</span>}
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
              {roomName}
            </Title>
          </div>
          {homestayId && (
            <Button
              type="primary"
              ghost
              icon={<HomeOutlined />}
              onClick={handleGoToHomestay}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Xem trang Homestay ↗
            </Button>
          )}
        </div>

        {loadingHomestay && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Spin size="small" /> <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>Đang cập nhật thêm tiện nghi phòng...</Text>
          </div>
        )}

        <Row gutter={[28, 24]}>
          {/* CỘT TRÁI: GALLERY ẢNH */}
          <Col xs={24} lg={13}>
            {/* Ảnh chính */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 360,
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
                alt={roomName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'opacity 0.2s ease',
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
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.94)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#1e293b',
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
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.94)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#1e293b',
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
                  padding: '3px 10px',
                  borderRadius: 14,
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {activeImgIndex + 1} / {roomPhotos.length}
              </div>
            </div>

            {/* Dots */}
            {roomPhotos.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  marginBottom: 10,
                }}
              >
                {roomPhotos.slice(0, 10).map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImgIndex(idx)}
                    style={{
                      width: activeImgIndex === idx ? 18 : 6,
                      height: 6,
                      borderRadius: 4,
                      background: activeImgIndex === idx ? '#4f46e5' : '#cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Dải Thumbnail */}
            {roomPhotos.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  paddingTop: 2,
                }}
              >
                {roomPhotos.map((photo, idx) => {
                  const isActive = activeImgIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      style={{
                        width: 72,
                        height: 52,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: isActive ? '3px solid #4f46e5' : '1px solid #e2e8f0',
                        opacity: isActive ? 1 : 0.7,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src={photo}
                        alt={`Ảnh ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Col>

          {/* CỘT PHẢI: CHI TIẾT & TIỆN NGHI */}
          <Col xs={24} lg={11}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Badges tiêu chuẩn */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {badges.map((b, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
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
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#334155',
                  }}
                >
                  <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> Tối đa {capacity} khách
                </span>
              </div>

              {/* Thông tin diện tích & giường */}
              <div
                style={{
                  marginBottom: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                  <strong>Kích thước phòng:</strong> {areaSqm} m²
                </div>
                <div style={{ fontSize: 13, color: '#1e293b' }}>
                  <strong>Thông tin giường:</strong> {bedInfo} 🛏️
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
                    marginBottom: 12,
                  }}
                >
                  {roomDesc}
                </Paragraph>
              )}

              <Divider style={{ margin: '6px 0 12px 0' }} />

              {/* Phân nhóm tiện nghi */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 220,
                  overflowY: 'auto',
                  paddingRight: 6,
                  marginBottom: 16,
                }}
              >
                {/* Trong phòng tắm riêng */}
                {bathroomAmenities.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                      Trong phòng tắm riêng:
                    </Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px' }}>
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
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                      Hướng tầm nhìn:
                    </Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px' }}>
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
                    <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                      Tiện nghi phòng:
                    </Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px' }}>
                      {roomAmenities.map((item, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#008009', fontWeight: 'bold' }}>✓</span> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
                <Button onClick={onClose} style={{ borderRadius: 8 }}>
                  Đóng
                </Button>
                {homestayId && (
                  <Button
                    type="primary"
                    onClick={handleGoToHomestay}
                    style={{ background: '#4f46e5', borderRadius: 8, fontWeight: 600 }}
                  >
                    Xem toàn bộ Homestay
                  </Button>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
}
