import { useState, useEffect } from 'react';
import { Table, Tag, Button, Typography, Card, Space, Modal, Form, Input, InputNumber, message } from 'antd';
import { PlusOutlined, HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { hostService } from '../../services/hostService';
import type { HostHomestay } from '../../types/host';

const { Title, Text } = Typography;

export default function MyListingsPage() {
  const [data, setData] = useState<HostHomestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [selectedHomestayId, setSelectedHomestayId] = useState<string | null>(null);

  const [form] = Form.useForm();
  const [roomForm] = Form.useForm();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await hostService.getMyListings();
      setData(res || []);
    } catch {
      // Mock fallback
      setData([
        {
          id: '1',
          name: 'Mây Homestay Đà Lạt',
          city: 'Đà Lạt',
          address: '123 Đường An Bình, Phường 3',
          latitude: 11.9404,
          longitude: 108.4583,
          host_id: '1',
          status: 'ACTIVE',
          average_rating: 4.8,
          total_reviews: 24,
          is_claimed: 1,
          cancellation_policy: 'FLEXIBLE',
          created_at: '2026-10-01',
          rooms: [
            {
              id: '101',
              homestay_id: '1',
              room_name: 'Phòng Deluxe Hướng Đồi',
              capacity: 2,
              base_price: 650000,
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHomestay = async (values: any) => {
    try {
      await hostService.createHomestay(values);
      message.success('Tạo homestay mới thành công!');
      setCreateModalOpen(false);
      form.resetFields();
      loadListings();
    } catch (err: any) {
      message.error(err.message || 'Tạo thất bại');
    }
  };

  const handleAddRoom = async (values: any) => {
    if (!selectedHomestayId) return;
    try {
      await hostService.createRoom(selectedHomestayId, values);
      message.success('Thêm phòng mới thành công!');
      setRoomModalOpen(false);
      roomForm.resetFields();
      loadListings();
    } catch (err: any) {
      message.error(err.message || 'Thêm phòng thất bại');
    }
  };

  const columns = [
    {
      title: 'Tên Homestay',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: HostHomestay) => (
        <div>
          <Text strong style={{ fontSize: 15 }}>{name}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{record.address}, {record.city}</Text>
        </div>
      ),
    },
    {
      title: 'Số phòng',
      key: 'rooms_count',
      render: (_: any, record: HostHomestay) => (
        <span>{record.rooms?.length || 0} phòng</span>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'rating',
      render: (_: any, record: HostHomestay) => (
        <span>{Number(record.average_rating).toFixed(1)} ⭐ ({record.total_reviews} lượt)</span>
      ),
    },
    {
      title: 'Trạng thái Chính chủ',
      key: 'claimed',
      render: (_: any, record: HostHomestay) =>
        record.is_claimed === 1 ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>Đã xác thực eKYC</Tag>
        ) : (
          <Tag color="warning">Chưa xác thực</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: HostHomestay) => (
        <Space>
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setSelectedHomestayId(record.id);
              setRoomModalOpen(true);
            }}
          >
            + Thêm phòng
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Quản lý Chỗ nghỉ & Phòng</Title>
          <Text type="secondary">Danh sách tất cả các homestay và phòng bạn đang kinh doanh</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          Thêm Chỗ nghỉ mới
        </Button>
      </div>

      <Card style={{ borderRadius: 14 }}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* CREATE HOMESTAY MODAL */}
      <Modal
        title="Đăng ký Chỗ nghỉ Homestay mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateHomestay}>
          <Form.Item label="Tên Chỗ nghỉ" name="name" rules={[{ required: true }]}>
            <Input prefix={<HomeOutlined />} placeholder="Ví dụ: Mây Homestay Đà Lạt" />
          </Form.Item>
          <Form.Item label="Tỉnh / Thành phố" name="city" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Đà Lạt" />
          </Form.Item>
          <Form.Item label="Địa chỉ chi tiết" name="address" rules={[{ required: true }]}>
            <Input placeholder="Số nhà, tên đường, phường..." />
          </Form.Item>
          <Form.Item label="Vĩ độ GPS (Latitude)" name="latitude" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="11.9404" />
          </Form.Item>
          <Form.Item label="Kinh độ GPS (Longitude)" name="longitude" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="108.4583" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block style={{ marginTop: 12 }}>
            Tạo Chỗ nghỉ
          </Button>
        </Form>
      </Modal>

      {/* ADD ROOM MODAL */}
      <Modal
        title="Thêm phòng mới cho Homestay"
        open={roomModalOpen}
        onCancel={() => setRoomModalOpen(false)}
        footer={null}
      >
        <Form form={roomForm} layout="vertical" onFinish={handleAddRoom}>
          <Form.Item label="Tên loại phòng" name="room_name" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Phòng Deluxe Hướng Rừng Thông" />
          </Form.Item>
          <Form.Item label="Sức chứa tối đa (người)" name="capacity" rules={[{ required: true }]}>
            <InputNumber min={1} max={30} style={{ width: '100%' }} defaultValue={2} />
          </Form.Item>
          <Form.Item label="Giá niêm yết cơ sở (VNĐ/đêm)" name="base_price" rules={[{ required: true }]}>
            <InputNumber min={50000} step={10000} style={{ width: '100%' }} placeholder="650000" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block style={{ marginTop: 12 }}>
            Lưu phòng mới
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
