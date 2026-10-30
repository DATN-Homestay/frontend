import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Typography,
  Card,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  message,
  Popconfirm,
  Badge,
  Avatar,
  Row,
  Col,
  Upload,
  Progress,
  Tooltip,
  Tabs,
  Alert,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  PlusOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  CompassOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  PictureOutlined,
  UserOutlined,
  StarOutlined,
  StarFilled,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hostService } from '../../services/hostService';
import { VIETNAM_LOCATIONS } from '../../data/vietnamLocations';
import type { HostHomestay } from '../../types/host';
import type { RoomItem, RoomImageItem } from '../../types/customer';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const MAX_HOMESTAY_PHOTOS = 100;

const AMENITY_OPTIONS = [
  'Wifi tốc độ cao',
  'Bếp nấu đầy đủ dụng cụ',
  'Bếp nướng BBQ ngoài trời',
  'Hồ bơi riêng',
  'Điều hòa 2 chiều',
  'Máy giặt',
  'Bãi đỗ xe ô tô miễn phí',
  'Ban công view núi / đồi',
  'Cho phép mang thú cưng',
  'Bàn làm việc yên tĩnh',
];

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<HostHomestay[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Homestay
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingHomestay, setEditingHomestay] = useState<HostHomestay | null>(null);
  const [homestayFileList, setHomestayFileList] = useState<UploadFile[]>([]);
  const [mainImageUrl, setMainImageUrl] = useState<string>('');

  // Modal Phòng
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [selectedHomestayId, setSelectedHomestayId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomFileList, setRoomFileList] = useState<UploadFile[]>([]);

  // Modal Ảnh phòng chi tiết
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ homestay: HostHomestay; room: RoomItem } | null>(null);
  const [roomBatchUploading, setRoomBatchUploading] = useState(false);

  // Image Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const [form] = Form.useForm();
  const [roomForm] = Form.useForm();
  const [imageForm] = Form.useForm();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await hostService.getMyListings();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setData(list);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Tính thống kê số lượng ảnh của homestay (ảnh homestay + ảnh tất cả các phòng)
  const getHomestayPhotoStats = (homestay: HostHomestay) => {
    const propertyImages = (homestay.amenities_json?.property_images as string[]) || [];
    const roomImagesCount = (homestay.rooms || []).reduce((sum, r) => sum + (r.images?.length || 0), 0);
    const total = propertyImages.length + roomImagesCount;
    return {
      propertyCount: propertyImages.length,
      roomCount: roomImagesCount,
      total,
      remaining: Math.max(0, MAX_HOMESTAY_PHOTOS - total),
    };
  };

  // Preview ảnh
  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || (file.preview as string) || (file.response as any)?.url || '');
    setPreviewOpen(true);
    setPreviewTitle(file.name || 'Xem trước ảnh');
  };

  // Tự động lấy tọa độ GPS từ trình duyệt
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      message.error('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }
    message.loading({ content: 'Đang định vị tọa độ GPS thực tế...', key: 'gps' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setFieldsValue({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        message.success({ content: 'Đã lấy tọa độ GPS thực địa thành công!', key: 'gps' });
      },
      () => {
        message.error({ content: 'Không thể truy cập GPS thiết bị. Vui lòng nhập tay tọa độ.', key: 'gps' });
      },
      { timeout: 8000 },
    );
  };

  // Tạo hoặc Cập nhật Homestay
  const handleSaveHomestay = async (values: any) => {
    try {
      const uploadedUrls = homestayFileList
        .map((f) => f.url || (f.response as any)?.url)
        .filter(Boolean) as string[];

      // Kiểm tra tổng số ảnh
      const currentRoomImagesCount = editingHomestay
        ? (editingHomestay.rooms || []).reduce((sum, r) => sum + (r.images?.length || 0), 0)
        : 0;

      if (uploadedUrls.length + currentRoomImagesCount > MAX_HOMESTAY_PHOTOS) {
        message.error(
          `Homestay này hiện có ${currentRoomImagesCount} ảnh phòng. Bạn chỉ có thể đăng tối đa ${
            MAX_HOMESTAY_PHOTOS - currentRoomImagesCount
          } ảnh khuôn viên homestay (Tối đa ${MAX_HOMESTAY_PHOTOS} ảnh toàn homestay).`,
        );
        return;
      }

      const effectiveMainImage = mainImageUrl || uploadedUrls[0] || '';

      const payload = {
        name: values.name,
        city: values.city,
        address: values.address,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        cancellation_policy: values.cancellation_policy || 'FLEXIBLE',
        amenities_json: {
          items: values.amenities || [],
          property_images: uploadedUrls,
          main_image_url: effectiveMainImage,
        },
        property_images: uploadedUrls,
        main_image_url: effectiveMainImage,
      };

      if (editingHomestay) {
        await hostService.updateHomestay(editingHomestay.id, payload as any);
        message.success('Cập nhật chỗ nghỉ thành công!');
      } else {
        await hostService.createHomestay(payload as any);
        message.success('Đăng ký chỗ nghỉ mới thành công!');
      }

      setCreateModalOpen(false);
      setEditingHomestay(null);
      setHomestayFileList([]);
      setMainImageUrl('');
      form.resetFields();
      loadListings();
    } catch (err: any) {
      message.error(err.message || 'Thao tác thất bại');
    }
  };

  // Xóa Homestay
  const handleDeleteHomestay = async (id: string) => {
    try {
      await hostService.deleteHomestay(id);
      message.success('Đã xóa chỗ nghỉ thành công');
      loadListings();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  // Thêm hoặc Cập nhật Phòng
  const handleSaveRoom = async (values: any) => {
    try {
      const imageUrls = roomFileList
        .map((f) => f.url || (f.response as any)?.url)
        .filter(Boolean) as string[];

      // Tìm homestay cha để kiểm tra giới hạn 100 ảnh
      const parentHomestay = data.find((h) => h.id === selectedHomestayId);
      if (parentHomestay) {
        const stats = getHomestayPhotoStats(parentHomestay);
        const existingRoomImages = editingRoomId
          ? (parentHomestay.rooms?.find((r) => r.id === editingRoomId)?.images?.length || 0)
          : 0;
        const projectedTotal = stats.total - existingRoomImages + imageUrls.length;
        if (projectedTotal > MAX_HOMESTAY_PHOTOS) {
          message.error(
            `Tổng số ảnh của toàn homestay sẽ thành ${projectedTotal} (vượt quá giới hạn tối đa ${MAX_HOMESTAY_PHOTOS} ảnh). Vui lòng giảm bớt ảnh phòng!`,
          );
          return;
        }
      }

      if (editingRoomId) {
        await hostService.updateRoom(editingRoomId, {
          room_name: values.room_name,
          capacity: Number(values.capacity),
          base_price: Number(values.base_price),
          images: imageUrls,
        });
        message.success('Cập nhật thông tin phòng thành công!');
      } else if (selectedHomestayId) {
        await hostService.createRoom(selectedHomestayId, {
          room_name: values.room_name,
          capacity: Number(values.capacity),
          base_price: Number(values.base_price),
          images: imageUrls,
        });
        message.success('Thêm phòng mới kèm ảnh thành công!');
      }

      setRoomModalOpen(false);
      setEditingRoomId(null);
      setRoomFileList([]);
      roomForm.resetFields();
      loadListings();
    } catch (err: any) {
      message.error(err.message || 'Lưu phòng thất bại');
    }
  };

  // Xóa Phòng
  const handleDeleteRoom = async (roomId: string) => {
    try {
      await hostService.deleteRoom(roomId);
      message.success('Đã xóa phòng');
      loadListings();
    } catch (err: any) {
      message.error(err.message || 'Xóa phòng thất bại');
    }
  };

  // Xóa 1 ảnh của phòng trong Modal quản lý ảnh
  const handleDeleteRoomImage = async (imageId: string) => {
    try {
      await hostService.deleteRoomImage(imageId);
      message.success('Đã xóa ảnh phòng');
      await loadListings();
      if (selectedRoom) {
        const res = await hostService.getMyListings();
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        const updatedHomestay = list.find((h: HostHomestay) => h.id === selectedRoom.homestay.id);
        const updatedRoom = updatedHomestay?.rooms?.find((r: RoomItem) => r.id === selectedRoom.room.id);
        if (updatedHomestay && updatedRoom) {
          setSelectedRoom({ homestay: updatedHomestay, room: updatedRoom });
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Xóa ảnh thất bại');
    }
  };

  // Upload kéo thả nhiều file trực tiếp lên Cloudinary cho phòng
  const handleBatchUploadRoomFiles = async (files: File[]) => {
    if (!selectedRoom) return;
    const stats = getHomestayPhotoStats(selectedRoom.homestay);
    if (stats.total + files.length > MAX_HOMESTAY_PHOTOS) {
      message.error(
        `Homestay này đã có ${stats.total}/${MAX_HOMESTAY_PHOTOS} ảnh. Bạn chỉ có thể tải thêm tối đa ${stats.remaining} ảnh nữa.`,
      );
      return;
    }

    setRoomBatchUploading(true);
    const hideLoading = message.loading(`Đang tải ${files.length} ảnh lên Cloudinary...`, 0);
    try {
      const uploadResults = await hostService.uploadMultipleImages(files);
      const urls = uploadResults.map((r) => r.url).filter(Boolean);
      await hostService.batchAddRoomImages(selectedRoom.room.id, urls);
      hideLoading();
      message.success(`Đã tải thành công ${urls.length} ảnh lên Cloudinary và lưu vào phòng!`);
      await loadListings();
      const res = await hostService.getMyListings();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      const updatedHomestay = list.find((h: HostHomestay) => h.id === selectedRoom.homestay.id);
      const updatedRoom = updatedHomestay?.rooms?.find((r: RoomItem) => r.id === selectedRoom.room.id);
      if (updatedHomestay && updatedRoom) {
        setSelectedRoom({ homestay: updatedHomestay, room: updatedRoom });
      }
    } catch (err: any) {
      hideLoading();
      message.error(err.message || 'Lỗi khi tải ảnh phòng lên Cloudinary');
    } finally {
      setRoomBatchUploading(false);
    }
  };

  // Thêm ảnh phòng bằng URL ngoài
  const handleUploadImageByUrl = async (values: any) => {
    if (!selectedRoom) return;
    const stats = getHomestayPhotoStats(selectedRoom.homestay);
    if (stats.total + 1 > MAX_HOMESTAY_PHOTOS) {
      message.error(`Homestay đã đạt giới hạn tối đa ${MAX_HOMESTAY_PHOTOS} ảnh!`);
      return;
    }
    try {
      await hostService.uploadRoomImage(selectedRoom.room.id, {
        image_url: values.image_url,
        is_primary: values.is_primary ? 1 : 0,
      });
      message.success('Thêm ảnh phòng thành công!');
      imageForm.resetFields();
      await loadListings();
      const res = await hostService.getMyListings();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      const updatedHomestay = list.find((h: HostHomestay) => h.id === selectedRoom.homestay.id);
      const updatedRoom = updatedHomestay?.rooms?.find((r: RoomItem) => r.id === selectedRoom.room.id);
      if (updatedHomestay && updatedRoom) {
        setSelectedRoom({ homestay: updatedHomestay, room: updatedRoom });
      }
    } catch (err: any) {
      message.error(err.message || 'Thêm ảnh thất bại');
    }
  };

  // Cột bảng Homestay chính
  const columns = [
    {
      title: 'Tên Chỗ Nghỉ & Địa Chỉ',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: HostHomestay) => {
        const cover =
          record.amenities_json?.main_image_url ||
          (record.amenities_json?.property_images as string[])?.[0] ||
          (record as any).cover_image;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              shape="square"
              size={56}
              src={cover}
              icon={<HomeOutlined />}
              style={{ backgroundColor: '#e2e8f0', borderRadius: 8, flexShrink: 0 }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 15 }}>{name}</Text>
                {record.is_claimed === 1 && (
                  <Badge count="Đã Xác Thực eKYC" style={{ backgroundColor: '#10b981', fontSize: 11 }} />
                )}
              </div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                📍 {record.address}, {record.city} ({record.latitude}, {record.longitude})
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Số Phòng',
      key: 'rooms_count',
      render: (_: any, record: HostHomestay) => (
        <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>
          {record.rooms?.length || 0} loại phòng
        </Tag>
      ),
    },
    {
      title: 'Tổng Ảnh (Tối đa 100)',
      key: 'photos_count',
      render: (_: any, record: HostHomestay) => {
        const stats = getHomestayPhotoStats(record);
        const percent = Math.min(100, Math.round((stats.total / MAX_HOMESTAY_PHOTOS) * 100));
        const color = stats.total >= 100 ? '#ef4444' : stats.total >= 80 ? '#f59e0b' : '#10b981';
        return (
          <div style={{ width: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ fontWeight: 600, color }}>{stats.total} / {MAX_HOMESTAY_PHOTOS}</span>
              <span style={{ color: '#94a3b8' }}>({stats.propertyCount} H, {stats.roomCount} P)</span>
            </div>
            <Progress percent={percent} size="small" strokeColor={color} showInfo={false} />
          </div>
        );
      },
    },
    {
      title: 'Chính Sách Hủy',
      dataIndex: 'cancellation_policy',
      key: 'cancellation_policy',
      render: (policy: string) => {
        if (policy === 'FLEXIBLE') return <Tag color="green">Linh hoạt (Hoàn 100%)</Tag>;
        if (policy === 'MODERATE') return <Tag color="gold">Tiêu chuẩn (Hoàn 50%)</Tag>;
        return <Tag color="red">Nghiêm ngặt</Tag>;
      },
    },
    {
      title: 'Đánh Giá',
      key: 'rating',
      render: (_: any, record: HostHomestay) => (
        <span>
          <strong style={{ color: '#f59e0b' }}>⭐ {Number(record.average_rating || 5.0).toFixed(1)}</strong>
          <span style={{ color: '#94a3b8', fontSize: 12 }}> ({record.total_reviews || 0} lượt)</span>
        </span>
      ),
    },
    {
      title: 'Xác Thực 4 Lớp',
      key: 'verification',
      render: (_: any, record: HostHomestay) =>
        record.is_claimed === 1 ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>Chính chủ (140đ)</Tag>
        ) : (
          <Button
            size="small"
            type="dashed"
            icon={<SafetyCertificateOutlined style={{ color: '#6366f1' }} />}
            onClick={() => navigate(`/host/verification?homestay_id=${record.id}`)}
            style={{ color: '#6366f1', borderColor: '#6366f1' }}
          >
            eKYC (+140đ)
          </Button>
        ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_: any, record: HostHomestay) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedHomestayId(record.id);
              setEditingRoomId(null);
              setRoomFileList([]);
              roomForm.resetFields();
              setRoomModalOpen(true);
            }}
          >
            Thêm phòng
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingHomestay(record);
              const propImages = (record.amenities_json?.property_images as string[]) || [];
              const mainImg = record.amenities_json?.main_image_url || propImages[0] || '';
              setMainImageUrl(mainImg);
              setHomestayFileList(
                propImages.map((url, idx) => ({
                  uid: `existing-homestay-${idx}`,
                  name: `Ảnh homestay ${idx + 1}`,
                  status: 'done',
                  url,
                })),
              );
              form.setFieldsValue({
                name: record.name,
                city: record.city,
                address: record.address,
                latitude: record.latitude,
                longitude: record.longitude,
                cancellation_policy: record.cancellation_policy,
                amenities: record.amenities_json?.items || [],
              });
              setCreateModalOpen(true);
            }}
          />
          <Popconfirm
            title="Xác nhận xóa homestay này?"
            description="Tất cả các phòng và lịch phòng sẽ bị gỡ bỏ."
            onConfirm={() => handleDeleteHomestay(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Bảng phòng con (Mở rộng từ Homestay)
  const expandedRoomRow = (homestay: HostHomestay) => {
    const rooms = homestay.rooms || [];
    if (rooms.length === 0) {
      return (
        <div style={{ padding: '12px 24px', background: '#f8fafc', borderRadius: 8 }}>
          <Text type="secondary">Chỗ nghỉ này chưa có phòng nào. Bấm nút <strong>"+ Thêm phòng"</strong> ở trên để tạo phòng đầu tiên.</Text>
        </div>
      );
    }

    const roomCols = [
      {
        title: 'Ảnh Phòng',
        key: 'images',
        render: (_: any, r: RoomItem) => {
          const primaryImg = r.images?.find((img) => img.is_primary === 1) || r.images?.[0];
          return (
            <Avatar
              shape="square"
              size={54}
              src={primaryImg?.image_url}
              icon={<PictureOutlined />}
              style={{ backgroundColor: '#e2e8f0', borderRadius: 8 }}
            />
          );
        },
      },
      {
        title: 'Tên Loại Phòng',
        dataIndex: 'room_name',
        key: 'room_name',
        render: (name: string) => <strong>{name}</strong>,
      },
      {
        title: 'Sức Chứa',
        dataIndex: 'capacity',
        key: 'capacity',
        render: (cap: number) => <span><UserOutlined /> {cap} khách</span>,
      },
      {
        title: 'Giá Cơ Sở',
        dataIndex: 'base_price',
        key: 'base_price',
        render: (p: number) => <span style={{ color: '#10b981', fontWeight: 600 }}>{Number(p).toLocaleString('vi-VN')}đ / đêm</span>,
      },
      {
        title: 'Ảnh (Cloudinary)',
        key: 'images_count',
        render: (_: any, r: RoomItem) => (
          <Space>
            <Tag color={r.images && r.images.length > 0 ? 'cyan' : 'default'}>
              {r.images?.length || 0} ảnh
            </Tag>
            <Button
              size="small"
              type="link"
              icon={<PictureOutlined />}
              onClick={() => {
                setSelectedRoom({ homestay, room: r });
                setImageModalOpen(true);
              }}
            >
              + Quản lý ảnh
            </Button>
          </Space>
        ),
      },
      {
        title: 'Thao Tác',
        key: 'action',
        render: (_: any, r: RoomItem) => (
          <Space size="small">
            <Button
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => navigate(`/host/pricing?homestay_id=${homestay.id}&room_id=${r.id}`)}
            >
              Lịch giá &amp; AI
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedHomestayId(homestay.id);
                setEditingRoomId(r.id);
                const rImgs = (r.images || []).map((img, idx) => ({
                  uid: img.id || `existing-room-img-${idx}`,
                  name: `Ảnh phòng ${idx + 1}`,
                  status: 'done' as const,
                  url: img.image_url,
                }));
                setRoomFileList(rImgs);
                roomForm.setFieldsValue({
                  room_name: r.room_name,
                  capacity: r.capacity,
                  base_price: r.base_price,
                });
                setRoomModalOpen(true);
              }}
            />
            <Popconfirm
              title="Xóa phòng này?"
              onConfirm={() => handleDeleteRoom(r.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <div style={{ padding: '8px 16px', background: '#faf5ff', borderRadius: 10, border: '1px solid #f3e8ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ color: '#6b21a8' }}>Danh Sách Phòng thuộc {homestay.name}</Text>
        </div>
        <Table
          dataSource={rooms}
          columns={roomCols}
          rowKey="id"
          pagination={rooms.length > 5 ? { pageSize: 5, size: 'small', showSizeChanger: false } : false}
          size="small"
        />
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Quản Lý Chỗ Nghỉ &amp; Phòng</Title>
          <Text type="secondary">
            Đăng ký homestay, quản lý phòng và album ảnh lưu trữ Cloudinary (tối đa 100 ảnh/homestay)
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => {
            setEditingHomestay(null);
            setHomestayFileList([]);
            setMainImageUrl('');
            form.resetFields();
            setCreateModalOpen(true);
          }}
          style={{ background: '#4f46e5' }}
        >
          + Đăng Chỗ Nghỉ Mới
        </Button>
      </div>

      <Card style={{ borderRadius: 14 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          expandable={{ expandedRowRender: expandedRoomRow }}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: ['8', '16', '32'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} chỗ nghỉ`,
          }}
        />
      </Card>

      {/* CREATE / EDIT HOMESTAY MODAL */}
      <Modal
        title={editingHomestay ? 'Chỉnh Sửa Chỗ Nghỉ Homestay' : 'Đăng Ký Chỗ Nghỉ Homestay Mới'}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          setEditingHomestay(null);
          setHomestayFileList([]);
          setMainImageUrl('');
        }}
        footer={null}
        width={760}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveHomestay} initialValues={{ cancellation_policy: 'FLEXIBLE' }}>
          <Form.Item label="Tên Chỗ Nghỉ Homestay" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên homestay' }]}>
            <Input prefix={<HomeOutlined />} placeholder="Ví dụ: Mây Homestay Đà Lạt" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tỉnh / Thành Phố" name="city" rules={[{ required: true, message: 'Vui lòng chọn tỉnh/thành phố' }]}>
                <Select
                  showSearch
                  placeholder="Chọn điểm đến du lịch"
                  size="large"
                  options={Object.keys(VIETNAM_LOCATIONS).map((loc) => ({ label: loc, value: loc }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Chính Sách Hủy Phòng (Escrow)" name="cancellation_policy" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value="FLEXIBLE">Linh hoạt (Hoàn 100% trước 24h)</Select.Option>
                  <Select.Option value="MODERATE">Tiêu chuẩn (Hoàn 50% trước 48h)</Select.Option>
                  <Select.Option value="STRICT">Nghiêm ngặt (Không hoàn sau 48h)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Địa Chỉ Chi Tiết" name="address" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}>
            <Input placeholder="Số nhà, tên đường, phường/xã..." size="large" />
          </Form.Item>

          {/* KHỐI TẢI ẢNH CHO HOMESTAY (CLOUDINARY) */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>
                  📸 Album Ảnh Chỗ Nghỉ &amp; Khuôn Viên (Cloudinary)
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  Tải lên ảnh chụp toàn cảnh, phòng khách, khuôn viên. Nhấp ngôi sao để đặt làm ảnh đại diện chính.
                </Text>
              </div>
              <Tag
                color={
                  homestayFileList.length >= MAX_HOMESTAY_PHOTOS
                    ? 'red'
                    : homestayFileList.length >= 80
                    ? 'orange'
                    : 'green'
                }
              >
                {homestayFileList.length} / {MAX_HOMESTAY_PHOTOS} ảnh tối đa
              </Tag>
            </div>

            <Upload
              listType="picture-card"
              fileList={homestayFileList}
              multiple
              onPreview={handlePreview}
              customRequest={async ({ file, onSuccess, onError }) => {
                const currentRoomCount = editingHomestay
                  ? (editingHomestay.rooms || []).reduce((sum, r) => sum + (r.images?.length || 0), 0)
                  : 0;
                if (homestayFileList.length + currentRoomCount >= MAX_HOMESTAY_PHOTOS) {
                  const errMsg = `Đã đạt giới hạn tối đa ${MAX_HOMESTAY_PHOTOS} ảnh cho cả homestay!`;
                  message.error(errMsg);
                  onError?.(new Error(errMsg));
                  return;
                }
                try {
                  const res = await hostService.uploadImage(file as File);
                  onSuccess?.(res, file);
                  message.success(`Đã tải ảnh lên Cloudinary thành công!`);
                  if (!mainImageUrl) {
                    setMainImageUrl(res.url);
                  }
                } catch (err: any) {
                  onError?.(err);
                  message.error(err.message || 'Lỗi khi tải ảnh lên Cloudinary');
                }
              }}
              onChange={({ fileList }) => {
                setHomestayFileList(fileList);
              }}
              itemRender={(originNode, file) => {
                const fileUrl = file.url || (file.response as any)?.url;
                const isPrimary = fileUrl && fileUrl === mainImageUrl;
                return (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {originNode}
                    {fileUrl && (
                      <Tooltip title={isPrimary ? 'Ảnh đại diện chính' : 'Bấm để đặt làm ảnh đại diện chính'}>
                        <Button
                          size="small"
                          shape="circle"
                          type={isPrimary ? 'primary' : 'default'}
                          icon={isPrimary ? <StarFilled style={{ color: '#facc15' }} /> : <StarOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMainImageUrl(fileUrl);
                            message.success('Đã chọn làm ảnh đại diện chính');
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            background: isPrimary ? '#1e293b' : 'rgba(255,255,255,0.9)',
                          }}
                        />
                      </Tooltip>
                    )}
                  </div>
                );
              }}
            >
              {homestayFileList.length < MAX_HOMESTAY_PHOTOS && (
                <div>
                  <PlusOutlined style={{ fontSize: 20, color: '#4f46e5' }} />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#4f46e5' }}>Tải ảnh lên</div>
                </div>
              )}
            </Upload>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text strong>Tọa độ GPS Thực Địa (Phục vụ xác thực Haversine &lt;= 150m)</Text>
              <Button type="dashed" icon={<CompassOutlined />} onClick={handleGetLocation}>
                📍 Lấy GPS hiện tại
              </Button>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Vĩ độ (Latitude)" name="latitude" rules={[{ required: true, message: 'Vui lòng nhập vĩ độ' }]}>
                  <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="Ví dụ: 11.9404" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Kinh độ (Longitude)" name="longitude" rules={[{ required: true, message: 'Vui lòng nhập kinh độ' }]}>
                  <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="Ví dụ: 108.4583" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item label="Tiện Nghi Nổi Bật" name="amenities">
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                {AMENITY_OPTIONS.map((item) => (
                  <Col span={12} key={item}>
                    <Checkbox value={item}>{item}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block style={{ background: '#4f46e5', height: 44 }}>
            {editingHomestay ? 'Lưu Thay Đổi' : 'Tạo Chỗ Nghỉ Mới'}
          </Button>
        </Form>
      </Modal>

      {/* CREATE / EDIT ROOM MODAL */}
      <Modal
        title={editingRoomId ? 'Chỉnh Sửa Loại Phòng' : 'Thêm Phòng Mới Cho Homestay'}
        open={roomModalOpen}
        onCancel={() => {
          setRoomModalOpen(false);
          setEditingRoomId(null);
          setRoomFileList([]);
        }}
        footer={null}
        width={680}
      >
        <Form form={roomForm} layout="vertical" onFinish={handleSaveRoom} initialValues={{ capacity: 2, base_price: 650000 }}>
          <Form.Item label="Tên Loại Phòng" name="room_name" rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}>
            <Input placeholder="Ví dụ: Phòng Deluxe Hướng Rừng Thông" size="large" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Sức Chứa Tối Đa (Số khách)" name="capacity" rules={[{ required: true }]}>
                <InputNumber min={1} max={30} style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Giá Niêm Yết Cơ Sở (VNĐ/đêm)" name="base_price" rules={[{ required: true }]}>
                <InputNumber
                  min={50000}
                  step={50000}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* KHỐI TẢI ẢNH CHO PHÒNG TRỰC TIẾP LÊN CLOUDINARY */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <Text strong>📸 Album Ảnh Phòng (Cloudinary)</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  Tải lên hình ảnh giường ngủ, phòng tắm, ban công của loại phòng này
                </Text>
              </div>
              <Tag color="cyan">{roomFileList.length} ảnh phòng</Tag>
            </div>

            <Upload
              listType="picture-card"
              fileList={roomFileList}
              multiple
              onPreview={handlePreview}
              customRequest={async ({ file, onSuccess, onError }) => {
                const parent = data.find((h) => h.id === selectedHomestayId);
                if (parent) {
                  const stats = getHomestayPhotoStats(parent);
                  const existingRoomPhotos = editingRoomId
                    ? parent.rooms?.find((r) => r.id === editingRoomId)?.images?.length || 0
                    : 0;
                  if (stats.total - existingRoomPhotos + roomFileList.length >= MAX_HOMESTAY_PHOTOS) {
                    const msg = `Tổng số ảnh của toàn homestay sẽ vượt quá ${MAX_HOMESTAY_PHOTOS} ảnh!`;
                    message.error(msg);
                    onError?.(new Error(msg));
                    return;
                  }
                }
                try {
                  const res = await hostService.uploadImage(file as File);
                  onSuccess?.(res, file);
                  message.success('Đã tải ảnh phòng lên Cloudinary thành công!');
                } catch (err: any) {
                  onError?.(err);
                  message.error(err.message || 'Lỗi tải ảnh lên Cloudinary');
                }
              }}
              onChange={({ fileList }) => {
                setRoomFileList(fileList);
              }}
            >
              <div>
                <PlusOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
                <div style={{ marginTop: 6, fontSize: 12, color: '#4f46e5' }}>+ Thêm ảnh</div>
              </div>
            </Upload>
          </div>

          <Button type="primary" htmlType="submit" size="large" block style={{ background: '#4f46e5', marginTop: 12 }}>
            {editingRoomId ? 'Cập Nhật Phòng' : 'Lưu Phòng Mới'}
          </Button>
        </Form>
      </Modal>

      {/* DETAIL ROOM PHOTOS MANAGER MODAL */}
      <Modal
        title={`Quản Lý Album Ảnh: ${selectedRoom?.room.room_name || 'Phòng'} - ${selectedRoom?.homestay.name || ''}`}
        open={imageModalOpen}
        onCancel={() => {
          setImageModalOpen(false);
          setSelectedRoom(null);
        }}
        footer={null}
        width={720}
      >
        {selectedRoom && (
          <div>
            <div style={{ marginBottom: 16 }}>
              {(() => {
                const stats = getHomestayPhotoStats(selectedRoom.homestay);
                return (
                  <Alert
                    type={stats.remaining <= 10 ? 'warning' : 'info'}
                    showIcon
                    message={
                      <span>
                        Hạn mức ảnh homestay: <strong>{stats.total} / {MAX_HOMESTAY_PHOTOS} ảnh</strong>
                        {' '}(Khuôn viên: {stats.propertyCount}, Tất cả phòng: {stats.roomCount}).
                        {' '}Còn có thể tải thêm <strong>{stats.remaining} ảnh</strong>.
                      </span>
                    }
                    style={{ marginBottom: 12 }}
                  />
                );
              })()}
            </div>

            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ fontSize: 14 }}>
                Danh Sách Ảnh Hiện Tại ({selectedRoom.room.images?.length || 0} ảnh):
              </Text>
              {(!selectedRoom.room.images || selectedRoom.room.images.length === 0) ? (
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginTop: 8, textAlign: 'center' }}>
                  <Text type="secondary">Phòng này chưa có ảnh nào. Bạn hãy tải ảnh lên bên dưới!</Text>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                  {selectedRoom.room.images.map((img: RoomImageItem) => (
                    <div
                      key={img.id}
                      style={{
                        position: 'relative',
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <img
                        src={img.image_url}
                        alt="Ảnh phòng"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => {
                          setPreviewImage(img.image_url);
                          setPreviewTitle('Ảnh phòng');
                          setPreviewOpen(true);
                        }}
                      />
                      {img.is_primary === 1 && (
                        <Tag
                          color="gold"
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            fontSize: 10,
                            padding: '0 4px',
                            margin: 0,
                          }}
                        >
                          Ảnh chính
                        </Tag>
                      )}
                      <Popconfirm
                        title="Xóa ảnh này?"
                        onConfirm={() => handleDeleteRoomImage(img.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 22,
                            height: 22,
                            minWidth: 22,
                            padding: 0,
                          }}
                        />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Tabs
              defaultActiveKey="upload"
              items={[
                {
                  key: 'upload',
                  label: 'Tải Ảnh Trực Tiếp Lên Cloudinary',
                  children: (
                    <div style={{ padding: '8px 0' }}>
                      <Dragger
                        multiple
                        accept="image/*"
                        showUploadList={false}
                        disabled={roomBatchUploading || getHomestayPhotoStats(selectedRoom.homestay).remaining <= 0}
                        beforeUpload={(_, fileList) => {
                          // Gom toàn bộ files được chọn và gọi batch upload
                          const files = fileList as unknown as File[];
                          handleBatchUploadRoomFiles(files);
                          return false; // Ngăn Antd tự động upload mặc định
                        }}
                        style={{ padding: '24px 0', background: '#faf5ff', borderColor: '#c084fc' }}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined style={{ color: '#7c3aed', fontSize: 40 }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontWeight: 600, color: '#6b21a8' }}>
                          Kéo thả hoặc nhấp để chọn nhiều ảnh từ thiết bị
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: 12, color: '#64748b' }}>
                          Hỗ trợ định dạng JPG, PNG, WEBP. Ảnh sẽ được tự động tối ưu hóa và lưu trữ trên Cloudinary CDN.
                        </p>
                      </Dragger>
                    </div>
                  ),
                },
                {
                  key: 'url',
                  label: 'Nhập Đường Dẫn URL',
                  children: (
                    <Form form={imageForm} layout="vertical" onFinish={handleUploadImageByUrl} style={{ marginTop: 12 }}>
                      <Form.Item
                        label="Đường Dẫn URL Ảnh (Cloudinary / CDN)"
                        name="image_url"
                        rules={[{ required: true, message: 'Vui lòng nhập URL ảnh' }]}
                      >
                        <Input placeholder="https://res.cloudinary.com/..." size="large" />
                      </Form.Item>
                      <Form.Item name="is_primary" valuePropName="checked">
                        <Checkbox>Đặt làm ảnh đại diện chính của phòng</Checkbox>
                      </Form.Item>
                      <Button type="primary" htmlType="submit" size="large" block style={{ background: '#4f46e5' }}>
                        Lưu Ảnh Phòng
                      </Button>
                    </Form>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* LIGHTBOX PREVIEW MODAL */}
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        centered
        width={700}
      >
        <img alt="Preview" style={{ width: '100%', borderRadius: 8, marginTop: 8 }} src={previewImage} />
      </Modal>
    </div>
  );
}
