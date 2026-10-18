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
} from 'antd';
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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hostService } from '../../services/hostService';
import { VIETNAM_LOCATIONS } from '../../data/vietnamLocations';
import type { HostHomestay } from '../../types/host';

const { Title, Text, Paragraph } = Typography;

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

  // Modal Phòng
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [selectedHomestayId, setSelectedHomestayId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Modal Ảnh phòng
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [form] = Form.useForm();
  const [roomForm] = Form.useForm();
  const [imageForm] = Form.useForm();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setData(list);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
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
      const payload = {
        name: values.name,
        city: values.city,
        address: values.address,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        cancellation_policy: values.cancellation_policy || 'FLEXIBLE',
        amenities_json: { items: values.amenities || [] },
      };

      if (editingHomestay) {
        await hostService.updateHomestay(editingHomestay.id, payload);
        message.success('Cập nhật chỗ nghỉ thành công!');
      } else {
        await hostService.createHomestay(payload);
        message.success('Đăng ký chỗ nghỉ mới thành công!');
      }

      setCreateModalOpen(false);
      setEditingHomestay(null);
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
      if (editingRoomId) {
        await hostService.updateRoom(editingRoomId, {
          room_name: values.room_name,
          capacity: Number(values.capacity),
          base_price: Number(values.base_price),
        });
        message.success('Cập nhật thông tin phòng thành công!');
      } else if (selectedHomestayId) {
        await hostService.createRoom(selectedHomestayId, {
          room_name: values.room_name,
          capacity: Number(values.capacity),
          base_price: Number(values.base_price),
        });
        message.success('Thêm phòng mới thành công!');
      }

      setRoomModalOpen(false);
      setEditingRoomId(null);
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

  // Thêm Ảnh Phòng
  const handleUploadImage = async (values: any) => {
    if (!selectedRoomId) return;
    try {
      await hostService.uploadRoomImage(selectedRoomId, {
        image_url: values.image_url,
        is_primary: values.is_primary ? 1 : 0,
      });
      message.success('Thêm ảnh phòng thành công!');
      setImageModalOpen(false);
      imageForm.resetFields();
      loadListings();
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
      render: (name: string, record: HostHomestay) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 15 }}>{name}</Text>
            {record.is_claimed === 1 && (
              <Badge count="Đã Xác Thực eKYC" style={{ backgroundColor: '#10b981', fontSize: 11 }} />
            )}
          </div>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            📍 {record.address}, {record.city} ({record.latitude}, {record.longitude})
          </Text>
        </div>
      ),
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
        render: (_: any, r: any) => {
          const primaryImg = r.images?.find((img: any) => img.is_primary === 1) || r.images?.[0];
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
        title: 'Số Ảnh',
        key: 'images_count',
        render: (_: any, r: any) => (
          <Space>
            <Tag color="default">{r.images?.length || 0} ảnh</Tag>
            <Button
              size="small"
              type="link"
              icon={<PictureOutlined />}
              onClick={() => {
                setSelectedRoomId(r.id);
                setImageModalOpen(true);
              }}
            >
              + Tải ảnh
            </Button>
          </Space>
        ),
      },
      {
        title: 'Thao Tác',
        key: 'action',
        render: (_: any, r: any) => (
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
        <Table dataSource={rooms} columns={roomCols} rowKey="id" pagination={false} size="small" />
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Quản Lý Chỗ Nghỉ &amp; Phòng</Title>
          <Text type="secondary">Đăng ký homestay mới, quản lý các loại phòng và cập nhật album ảnh lưu trú</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => {
            setEditingHomestay(null);
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
        />
      </Card>

      {/* CREATE / EDIT HOMESTAY MODAL */}
      <Modal
        title={editingHomestay ? 'Chỉnh Sửa Chỗ Nghỉ Homestay' : 'Đăng Ký Chỗ Nghỉ Homestay Mới'}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          setEditingHomestay(null);
        }}
        footer={null}
        width={680}
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
        }}
        footer={null}
      >
        <Form form={roomForm} layout="vertical" onFinish={handleSaveRoom} initialValues={{ capacity: 2, base_price: 650000 }}>
          <Form.Item label="Tên Loại Phòng" name="room_name" rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}>
            <Input placeholder="Ví dụ: Phòng Deluxe Hướng Rừng Thông" size="large" />
          </Form.Item>
          <Form.Item label="Sức Chứa Tối Đa (Số khách)" name="capacity" rules={[{ required: true }]}>
            <InputNumber min={1} max={30} style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item label="Giá Niêm Yết Cơ Sở (VNĐ/đêm)" name="base_price" rules={[{ required: true }]}>
            <InputNumber
              min={50000}
              step={50000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block style={{ background: '#4f46e5', marginTop: 12 }}>
            {editingRoomId ? 'Cập Nhật Phòng' : 'Lưu Phòng Mới'}
          </Button>
        </Form>
      </Modal>

      {/* UPLOAD ROOM IMAGE MODAL */}
      <Modal
        title="Tải Ảnh Lên Cho Phòng"
        open={imageModalOpen}
        onCancel={() => setImageModalOpen(false)}
        footer={null}
      >
        <Form form={imageForm} layout="vertical" onFinish={handleUploadImage}>
          <Form.Item label="Đường Dẫn URL Ảnh (Cloudinary / CDN)" name="image_url" rules={[{ required: true, message: 'Vui lòng nhập URL ảnh' }]}>
            <Input placeholder="https://res.cloudinary.com/..." size="large" />
          </Form.Item>
          <Form.Item name="is_primary" valuePropName="checked">
            <Checkbox>Đặt làm ảnh đại diện chính của phòng</Checkbox>
          </Form.Item>

          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            💡 Gợi ý: Bạn có thể dán ảnh từ Cloudinary hoặc chọn liên kết ảnh chất lượng cao để hiển thị đẹp mắt cho khách hàng trên sàn.
          </Paragraph>

          <Button type="primary" htmlType="submit" size="large" block style={{ background: '#4f46e5' }}>
            Lưu Ảnh Phòng
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
