import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  InputNumber,
  DatePicker,
  Select,
  message,
  Spin,
  Modal,
  Form,
  Calendar,
  Switch,
  Divider,
} from 'antd';
import {
  RobotOutlined,
  CheckCircleFilled,
  ThunderboltOutlined,
  CalendarOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { hostService } from '../../services/hostService';
import type { HostHomestay, PriceCalendarDay, PricingSuggestion } from '../../types/host';

const { Title, Text, Paragraph } = Typography;

export default function PriceCalendarPage() {
  const [searchParams] = useSearchParams();
  const initialHomestayId = searchParams.get('homestay_id');
  const initialRoomId = searchParams.get('room_id');

  const [homestays, setHomestays] = useState<HostHomestay[]>([]);
  const [selectedHomestayId, setSelectedHomestayId] = useState<string | null>(initialHomestayId);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId);

  const [targetDate, setTargetDate] = useState<string>(dayjs().add(2, 'day').format('YYYY-MM-DD'));
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiData, setAiData] = useState<PricingSuggestion | null>(null);
  const [appliedPrice, setAppliedPrice] = useState<number>(0);
  const [applying, setApplying] = useState(false);

  const [calendarDays, setCalendarDays] = useState<PriceCalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Single Day Price Setting Modal (Hộp thoại thiết lập giá cho từng ngày khi bấm vào lịch)
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>('');
  const [dayPriceForm] = Form.useForm();
  const [dayPriceUpdating, setDayPriceUpdating] = useState(false);
  const [dayAiLoading, setDayAiLoading] = useState(false);
  const [dayAiSuggestion, setDayAiSuggestion] = useState<PricingSuggestion | null>(null);

  // Batch Update Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchUpdating, setBatchUpdating] = useState(false);

  useEffect(() => {
    loadHomestays();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      loadRoomCalendar(selectedRoomId);
    }
  }, [selectedRoomId]);

  const loadHomestays = async () => {
    try {
      const res = await hostService.getMyListings();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setHomestays(list);
      if (list.length > 0) {
        const defaultHs = initialHomestayId
          ? list.find((h: HostHomestay) => h.id === initialHomestayId) || list[0]
          : list[0];
        setSelectedHomestayId(defaultHs.id);

        if (defaultHs.rooms && Array.isArray(defaultHs.rooms) && defaultHs.rooms.length > 0) {
          const defaultRoom = initialRoomId
            ? defaultHs.rooms.find((r: any) => r.id === initialRoomId) || defaultHs.rooms[0]
            : defaultHs.rooms[0];
          setSelectedRoomId(defaultRoom.id);
        }
      }
    } catch {
      setHomestays([]);
    }
  };

  const loadRoomCalendar = async (roomId: string) => {
    setLoadingCalendar(true);
    try {
      const from = dayjs().startOf('month').format('YYYY-MM-DD');
      const to = dayjs().add(2, 'month').endOf('month').format('YYYY-MM-DD');
      const days = await hostService.getCalendar(roomId, from, to);
      const list = Array.isArray(days) ? days : (days as any)?.data || [];
      setCalendarDays(list);
    } catch {
      setCalendarDays([]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const safeHomestays = Array.isArray(homestays) ? homestays : [];
  const selectedHomestay = safeHomestays.find((h) => String(h.id) === String(selectedHomestayId));
  const currentRooms = selectedHomestay && Array.isArray(selectedHomestay.rooms) ? selectedHomestay.rooms : [];
  const selectedRoom = currentRooms.find((r: any) => String(r.id) === String(selectedRoomId));

  // Sync modal form values whenever opened or selected date changes
  useEffect(() => {
    if (dayModalOpen && selectedDayDate) {
      const dayData = Array.isArray(calendarDays) ? calendarDays.find((d) => d.date === selectedDayDate) : null;
      const basePrice = Number(selectedRoom?.base_price || 500000);
      const initialPrice = dayData ? Number(dayData.price) : basePrice;
      const isAvail = dayData ? dayData.is_available !== 0 : true;

      dayPriceForm.setFieldsValue({
        price: initialPrice,
        is_available: isAvail,
      });
    }
  }, [dayModalOpen, selectedDayDate, calendarDays, selectedRoom]);

  // Lấy gợi ý giá AI cho ngày được chọn
  const handleFetchAi = async (dateToFetch?: string) => {
    const d = dateToFetch || targetDate;
    if (!selectedHomestayId) {
      message.warning('Vui lòng chọn Homestay');
      return;
    }

    setLoadingAi(true);
    try {
      const res = await hostService.getPricingSuggestions(selectedHomestayId, d, selectedRoomId || undefined);
      const suggestion = res?.data || (res as any);
      if (suggestion && (suggestion.suggested_price !== undefined || suggestion.comp_set_stats)) {
        setAiData(suggestion);
        if (suggestion.suggested_price) {
          setAppliedPrice(Number(suggestion.suggested_price));
        }
      }
      message.success(`Đã tính toán mức giá tối ưu từ AI cho ngày ${d}!`);
    } catch {
      message.info('Đang sử dụng dữ liệu mô phỏng AI CompSet bán kính 3km');
    } finally {
      setLoadingAi(false);
    }
  };

  // Áp dụng giá AI vào database
  const handleApply = async () => {
    if (!selectedHomestayId) return;
    setApplying(true);
    try {
      await hostService.applyPricing({
        homestay_id: selectedHomestayId,
        date: targetDate,
        applied_price: appliedPrice,
        room_id: selectedRoomId || undefined,
      });
      message.success(`✓ Đã áp dụng mức giá ${appliedPrice.toLocaleString('vi-VN')}đ cho ngày ${targetDate}!`);
      if (selectedRoomId) loadRoomCalendar(selectedRoomId);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi áp dụng giá');
    } finally {
      setApplying(false);
    }
  };

  // Cập nhật giá hàng loạt (Batch)
  const handleBatchUpdate = async (values: any) => {
    if (!selectedRoomId) {
      message.warning('Vui lòng chọn phòng để cập nhật lịch giá');
      return;
    }

    setBatchUpdating(true);
    try {
      const [start, end] = values.date_range;
      await hostService.batchUpdateCalendar(selectedRoomId, {
        from_date: start.format('YYYY-MM-DD'),
        to_date: end.format('YYYY-MM-DD'),
        price: Number(values.price),
      });
      message.success('Cập nhật giá hàng loạt thành công!');
      setBatchModalOpen(false);
      batchForm.resetFields();
      loadRoomCalendar(selectedRoomId);
    } catch (err: any) {
      message.error(err.message || 'Cập nhật hàng loạt thất bại');
    } finally {
      setBatchUpdating(false);
    }
  };

  // Mở hộp thoại (box / modal) thiết lập giá khi người dùng click vào 1 ngày trên lịch
  const handleOpenDayModal = async (dateStr: string) => {
    if (!dateStr) return;
    if (!selectedRoomId) {
      message.warning('Vui lòng chọn loại phòng trước khi thiết lập giá!');
      return;
    }

    setSelectedDayDate(dateStr);
    setTargetDate(dateStr);

    const dayData = Array.isArray(calendarDays) ? calendarDays.find((d) => d.date === dateStr) : null;
    const basePrice = Number(selectedRoom?.base_price || 500000);
    const initialPrice = dayData ? Number(dayData.price) : basePrice;
    const isAvail = dayData ? dayData.is_available !== 0 : true;

    dayPriceForm.setFieldsValue({
      price: initialPrice,
      is_available: isAvail,
    });

    setDayModalOpen(true);
    setDayAiSuggestion(null);

    // Tự động tải gợi ý giá AI cho ngày được chọn này
    if (selectedHomestayId) {
      setDayAiLoading(true);
      try {
        const res = await hostService.getPricingSuggestions(selectedHomestayId, dateStr, selectedRoomId || undefined);
        const suggestion = res?.data || (res as any);
        if (suggestion && (suggestion.suggested_price !== undefined || suggestion.comp_set_stats)) {
          setDayAiSuggestion(suggestion);
        } else {
          setDayAiSuggestion(null);
        }
      } catch {
        setDayAiSuggestion(null);
      } finally {
        setDayAiLoading(false);
      }
    }
  };

  // Lưu thiết lập giá cho ngày được chọn
  const handleSaveDayPrice = async (values: any) => {
    if (!selectedRoomId || !selectedHomestayId || !selectedDayDate) return;

    setDayPriceUpdating(true);
    try {
      const priceNum = Number(values.price);
      const isAvailNum = values.is_available ? 1 : 0;

      // 1. Cập nhật Room Calendar
      await hostService.updateCalendar(selectedRoomId, {
        date: selectedDayDate,
        price: priceNum,
        is_available: isAvailNum,
      });

      // 2. Ghi nhận qua Dynamic Pricing
      try {
        await hostService.applyPricing({
          homestay_id: selectedHomestayId,
          date: selectedDayDate,
          applied_price: priceNum,
          room_id: selectedRoomId,
        });
      } catch {
        // Dynamic pricing apply optional
      }

      message.success(`✓ Đã lưu giá ${priceNum.toLocaleString('vi-VN')}đ cho ngày ${dayjs(selectedDayDate).format('DD/MM/YYYY')}!`);
      setDayModalOpen(false);
      loadRoomCalendar(selectedRoomId);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi lưu giá ngày');
    } finally {
      setDayPriceUpdating(false);
    }
  };

  // Render ô ngày trên lịch
  const dateCellRender = (current: Dayjs) => {
    const dateStr = current.format('YYYY-MM-DD');
    const dayData = Array.isArray(calendarDays) ? calendarDays.find((d) => d.date === dateStr) : null;
    const basePrice = selectedRoom ? Number(selectedRoom.base_price) : 0;

    return (
      <div
        style={{
          padding: '4px 6px',
          background: dayData ? (dayData.is_available === 0 ? '#fee2e2' : dayData.is_ai_applied ? '#f5f3ff' : '#f0fdf4') : '#f8fafc',
          borderRadius: 6,
          border: dayData?.is_ai_applied ? '1px solid #c084fc' : '1px solid #e2e8f0',
          cursor: 'pointer',
          minHeight: 48,
          transition: 'all 0.2s',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDayModal(dateStr);
        }}
        className="price-calendar-cell"
      >
        {dayData ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: dayData.is_available === 0 ? '#ef4444' : '#10b981' }}>
              {Number(dayData.price).toLocaleString('vi-VN')}đ
            </div>
            {dayData.is_ai_applied === 1 && (
              <Tag color="purple" style={{ fontSize: 9, padding: '0 4px', margin: '2px 0 0' }}>
                AI Applied
              </Tag>
            )}
            {dayData.is_available === 0 && (
              <Tag color="red" style={{ fontSize: 9, padding: '0 4px', margin: '2px 0 0' }}>
                Đã khóa / Đặt
              </Tag>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>
            {basePrice > 0 ? `${basePrice.toLocaleString('vi-VN')}đ` : '+ Đặt giá'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Lịch Giá &amp; Định Giá Động AI</Title>
          <Text type="secondary">
            Phân tích cụm đối thủ tương đồng (CompSet 3-5km), tỷ lệ kín phòng và tối ưu doanh thu trong biên độ an toàn ±30%
          </Text>
        </div>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={() => setBatchModalOpen(true)}
          style={{ background: '#4f46e5' }}
        >
          Cập Nhật Giá Hàng Loạt
        </Button>
      </div>

      {/* CHỌN HOMESTAY VÀ PHÒNG */}
      <Card style={{ borderRadius: 14, marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Chỗ Nghỉ Homestay</Text>
            <Select
              style={{ width: '100%' }}
              size="large"
              value={selectedHomestayId}
              onChange={(id) => {
                setSelectedHomestayId(id);
                const hs = homestays.find((h) => h.id === id);
                if (hs?.rooms && hs.rooms.length > 0) {
                  setSelectedRoomId(hs.rooms[0].id);
                } else {
                  setSelectedRoomId(null);
                }
              }}
              options={safeHomestays.map((h) => ({
                label: (
                  <span>
                    <HomeOutlined style={{ marginRight: 6 }} />
                    {h.name} ({h.city})
                  </span>
                ),
                value: h.id,
              }))}
            />
          </Col>

          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Loại Phòng</Text>
            <Select
              style={{ width: '100%' }}
              size="large"
              value={selectedRoomId}
              onChange={(roomId) => setSelectedRoomId(roomId)}
              disabled={currentRooms.length === 0}
              options={currentRooms.map((r) => ({
                label: `${r.room_name} (${r.capacity} khách - Giá gốc ${Number(r.base_price).toLocaleString('vi-VN')}đ)`,
                value: r.id,
              }))}
            />
          </Col>

          <Col xs={24} sm={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Ngày Cần Định Giá</Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <DatePicker
                style={{ flex: 1 }}
                size="large"
                value={dayjs(targetDate)}
                onChange={(_, dateStr) => {
                  const d = Array.isArray(dateStr) ? dateStr[0] : dateStr;
                  setTargetDate(d);
                }}
              />
              <Button
                type="primary"
                icon={<RobotOutlined />}
                size="large"
                loading={loadingAi}
                onClick={() => handleFetchAi()}
                style={{ background: '#6366f1' }}
              >
                Gợi Ý AI
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* AI RECOMMENDATION BOX */}
      {loadingAi ? (
        <Card style={{ borderRadius: 14, marginBottom: 24, textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: '#6366f1', fontWeight: 600 }}>
            Hệ thống AI đang phân tích dữ liệu đối thủ bán kính 3-5km cho ngày {targetDate}...
          </div>
        </Card>
      ) : aiData ? (
        <Card
          style={{
            borderRadius: 14,
            marginBottom: 24,
            border: '2px solid #a855f7',
            background: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)',
          }}
        >
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <RobotOutlined style={{ fontSize: 24, color: '#9333ea' }} />
                <Title level={4} style={{ margin: 0, color: '#6b21a8' }}>
                  Đề Xuất Giá Thông Minh Cho Ngày {aiData.date}
                </Title>
                <Tag color={(aiData.change_percentage ?? 0) >= 0 ? 'green' : 'orange'} style={{ fontSize: 13, fontWeight: 700 }}>
                  {(aiData.change_percentage ?? 0) >= 0 ? `+${aiData.change_percentage}%` : `${aiData.change_percentage}%`}
                </Tag>
              </div>

              <Paragraph style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                {aiData.ai_explanation}
              </Paragraph>

              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Số đối thủ CompSet</Text>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                      {aiData.comp_set_stats?.compset_size ?? 0} homestay
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Giá TB thị trường</Text>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                      {Number(aiData.comp_set_stats?.market_avg_price || 0).toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Tỷ lệ kín phòng</Text>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                      {aiData.comp_set_stats?.occupancy_rate ?? 0}%
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>

            <Col xs={24} lg={10}>
              <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #ddd6fe', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Mức giá AI đề xuất tối ưu doanh thu</Text>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#6b21a8', margin: '8px 0 16px' }}>
                  {appliedPrice.toLocaleString('vi-VN')} VNĐ
                </div>

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  <Text>Điều chỉnh tùy ý:</Text>
                  <InputNumber
                    size="large"
                    step={10000}
                    value={appliedPrice}
                    onChange={(v) => setAppliedPrice(v || 0)}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    style={{ width: 170 }}
                  />
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleFilled />}
                  loading={applying}
                  onClick={handleApply}
                  block
                  style={{ background: '#9333ea', height: 44, fontWeight: 600 }}
                >
                  Xác Nhận Áp Dụng Mức Giá Này
                </Button>
              </div>
            </Col>
          </Row>
        </Card>
      ) : null}

      {/* LỊCH PHÒNG THEO THÁNG */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined />
            <span>Bảng Lịch Giá Phòng Chi Tiết (Bấm vào ngày để định giá AI)</span>
          </div>
        }
        style={{ borderRadius: 14 }}
      >
        {loadingCalendar ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <Calendar
            cellRender={(current, info) => (info.type === 'date' ? dateCellRender(current) : null)}
            onSelect={(date, selectInfo) => {
              if (selectInfo?.source === 'date') {
                handleOpenDayModal(date.format('YYYY-MM-DD'));
              }
            }}
          />
        )}
      </Card>

      {/* MODAL THIẾT LẬP GIÁ CHO 1 NGÀY CỤ THỂ KHI CLICK */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#e0e7ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              <CalendarOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Thiết Lập Giá Ngày {selectedDayDate ? dayjs(selectedDayDate).format('DD/MM/YYYY') : ''}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                {selectedHomestay?.name} • {selectedRoom?.room_name || 'Loại phòng'}
              </div>
            </div>
          </div>
        }
        open={dayModalOpen}
        onCancel={() => setDayModalOpen(false)}
        footer={null}
        width={540}
      >
        <Form form={dayPriceForm} layout="vertical" onFinish={handleSaveDayPrice} style={{ marginTop: 16 }}>
          {/* MỨC GIÁ */}
          <Form.Item
            label={<span style={{ fontWeight: 600, fontSize: 14 }}>Mức giá áp dụng cho ngày này (VNĐ / đêm)</span>}
            name="price"
            rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
          >
            <InputNumber
              min={10000}
              step={10000}
              style={{ width: '100%', fontSize: 18, fontWeight: 700, color: '#4338ca' }}
              size="large"
              placeholder="Nhập giá phòng..."
              formatter={(value) => (value !== undefined && value !== null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
              parser={(value) => (value ? Number(String(value).replace(/\D/g, '')) : 0) as any}
              addonAfter="VNĐ"
            />
          </Form.Item>

          {/* CÁC NÚT ĐIỀU CHỈNH NHANH */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {selectedRoom?.base_price && (
              <Button
                size="small"
                onClick={() => dayPriceForm.setFieldsValue({ price: Number(selectedRoom.base_price) })}
              >
                Giá gốc ({Number(selectedRoom.base_price).toLocaleString('vi-VN')}đ)
              </Button>
            )}
            <Button
              size="small"
              onClick={() => {
                const cur = Number(dayPriceForm.getFieldValue('price') || 0);
                dayPriceForm.setFieldsValue({ price: Math.max(10000, cur - 50000) });
              }}
            >
              -50.000đ
            </Button>
            <Button
              size="small"
              onClick={() => {
                const cur = Number(dayPriceForm.getFieldValue('price') || 0);
                dayPriceForm.setFieldsValue({ price: cur + 50000 });
              }}
            >
              +50.000đ
            </Button>
            <Button
              size="small"
              onClick={() => {
                const cur = Number(dayPriceForm.getFieldValue('price') || 0);
                dayPriceForm.setFieldsValue({ price: cur + 100000 });
              }}
            >
              +100.000đ
            </Button>
          </div>

          {/* TRẠNG THÁI PHÒNG */}
          <Form.Item
            label={<span style={{ fontWeight: 600, fontSize: 14 }}>Trạng thái nhận khách ngày này</span>}
            name="is_available"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Mở bán phòng"
              unCheckedChildren="Khóa phòng / Ngưng nhận"
            />
          </Form.Item>

          <Divider style={{ margin: '14px 0' }} />

          {/* GỢI Ý ĐỊNH GIÁ AI COMPSET */}
          <div
            style={{
              background: 'linear-gradient(135deg, #fbf7ff 0%, #f5f3ff 100%)',
              border: '1px solid #d8b4fe',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#7e22ce' }}>
                <RobotOutlined style={{ fontSize: 16 }} />
                <span>Gợi ý định giá thông minh AI</span>
              </div>
              {dayAiSuggestion && (
                <Tag
                  color={(dayAiSuggestion.change_percentage ?? 0) >= 0 ? 'green' : 'orange'}
                  style={{ fontWeight: 700 }}
                >
                  {(dayAiSuggestion.change_percentage ?? 0) >= 0
                    ? `+${dayAiSuggestion.change_percentage}%`
                    : `${dayAiSuggestion.change_percentage}%`}
                </Tag>
              )}
            </div>

            {dayAiLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#9333ea' }}>
                <Spin size="small" />
                <span style={{ marginLeft: 8, fontSize: 13 }}>AI đang phân tích thị trường CompSet cho ngày này...</span>
              </div>
            ) : dayAiSuggestion ? (
              <div>
                <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 10, lineHeight: 1.5 }}>
                  {dayAiSuggestion.ai_explanation || 'Gợi ý mức giá tối ưu dựa trên nhu cầu thị trường và cạnh tranh lân cận.'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e9d5ff',
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Giá đề xuất tối ưu:</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#7e22ce' }}>
                      {Number(dayAiSuggestion.suggested_price || 0).toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    size="small"
                    style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
                    onClick={() => {
                      if (dayAiSuggestion.suggested_price !== undefined) {
                        dayPriceForm.setFieldsValue({ price: Number(dayAiSuggestion.suggested_price) });
                        message.success('Đã điền mức giá gợi ý từ AI vào ô nhập!');
                      }
                    }}
                  >
                    Dùng giá này
                  </Button>
                </div>

                {dayAiSuggestion.comp_set_stats && (
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                    <span>Đối thủ CompSet: <strong>{dayAiSuggestion.comp_set_stats.compset_size ?? 0}</strong></span>
                    <span>Giá TB: <strong>{Number(dayAiSuggestion.comp_set_stats.market_avg_price || 0).toLocaleString('vi-VN')}đ</strong></span>
                    <span>Tỷ lệ kín: <strong>{dayAiSuggestion.comp_set_stats.occupancy_rate ?? 0}%</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Chưa có dữ liệu gợi ý cho ngày này.</span>
                <Button
                  size="small"
                  icon={<RobotOutlined />}
                  onClick={() => handleFetchAi(selectedDayDate)}
                  loading={loadingAi}
                >
                  Lấy gợi ý AI
                </Button>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button size="large" onClick={() => setDayModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={dayPriceUpdating}
              icon={<CheckCircleFilled />}
              style={{ background: '#4f46e5', fontWeight: 600, minWidth: 150 }}
            >
              Lưu Mức Giá
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL CẬP NHẬT GIÁ HÀNG LOẠT */}
      <Modal
        title="Cập Nhật Giá Hàng Loạt (Batch Update)"
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        footer={null}
      >
        <Form form={batchForm} layout="vertical" onFinish={handleBatchUpdate}>
          <Form.Item
            label="Khoảng thời gian áp dụng"
            name="date_range"
            rules={[{ required: true, message: 'Vui lòng chọn khoảng ngày' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item
            label="Mức giá mới cho tất cả các ngày (VNĐ/đêm)"
            name="price"
            rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
          >
            <InputNumber
              min={50000}
              step={50000}
              style={{ width: '100%' }}
              size="large"
              placeholder="Ví dụ: 850000"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={batchUpdating} style={{ background: '#4f46e5' }}>
            Áp Dụng Cho Tất Cả Các Ngày Đã Chọn
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
