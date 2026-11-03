import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import viVN from 'antd/locale/vi_VN';
import {
  CalendarOutlined,
  CheckOutlined,
  LeftOutlined,
  LockOutlined,
  ReloadOutlined,
  RightOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../services/apiClient';
import { hostService } from '../../services/hostService';
import type {
  HostHomestay,
  PriceCalendarDay,
  PricingSuggestion,
} from '../../types/host';
import PricingSuggestionPanel from '../../features/pricing/PricingSuggestionPanel';
import {
  calendarDateInVietnam,
  formatVnd,
  isPriceWithinBounds,
  suggestionMatchesSelection,
  todayInVietnam,
} from '../../features/pricing/pricing.utils';
import './PriceCalendar.css';

const { Title, Text } = Typography;
const QUOTE_LIFETIME = 6 * 60 * 60 * 1000;
const WEEK_DAYS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
];

interface Selection {
  homestayId: string | null;
  roomId: string | null;
  date: string;
}
interface CalendarSnapshot {
  roomId: string;
  from: string;
  to: string;
  rows: PriceCalendarDay[];
}
interface Quote {
  data: PricingSuggestion;
  receivedAt: number;
}
interface Confirmation {
  suggestion: PricingSuggestion;
  price: number;
}
interface BatchContext {
  roomId: string;
  roomName: string;
  homestayName: string;
}
interface BatchValues {
  date_range: [Dayjs, Dayjs];
  price?: number | null;
  is_available: -1 | 0 | 1;
}
interface DayContext extends BatchContext {
  date: string;
}
interface DayValues {
  price: number;
  is_available: boolean;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isHeld(day: PriceCalendarDay | undefined, now: number): boolean {
  return Boolean(
    day?.locked_until && new Date(day.locked_until).getTime() > now,
  );
}

export default function PriceCalendarPage() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const initialHomestayId = searchParams.get('homestay_id');
  const initialRoomId = searchParams.get('room_id');
  const [selection, setSelection] = useState<Selection>(() => ({
    homestayId: initialHomestayId,
    roomId: initialRoomId,
    date: dayjs(todayInVietnam()).add(2, 'day').format('YYYY-MM-DD'),
  }));
  const selectionRef = useRef(selection);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    dayjs(selection.date).locale('vi').startOf('month'),
  );
  const [homestays, setHomestays] = useState<HostHomestay[]>([]);
  const [listingRevision, setListingRevision] = useState(0);
  const [loadedListingsKey, setLoadedListingsKey] = useState<string | null>(
    null,
  );
  const [listingFailure, setListingFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [calendar, setCalendar] = useState<CalendarSnapshot | null>(null);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [loadedCalendarKey, setLoadedCalendarKey] = useState<string | null>(
    null,
  );
  const [calendarFailure, setCalendarFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [appliedPrice, setAppliedPrice] = useState<number | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [applying, setApplying] = useState(false);
  const [dayContext, setDayContext] = useState<DayContext | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [dayUpdating, setDayUpdating] = useState(false);
  const [dayForm] = Form.useForm<DayValues>();
  const [batchContext, setBatchContext] = useState<BatchContext | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [batchForm] = Form.useForm<BatchValues>();
  const [now, setNow] = useState(Date.now);
  const aiRequest = useRef(0);
  const mounted = useRef(true);

  const changeSelection = useCallback((next: Selection) => {
    selectionRef.current = next;
    setSelection(next);
    aiRequest.current++;
    setQuote(null);
    setAppliedPrice(null);
    setAiError(null);
    setLoadingAi(false);
    setConfirmation(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      mounted.current = false;
      window.clearInterval(clock);
    };
  }, []);

  const listingsKey = `${initialHomestayId}:${initialRoomId}:${listingRevision}`;
  const listingError =
    listingFailure?.key === listingsKey ? listingFailure.message : null;
  const loadingListings = loadedListingsKey !== listingsKey && !listingError;

  useEffect(() => {
    let active = true;
    hostService
      .getMyListings()
      .then((list) => {
        if (!active) return;
        setHomestays(list);
        setLoadedListingsKey(listingsKey);
        setListingFailure(null);
        const current = selectionRef.current;
        const homestay =
          list.find((item) => String(item.id) === current.homestayId) ??
          list.find((item) => String(item.id) === initialHomestayId) ??
          list.find((item) => item.rooms?.length) ??
          list[0];
        const room =
          homestay?.rooms?.find((item) => String(item.id) === current.roomId) ??
          homestay?.rooms?.find((item) => String(item.id) === initialRoomId) ??
          homestay?.rooms?.[0];
        changeSelection({
          ...current,
          homestayId: homestay ? String(homestay.id) : null,
          roomId: room ? String(room.id) : null,
        });
      })
      .catch((error: unknown) => {
        if (active)
          setListingFailure({
            key: listingsKey,
            message: errorMessage(error, 'Không thể tải danh sách homestay.'),
          });
      });
    return () => {
      active = false;
    };
  }, [initialHomestayId, initialRoomId, listingsKey, changeSelection]);

  const homestay = homestays.find(
    (item) => String(item.id) === selection.homestayId,
  );
  const rooms = homestay?.rooms ?? [];
  const room = rooms.find((item) => String(item.id) === selection.roomId);
  const monthKey = visibleMonth.format('YYYY-MM');
  const calendarStart = useMemo(
    () => dayjs(`${monthKey}-01`).locale('vi').startOf('week'),
    [monthKey],
  );
  const calendarFrom = calendarStart.format('YYYY-MM-DD');
  const calendarTo = calendarStart.add(41, 'day').format('YYYY-MM-DD');
  const calendarDays = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => calendarStart.add(index, 'day')),
    [calendarStart],
  );
  const calendarKey = `${selection.roomId}:${calendarFrom}:${calendarTo}:${calendarRevision}`;
  const calendarError =
    calendarFailure?.key === calendarKey ? calendarFailure.message : null;
  const loadingCalendar =
    Boolean(selection.roomId) &&
    loadedCalendarKey !== calendarKey &&
    !calendarError;

  useEffect(() => {
    if (!selection.roomId) return;
    let active = true;
    const roomId = selection.roomId;
    hostService
      .getCalendar(roomId, calendarFrom, calendarTo)
      .then((rows) => {
        if (active) {
          setCalendar({ roomId, from: calendarFrom, to: calendarTo, rows });
          setLoadedCalendarKey(calendarKey);
          setCalendarFailure(null);
        }
      })
      .catch((error: unknown) => {
        if (active)
          setCalendarFailure({
            key: calendarKey,
            message: errorMessage(error, 'Không thể tải lịch giá.'),
          });
      });
    return () => {
      active = false;
    };
  }, [selection.roomId, calendarFrom, calendarTo, calendarKey]);

  const calendarMatches =
    calendar?.roomId === selection.roomId &&
    calendar.from === calendarFrom &&
    calendar.to === calendarTo;
  const calendarByDate = useMemo(
    () =>
      new Map(
        calendarMatches
          ? calendar!.rows.map((day) => [calendarDateInVietnam(day.date), day])
          : [],
      ),
    [calendar, calendarMatches],
  );
  const targetDay = calendarByDate.get(selection.date);
  const calendarReady = calendarMatches && !calendarError && !loadingCalendar;
  const targetInView =
    selection.date >= calendarFrom && selection.date <= calendarTo;
  const targetReady = calendarReady && targetInView;
  const locked = isHeld(targetDay, now);
  const today = todayInVietnam(new Date(now));
  const currentQuote =
    quote && suggestionMatchesSelection(quote.data, selection) ? quote : null;
  const expired = Boolean(
    currentQuote && now - currentQuote.receivedAt >= QUOTE_LIFETIME,
  );
  const saving = applying || batchUpdating || dayUpdating || confirmation !== null;
  const busy = saving || dayContext !== null || batchContext !== null;
  const canRequest = Boolean(
    room &&
    homestay &&
    selection.date >= today &&
    targetReady &&
    !listingError &&
    !saving &&
    batchContext === null,
  );

  const selectDate = (date: Dayjs) => {
    const value = date.format('YYYY-MM-DD');
    if (value < todayInVietnam() || busy) return;
    if (selectionRef.current.date !== value)
      changeSelection({ ...selectionRef.current, date: value });
    setVisibleMonth(date.locale('vi').startOf('month'));
  };

  const fetchSuggestion = useCallback(async () => {
    const requestSelection = { ...selectionRef.current };
    if (
      !canRequest ||
      !requestSelection.homestayId ||
      !requestSelection.roomId ||
      requestSelection.date < todayInVietnam()
    )
      return;
    const requestId = ++aiRequest.current;
    setLoadingAi(true);
    setAiError(null);
    setQuote(null);
    setAppliedPrice(null);
    try {
      const response = await hostService.getPricingSuggestions(
        requestSelection.homestayId,
        requestSelection.date,
        requestSelection.roomId,
      );
      if (!mounted.current || requestId !== aiRequest.current) return;
      if (!suggestionMatchesSelection(response.data, selectionRef.current))
        throw new Error(
          'Kết quả gợi ý không khớp phòng hoặc ngày đã chọn. Vui lòng lấy lại gợi ý.',
        );
      const receivedAt = Date.now();
      setNow(receivedAt);
      setQuote({ data: response.data, receivedAt });
      setAppliedPrice(response.data.suggested_price);
    } catch (error: unknown) {
      if (mounted.current && requestId === aiRequest.current)
        setAiError(
          errorMessage(error, 'Không thể lấy gợi ý giá. Vui lòng thử lại.'),
        );
    } finally {
      if (mounted.current && requestId === aiRequest.current)
        setLoadingAi(false);
    }
  }, [canRequest]);

  const openDay = (date: Dayjs) => {
    if (!room || !homestay || busy || !calendarReady) return;
    const value = date.format('YYYY-MM-DD');
    if (value < todayInVietnam()) return;
    const day = calendarByDate.get(value);
    selectDate(date);
    setDayError(null);
    dayForm.setFieldsValue({
      price: Number(day?.price ?? room.base_price),
      is_available: day ? Number(day.is_available) === 1 : true,
    });
    setDayContext({
      roomId: String(room.id),
      roomName: room.room_name,
      homestayName: homestay.name,
      date: value,
    });
    if (canRequest) void fetchSuggestion();
  };

  const updateDay = async (values: DayValues) => {
    if (!dayContext || dayUpdating) return;
    const context = dayContext;
    if (context.date < todayInVietnam()) {
      setDayError('Vui lòng chọn ngày từ hôm nay trở đi.');
      return;
    }
    setDayUpdating(true);
    setDayError(null);
    try {
      const rows = await hostService.getCalendar(
        context.roomId, context.date, context.date,
      );
      if (rows.some((day) => isHeld(day, Date.now())))
        throw new Error('Ngày này đang có khách giữ chỗ. Vui lòng thử lại sau.');
      await hostService.updateCalendar(context.roomId, {
        date: context.date,
        price: values.price,
        is_available: values.is_available ? 1 : 0,
      });
      if (!mounted.current) return;
      message.success(`Đã lưu giá cho ngày ${dayjs(context.date).format('DD/MM/YYYY')}.`);
      setDayContext(null);
      aiRequest.current++;
      setQuote(null);
      setAppliedPrice(null);
      setAiError(null);
      setLoadingAi(false);
      setCalendarRevision((value) => value + 1);
    } catch (error: unknown) {
      if (mounted.current) {
        setDayError(errorMessage(error, 'Không thể lưu giá ngày.'));
        if (error instanceof ApiError && error.status === 409)
          setCalendarRevision((value) => value + 1);
      }
    } finally {
      if (mounted.current) setDayUpdating(false);
    }
  };

  const openConfirmation = () => {
    if (
      !currentQuote ||
      !targetReady ||
      locked ||
      busy ||
      currentQuote.data.data_status !== 'SUFFICIENT_DATA' ||
      !isPriceWithinBounds(appliedPrice, currentQuote.data.base_price)
    )
      return;
    if (Date.now() - currentQuote.receivedAt >= QUOTE_LIFETIME) {
      setNow(Date.now());
      return;
    }
    setConfirmation({ suggestion: currentQuote.data, price: appliedPrice! });
  };

  const applyPrice = async () => {
    if (
      !confirmation ||
      applying ||
      !suggestionMatchesSelection(confirmation.suggestion, selectionRef.current)
    )
      return;
    const confirmed = confirmation;
    if (
      !currentQuote ||
      Date.now() - currentQuote.receivedAt >= QUOTE_LIFETIME ||
      isHeld(targetDay, Date.now())
    ) {
      setConfirmation(null);
      setNow(Date.now());
      setAiError(
        'Tình trạng ngày đã thay đổi hoặc gợi ý đã cũ. Vui lòng lấy gợi ý mới.',
      );
      return;
    }
    setApplying(true);
    try {
      const response = await hostService.applyPricing({
        homestay_id: String(confirmed.suggestion.homestay_id),
        room_id: confirmed.suggestion.room_id,
        date: confirmed.suggestion.date,
        applied_price: confirmed.price,
      });
      if (!mounted.current) return;
      if (
        response.data.room_id !== confirmed.suggestion.room_id ||
        response.data.date !== confirmed.suggestion.date
      ) {
        throw new Error(
          'Chưa xác nhận được kết quả cập nhật. Vui lòng tải lại lịch giá.',
        );
      }
      message.success(
        `Đã áp dụng ${formatVnd(response.data.new_price)} cho ngày ${dayjs(confirmed.suggestion.date).format('DD/MM/YYYY')}.`,
      );
      setConfirmation(null);
      setQuote(null);
      setCalendarRevision((value) => value + 1);
    } catch (error: unknown) {
      if (!mounted.current) return;
      setConfirmation(null);
      const conflict = error instanceof ApiError && error.status === 409;
      if (conflict) {
        setQuote(null);
        setCalendarRevision((value) => value + 1);
      }
      setAiError(
        errorMessage(error, 'Không thể áp dụng giá. Vui lòng thử lại.'),
      );
    } finally {
      if (mounted.current) setApplying(false);
    }
  };

  const openBatch = () => {
    if (!room || !homestay || busy) return;
    setBatchError(null);
    batchForm.resetFields();
    batchForm.setFieldsValue({
      date_range: [dayjs(selection.date), dayjs(selection.date)],
      price: Number(room.base_price),
      is_available: -1,
    });
    setBatchContext({
      roomId: String(room.id),
      roomName: room.room_name,
      homestayName: homestay.name,
    });
  };

  const updateBatch = async (values: BatchValues) => {
    if (!batchContext || batchUpdating) return;
    const context = batchContext;
    const [from, to] = values.date_range.map((date) =>
      date.format('YYYY-MM-DD'),
    );
    if (from < todayInVietnam() || to < from) {
      setBatchError('Vui lòng chọn khoảng ngày từ hôm nay trở đi.');
      return;
    }
    const availability = values.is_available === 0 || values.is_available === 1
      ? values.is_available
      : undefined;
    if (values.price == null && availability === undefined) {
      setBatchError('Vui lòng nhập giá hoặc chọn trạng thái phòng cần cập nhật.');
      return;
    }
    setBatchUpdating(true);
    setBatchError(null);
    try {
      const rows = await hostService.getCalendar(context.roomId, from, to);
      const held = rows.filter((day) => isHeld(day, Date.now()));
      if (held.length)
        throw new Error(
          `Ngày ${held.map((day) => dayjs(day.date).format('DD/MM/YYYY')).join(', ')} đang có khách giữ chỗ. Vui lòng chọn khoảng ngày khác.`,
        );
      await hostService.batchUpdateCalendar(context.roomId, {
        from_date: from,
        to_date: to,
        price: values.price ?? undefined,
        is_available: availability,
      });
      if (!mounted.current) return;
      message.success(`Đã cập nhật lịch phòng cho ${context.roomName}.`);
      setBatchContext(null);
      if (selectionRef.current.roomId === context.roomId) {
        aiRequest.current++;
        setQuote(null);
        setAiError(null);
        setLoadingAi(false);
        setCalendarRevision((value) => value + 1);
      }
    } catch (error: unknown) {
      if (mounted.current)
        setBatchError(errorMessage(error, 'Không thể cập nhật giá hàng loạt.'));
    } finally {
      if (mounted.current) setBatchUpdating(false);
    }
  };

  return (
    <ConfigProvider locale={viVN}>
      <div className="host-pricing-page">
        <div className="host-pricing-header">
          <div>
            <Text className="host-pricing-eyebrow">QUẢN LÝ DOANH THU</Text>
            <Title level={2}>Lịch giá, tình trạng phòng & gợi ý AI</Title>
            <Text type="secondary">
              Chọn phòng và ngày để xem gợi ý từ dữ liệu chỗ nghỉ tương đồng
              trong cùng thành phố.
            </Text>
          </div>
          <Button
            icon={<CalendarOutlined />}
            onClick={openBatch}
            disabled={!room || busy || loadingListings}
          >
            Cập nhật giá & tình trạng hàng loạt
          </Button>
        </div>

        {listingError && (
          <Alert
            type="error"
            showIcon
            title="Không tải được danh sách homestay"
            description={listingError}
            action={
              <Button onClick={() => setListingRevision((value) => value + 1)}>
                Thử lại
              </Button>
            }
          />
        )}

        <Card className="host-pricing-selection">
          {loadingListings ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : homestays.length ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <label htmlFor="pricing-homestay">Homestay</label>
                <Select
                  id="pricing-homestay"
                  size="large"
                  value={selection.homestayId}
                  disabled={busy}
                  options={homestays.map((item) => ({
                    value: String(item.id),
                    label: `${item.name} · ${item.city}`,
                  }))}
                  onChange={(id: string) => {
                    const next = homestays.find(
                      (item) => String(item.id) === id,
                    );
                    changeSelection({
                      ...selectionRef.current,
                      homestayId: id,
                      roomId: next?.rooms?.[0]
                        ? String(next.rooms[0].id)
                        : null,
                    });
                  }}
                />
              </Col>
              <Col xs={24} md={8}>
                <label htmlFor="pricing-room">Phòng</label>
                <Select
                  id="pricing-room"
                  size="large"
                  value={selection.roomId}
                  disabled={!rooms.length || busy}
                  placeholder="Chưa có phòng"
                  options={rooms.map((item) => ({
                    value: String(item.id),
                    label: `${item.room_name} · ${item.capacity} khách`,
                  }))}
                  onChange={(id: string) =>
                    changeSelection({ ...selectionRef.current, roomId: id })
                  }
                />
              </Col>
              <Col xs={24} md={8}>
                <label htmlFor="pricing-date">Ngày nhận gợi ý</label>
                <DatePicker
                  id="pricing-date"
                  size="large"
                  value={dayjs(selection.date).locale('vi')}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabled={busy || !room}
                  disabledDate={(date) =>
                    date.format('YYYY-MM-DD') < todayInVietnam()
                  }
                  onChange={(date) => {
                    if (date) selectDate(date);
                  }}
                />
              </Col>
            </Row>
          ) : !listingError ? (
            <Empty description="Bạn chưa có homestay để quản lý giá.">
              <Link to="/host/listings">
                <Button type="primary">Quản lý homestay</Button>
              </Link>
            </Empty>
          ) : null}
          {!loadingListings && homestay && !room && (
            <Alert
              type="info"
              showIcon
              title="Homestay chưa có phòng"
              description="Thêm phòng và giá gốc trong phần Quản lý homestay để nhận gợi ý giá."
            />
          )}
        </Card>

        {room && (
          <>
            <div className="host-pricing-context">
              <div>
                <Text type="secondary">Ngày đang chọn</Text>
                <strong>{dayjs(selection.date).format('DD/MM/YYYY')}</strong>
                <span>
                  {room.room_name} · {room.capacity} khách
                </span>
              </div>
              <div>
                <Text type="secondary">Giá đang bán</Text>
                <strong>
                  {targetReady
                    ? formatVnd(targetDay?.price ?? room.base_price)
                    : '—'}
                </strong>
                <span>
                  {!targetReady
                    ? 'Chờ lịch của ngày đang chọn'
                    : locked
                      ? 'Đang có khách giữ chỗ'
                      : targetDay && Number(targetDay.is_available) !== 1
                        ? 'Không mở bán'
                        : 'Giá mỗi đêm'}
                </span>
              </div>
              <div className="host-pricing-get-quote">
                <Button
                  type="primary"
                  size="large"
                  icon={<RobotOutlined />}
                  loading={loadingAi}
                  disabled={!canRequest}
                  onClick={() => void fetchSuggestion()}
                >
                  {currentQuote ? 'Lấy gợi ý mới' : 'Nhận gợi ý giá'}
                </Button>
                <Text type="secondary">
                  Giá bán chỉ thay đổi sau khi bạn xác nhận.
                </Text>
              </div>
            </div>

            {!targetInView && (
              <Alert
                type="info"
                showIcon
                title="Ngày nhận gợi ý nằm ngoài lịch đang xem"
                description="Chọn một ngày trong lịch bên dưới hoặc quay về ngày đang chọn để tiếp tục."
                action={
                  <Button
                    onClick={() =>
                      setVisibleMonth(
                        dayjs(selection.date).locale('vi').startOf('month'),
                      )
                    }
                  >
                    Về ngày đang chọn
                  </Button>
                }
              />
            )}

            {locked && !currentQuote && (
              <Alert
                type="warning"
                showIcon
                icon={<LockOutlined />}
                title="Ngày này đang có khách giữ chỗ"
                description="Bạn có thể xem gợi ý. Việc áp dụng giá được tạm khóa đến khi giao dịch kết thúc."
              />
            )}
            {aiError && (
              <Alert
                type="error"
                showIcon
                title="Chưa thể hoàn tất yêu cầu giá"
                description={aiError}
                action={
                  <Button
                    disabled={!canRequest}
                    loading={loadingAi}
                    onClick={() => void fetchSuggestion()}
                  >
                    Lấy lại gợi ý
                  </Button>
                }
              />
            )}
            {loadingAi ? (
              <Card className="host-pricing-loading" aria-live="polite">
                <Space>
                  <RobotOutlined />
                  <Text strong>
                    Đang phân tích giá cho ngày{' '}
                    {dayjs(selection.date).format('DD/MM/YYYY')}…
                  </Text>
                </Space>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            ) : currentQuote ? (
              <PricingSuggestionPanel
                suggestion={currentQuote.data}
                appliedPrice={appliedPrice}
                onPriceChange={setAppliedPrice}
                onApply={openConfirmation}
                onDiscard={() => {
                  setQuote(null);
                  setAppliedPrice(null);
                }}
                applying={applying}
                disabled={!targetReady || busy}
                locked={locked}
                expired={expired}
              />
            ) : (
              !aiError && (
                <Card className="host-pricing-placeholder">
                  <RobotOutlined />
                  <div>
                    <Text strong>Gợi ý giá cho từng ngày lưu trú</Text>
                    <p>
                      AI so sánh giá, tình trạng phòng, ngày lễ/cuối tuần và
                      thời gian đặt trước. Nhấn “Nhận gợi ý giá” để bắt đầu.
                    </p>
                  </div>
                </Card>
              )
            )}

            <Card
              className="host-pricing-calendar"
              title={
                <Space>
                  <CalendarOutlined />
                  <span>Lịch giá phòng</span>
                </Space>
              }
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  loading={loadingCalendar}
                  disabled={busy}
                  onClick={() => setCalendarRevision((value) => value + 1)}
                >
                  Tải lại
                </Button>
              }
            >
              <div className="host-pricing-calendar-toolbar">
                <Space>
                  <Button
                    aria-label="Tháng trước"
                    icon={<LeftOutlined />}
                    disabled={busy}
                    onClick={() =>
                      setVisibleMonth((date) => date.subtract(1, 'month'))
                    }
                  />
                  <DatePicker
                    picker="month"
                    aria-label="Tháng đang xem"
                    format="[Tháng] MM/YYYY"
                    value={visibleMonth}
                    allowClear={false}
                    disabled={busy}
                    onChange={(date) => {
                      if (date)
                        setVisibleMonth(date.locale('vi').startOf('month'));
                    }}
                  />
                  <Button
                    aria-label="Tháng sau"
                    icon={<RightOutlined />}
                    disabled={busy}
                    onClick={() =>
                      setVisibleMonth((date) => date.add(1, 'month'))
                    }
                  />
                </Space>
                <Button
                  disabled={busy}
                  onClick={() => selectDate(dayjs(todayInVietnam()))}
                >
                  Hôm nay
                </Button>
              </div>
              {calendarError && (
                <Alert
                  type="error"
                  showIcon
                  title="Không tải được lịch giá"
                  description={calendarError}
                />
              )}
              <div
                className="host-pricing-calendar-scroll"
                aria-busy={loadingCalendar}
              >
                <div
                  className="host-pricing-calendar-grid"
                  role="group"
                  aria-label="Chọn ngày xem gợi ý giá"
                >
                  {WEEK_DAYS.map((day) => (
                    <div className="host-pricing-weekday" key={day}>
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((date) => {
                    const key = date.format('YYYY-MM-DD');
                    const day = calendarByDate.get(key);
                    const held = isHeld(day, now);
                    const closed = day && Number(day.is_available) !== 1;
                    const selected = key === selection.date;
                    const price = calendarReady
                      ? formatVnd(day?.price ?? room.base_price)
                      : '—';
                    return (
                      <button
                        type="button"
                        key={key}
                        aria-label={`${date.format('DD/MM/YYYY')}, ${price}${held ? ', đang giữ chỗ' : closed ? ', không mở bán' : ''}`}
                        aria-pressed={selected}
                        className={`host-pricing-day${selected ? ' is-selected' : ''}${date.format('YYYY-MM') !== monthKey ? ' is-outside' : ''}${held ? ' is-held' : closed ? ' is-closed' : Number(day?.is_ai_applied) === 1 ? ' is-ai' : day ? ' is-available' : ''}`}
                        disabled={key < today || busy || !calendarReady}
                        onClick={() => openDay(date)}
                      >
                        <span className="host-pricing-day-number">
                          {date.date()}
                          {key === today && (
                            <span className="host-pricing-today-dot" />
                          )}
                        </span>
                        <strong>{price}</strong>
                        <span className="host-pricing-day-status">
                          {!calendarReady ? (
                            'Chưa tải lịch'
                          ) : held ? (
                            <>
                              <LockOutlined /> Đang giữ chỗ
                            </>
                          ) : closed ? (
                            'Đã đặt / Không mở bán'
                          ) : Number(day?.is_ai_applied) === 1 ? (
                            <>
                              <CheckOutlined /> Đã áp dụng AI
                            </>
                          ) : day ? (
                            'Còn trống'
                          ) : (
                            'Giá gốc'
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="host-pricing-calendar-legend">
                <Tag color="purple">Ngày đang chọn</Tag>
                <Tag color="gold">Đang giữ chỗ</Tag>
                <Tag color="red">Đã đặt / Không mở bán</Tag>
                <Tag color="green">Còn trống</Tag>
                <Text type="secondary">
                  Ngày chưa thiết lập lịch dùng giá gốc{' '}
                  {formatVnd(room.base_price)}. Thay đổi giá không mở lại phòng
                  đã đóng bán.
                </Text>
              </div>
            </Card>
          </>
        )}

        <Modal
          title={`Thiết lập giá ngày ${dayContext ? dayjs(dayContext.date).format('DD/MM/YYYY') : ''}`}
          open={dayContext !== null}
          footer={null}
          onCancel={() => {
            if (!dayUpdating) setDayContext(null);
          }}
          closable={!dayUpdating}
          mask={{ closable: !dayUpdating }}
        >
          {dayContext && (
            <>
              <p><strong>{dayContext.homestayName}</strong><br />{dayContext.roomName}</p>
              {locked && (
                <Alert type="warning" showIcon title="Ngày này đang có khách giữ chỗ" />
              )}
              {dayError && (
                <Alert type="error" showIcon title="Chưa thể lưu giá" description={dayError} />
              )}
              <Form<DayValues>
                form={dayForm}
                layout="vertical"
                onFinish={(values) => void updateDay(values)}
                disabled={dayUpdating || locked}
              >
                <Form.Item
                  name="price"
                  label="Giá mỗi đêm (VNĐ)"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mức giá.' },
                    { type: 'number', min: 0.01, message: 'Giá phải lớn hơn 0.' },
                  ]}
                >
                  <InputNumber min={0.01} precision={2} step={10000} style={{ width: '100%' }} />
                </Form.Item>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Button onClick={() => dayForm.setFieldValue('price', Number(room?.base_price))}>
                    Giá gốc
                  </Button>
                  {[-50000, 50000, 100000].map((amount) => (
                    <Button key={amount} onClick={() => dayForm.setFieldValue(
                      'price', Math.max(0.01, Number(dayForm.getFieldValue('price') ?? 0) + amount),
                    )}>
                      {amount > 0 ? '+' : ''}{formatVnd(amount)}
                    </Button>
                  ))}
                </Space>
                <Form.Item name="is_available" label="Trạng thái nhận khách" valuePropName="checked">
                  <Switch checkedChildren="Mở bán phòng" unCheckedChildren="Ngưng nhận khách" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={dayUpdating} block>
                  Lưu mức giá
                </Button>
              </Form>
              <div style={{ marginTop: 16 }}>
                <Button icon={<RobotOutlined />} loading={loadingAi} disabled={!canRequest} onClick={() => void fetchSuggestion()}>
                  {currentQuote ? 'Lấy gợi ý mới' : 'Nhận gợi ý giá'}
                </Button>
                {aiError && <Alert type="error" showIcon title={aiError} />}
                {currentQuote && (
                  <>
                    <p>{currentQuote.data.ai_explanation}</p>
                    {currentQuote.data.data_status === 'SUFFICIENT_DATA' && !expired ? (
                      <Button
                        disabled={dayUpdating || locked || !isPriceWithinBounds(
                          currentQuote.data.suggested_price, currentQuote.data.base_price,
                        )}
                        onClick={() => dayForm.setFieldValue('price', currentQuote.data.suggested_price)}
                      >
                        Dùng giá gợi ý {formatVnd(currentQuote.data.suggested_price)}
                      </Button>
                    ) : (
                      <Text type="secondary">{expired ? 'Gợi ý đã hết hiệu lực. Vui lòng lấy lại.' : 'Chưa đủ dữ liệu để đề xuất giá.'}</Text>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </Modal>

        <Modal
          title="Xác nhận áp dụng giá"
          open={confirmation !== null}
          onCancel={() => {
            if (!applying) setConfirmation(null);
          }}
          onOk={() => void applyPrice()}
          confirmLoading={applying}
          okText="Xác nhận áp dụng"
          cancelText="Quay lại"
          cancelButtonProps={{ disabled: applying }}
          closable={!applying}
          mask={{ closable: !applying }}
        >
          {confirmation && (
            <div className="host-pricing-confirmation">
              <p>
                <strong>{homestay?.name}</strong>
                <br />
                {room?.room_name} ·{' '}
                {dayjs(confirmation.suggestion.date).format('DD/MM/YYYY')}
              </p>
              <div>
                <span>Giá đang bán</span>
                <strong>
                  {formatVnd(confirmation.suggestion.current_price)}
                </strong>
              </div>
              <div>
                <span>Giá sau xác nhận</span>
                <strong>{formatVnd(confirmation.price)}</strong>
              </div>
              <Alert
                type="info"
                showIcon
                title="Chỉ cập nhật giá cho phòng và ngày này. Tình trạng phòng được giữ nguyên."
              />
            </div>
          )}
        </Modal>

        <Modal
          className="host-pricing-batch"
          title="Cập nhật giá & tình trạng phòng hàng loạt"
          open={batchContext !== null}
          footer={null}
          onCancel={() => {
            if (!batchUpdating) setBatchContext(null);
          }}
          closable={!batchUpdating}
          mask={{ closable: !batchUpdating }}
        >
          {batchContext && (
            <>
              <p>
                <strong>{batchContext.homestayName}</strong>
                <br />
                {batchContext.roomName}
              </p>
              <Alert
                type="info"
                showIcon
                title="Cập nhật lịch phòng trong khoảng ngày chọn"
                description="Bạn có thể đổi giá, khóa phòng khi có khách đặt offline hoặc mở lại cho khách đặt online."
              />
              {batchError && (
                <Alert
                  className="host-pricing-batch-error"
                  type="error"
                  showIcon
                  title="Chưa thể cập nhật"
                  description={batchError}
                />
              )}
              <Form<BatchValues>
                form={batchForm}
                layout="vertical"
                onFinish={(values) => void updateBatch(values)}
                disabled={batchUpdating}
              >
                <Form.Item name="is_available" label="Trạng thái nhận khách">
                  <Select
                    options={[
                      { value: -1, label: 'Giữ nguyên trạng thái phòng' },
                      { value: 0, label: 'Đã đặt offline / Khóa phòng' },
                      { value: 1, label: 'Còn trống / Mở nhận khách online' },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  name="date_range"
                  label="Khoảng ngày"
                  rules={[
                    { required: true, message: 'Vui lòng chọn khoảng ngày.' },
                  ]}
                >
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    allowClear={false}
                    disabledDate={(date) =>
                      date.format('YYYY-MM-DD') < todayInVietnam()
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="price"
                  label="Giá mỗi đêm (VNĐ, để trống nếu giữ nguyên giá)"
                  rules={[
                    {
                      type: 'number',
                      min: 0.01,
                      message: 'Giá phải lớn hơn 0.',
                    },
                  ]}
                >
                  <InputNumber min={0.01} precision={2} step={10000} />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={batchUpdating}
                >
                  Áp dụng cho khoảng ngày đã chọn
                </Button>
              </Form>
            </>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
}
