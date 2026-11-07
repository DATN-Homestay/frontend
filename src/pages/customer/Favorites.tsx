import { useEffect, useState } from 'react';
import { Typography, Row, Col, Card, Button, Tag, Empty, Spin, Pagination, Popconfirm, Space } from 'antd';
import {
  HeartFilled,
  EnvironmentOutlined,
  StarFilled,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { favoritesService, type FavoriteHomestayItem } from '../../services/favoritesService';
import { useFavorites } from '../../contexts/useFavorites';

const { Title, Text, Paragraph } = Typography;

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { toggleFavorite } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FavoriteHomestayItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const loadFavorites = async (targetPage = 1) => {
    setLoading(true);
    try {
      const res = await favoritesService.getFavorites(targetPage, pageSize);
      setItems(res.items || []);
      setTotal(res.meta?.total || 0);
      setPage(targetPage);
    } catch {
      // lỗi đã được xử lý bởi apiClient
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFavorites(1);
  }, []);

  const handleRemove = async (homestayId: string) => {
    await toggleFavorite(homestayId);
    // Tải lại danh sách sau khi xóa
    void loadFavorites(page);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ margin: '0 0 4px', color: '#0f172a' }}>
            <HeartFilled style={{ color: '#ef4444', marginRight: 10 }} />
            Danh sách Homestay yêu thích
          </Title>
          <Text type="secondary">
            Lưu giữ các homestay bạn yêu thích để dễ dàng lên kế hoạch cho kỳ nghỉ sắp tới
          </Text>
        </div>

        {total > 0 && (
          <Tag color="red" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 16 }}>
            {total} Homestay đã lưu
          </Tag>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#64748b' }}>Đang tải danh sách yêu thích...</div>
        </div>
      ) : items.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px', background: '#ffffff' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={4} style={{ color: '#334155', marginBottom: 8 }}>
                  Chưa có homestay nào trong danh sách yêu thích
                </Title>
                <Paragraph style={{ color: '#64748b', maxWidth: 460, margin: '0 auto 20px' }}>
                  Hãy bấm vào biểu tượng trái tim trên các homestay bạn ưng ý ở trang chủ để lưu lại và xem lại bất cứ lúc nào.
                </Paragraph>
              </div>
            }
          >
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ borderRadius: 8, height: 44, fontWeight: 600 }}
            >
              Khám phá Homestay ngay
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[20, 24]}>
            {items.map(({ favorite_id, homestay: h }) => (
              <Col xs={24} sm={12} md={8} lg={6} key={favorite_id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                  styles={{ body: { padding: 14, flex: 1, display: 'flex', flexDirection: 'column' } }}
                  cover={
                    <div
                      style={{ position: 'relative', height: 180, background: '#f1f5f9', cursor: 'pointer' }}
                      onClick={() => navigate(`/homestay/${h.id}`)}
                    >
                      <img
                        alt={h.name}
                        src={h.cover_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <Tag
                        color="blue"
                        style={{ position: 'absolute', bottom: 8, left: 10, fontWeight: 600, margin: 0 }}
                      >
                        {h.city}
                      </Tag>
                    </div>
                  }
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Text
                        strong
                        ellipsis={{ tooltip: h.name }}
                        style={{ fontSize: 15, color: '#0f172a', flex: 1, cursor: 'pointer' }}
                        onClick={() => navigate(`/homestay/${h.id}`)}
                      >
                        {h.name}
                      </Text>
                      <Space size={3} style={{ marginLeft: 6 }}>
                        <StarFilled style={{ color: '#f59e0b', fontSize: 13 }} />
                        <Text strong style={{ fontSize: 13 }}>
                          {h.average_rating > 0 ? h.average_rating.toFixed(1) : 'Mới'}
                        </Text>
                      </Space>
                    </div>

                    <Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                      <EnvironmentOutlined /> {h.address}
                    </Text>

                    <div style={{ marginBottom: 14 }}>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>Từ </Text>
                      <Text strong style={{ fontSize: 16, color: '#6366f1' }}>
                        {Number(h.min_price).toLocaleString('vi-VN')}đ
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}> /đêm</Text>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/homestay/${h.id}`)}
                      style={{ flex: 1, borderRadius: 6 }}
                    >
                      Xem phòng
                    </Button>
                    <Popconfirm
                      title="Xóa khỏi danh sách yêu thích?"
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void handleRemove(h.id)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ borderRadius: 6 }}
                        title="Xóa khỏi yêu thích"
                      />
                    </Popconfirm>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {total > pageSize && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p) => void loadFavorites(p)}
                showTotal={(t) => `Tổng cộng ${t} homestay`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
