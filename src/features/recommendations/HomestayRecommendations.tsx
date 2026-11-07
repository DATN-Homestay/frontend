import { useContext, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { EnvironmentOutlined, HeartFilled, HeartOutlined, StarFilled, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContextDefinition';
import { useFavorites } from '../../contexts/useFavorites';
import { getHomestayCoverImage } from '../../utils/imageHelper';
import { formatVnd } from '../pricing/pricing.utils';
import { recommendationsService, type HomestayRecommendationsResult } from './recommendations.service';

const { Title, Text } = Typography;

export default function HomestayRecommendations() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const initializing = auth?.initializing ?? false;
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? 'guest'}:${revision}`;
  const [result, setResult] = useState<{ key: string; data: HomestayRecommendationsResult } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    if (initializing) return;
    let active = true;
    recommendationsService.get(Boolean(userId)).then((data) => {
      if (active) { setResult({ key, data }); setFailure(null); }
    }).catch((error: unknown) => {
      if (active) setFailure({ key, message: error instanceof Error ? error.message : 'Không tải được gợi ý homestay.' });
    });
    return () => { active = false; };
  }, [userId, key, initializing]);

  const data = !initializing && result?.key === key ? result.data : null;
  const error = !initializing && failure?.key === key ? failure.message : null;
  const personalized = data?.mode === 'PERSONALIZED';
  const description = !personalized ? 'Khám phá các chỗ nghỉ nổi bật theo điểm và số lượt đánh giá.'
    : data.signals.viewed_homestays && data.signals.bookings ? 'Dựa trên lượt xem gần đây và các chuyến đi đã thanh toán của bạn.'
      : data.signals.bookings ? 'Dựa trên các chuyến đi đã thanh toán của bạn.' : 'Dựa trên các homestay bạn đã xem gần đây.';

  return (
    <section aria-label="Gợi ý homestay" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: 24, marginBottom: 36 }}>
      <Space align="start" style={{ marginBottom: 20 }}>
        <ThunderboltOutlined style={{ fontSize: 26, color: '#7c3aed', marginTop: 4 }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>{personalized ? 'Gợi ý theo sở thích của bạn' : 'Chỗ nghỉ nổi bật'}</Title>
          <Text type="secondary">{description}</Text>
        </div>
      </Space>
      {error ? <Alert type="error" showIcon title="Chưa tải được gợi ý" description={error}
        action={<Button onClick={() => setRevision((value) => value + 1)}>Thử lại</Button>} />
        : !data ? <Skeleton active paragraph={{ rows: 4 }} />
          : data.items.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chỗ nghỉ phù hợp để gợi ý." />
            : <Row gutter={[20, 20]}>
              {data.items.map(({ homestay, reasons }) => {
                const coverImage = getHomestayCoverImage(homestay);
                const price = Number(homestay.rooms?.[0]?.base_price);
                return (
                  <Col xs={24} sm={12} lg={6} key={homestay.id}>
                    <Card hoverable style={{ height: '100%', borderRadius: 14, overflow: 'hidden' }}
                      cover={<div style={{ position: 'relative' }}>
                        <Link to={`/homestay/${homestay.id}`} state={{ coverImage }} aria-label={`Xem ${homestay.name}`}>
                          <img src={coverImage} alt={homestay.name} style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
                        </Link>
                        <Button
                          shape="circle"
                          aria-label={`${isFavorite(homestay.id) ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}: ${homestay.name}`}
                          aria-pressed={isFavorite(homestay.id)}
                          icon={isFavorite(homestay.id) ? <HeartFilled style={{ color: '#ef4444' }} /> : <HeartOutlined />}
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleFavorite(homestay.id);
                          }}
                          style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(255,255,255,0.95)' }}
                        />
                      </div>}>
                      <Space style={{ justifyContent: 'space-between', width: '100%', alignItems: 'start' }}>
                        <Link to={`/homestay/${homestay.id}`} state={{ coverImage }} style={{ fontWeight: 700, fontSize: 16 }}>{homestay.name}</Link>
                        <span><StarFilled style={{ color: '#f59e0b' }} /> {Number(homestay.average_rating) > 0 ? Number(homestay.average_rating).toFixed(1) : 'Mới'}</span>
                      </Space>
                      <div style={{ margin: '8px 0' }}><Text type="secondary"><EnvironmentOutlined /> {homestay.city}</Text></div>
                      <Tag color={homestay.is_claimed === 1 ? 'green' : 'blue'}>{homestay.is_claimed === 1 ? 'Chính chủ' : 'Booking.com'}</Tag>
                      <ul style={{ paddingLeft: 18, margin: '12px 0', fontSize: 12, color: '#6d28d9' }}>
                        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                      <div>Giá cơ bản từ <strong style={{ color: '#6366f1' }}>{formatVnd(price)}</strong><Text type="secondary"> /đêm</Text></div>
                    </Card>
                  </Col>
                );
              })}
            </Row>}
    </section>
  );
}
