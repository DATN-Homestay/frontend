import { useState, type ReactNode } from 'react';
import { Button, DatePicker, Popover, Select, Tag, Typography } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  MinusOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ALL_LOCATIONS_LIST, VIETNAM_LOCATIONS, POPULAR_DESTINATIONS } from '../../data/vietnamLocations';
import type { SearchCriteria } from '../../utils/homestaySearch';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export type SearchBarValue = Pick<SearchCriteria, 'city' | 'district' | 'checkIn' | 'checkOut' | 'adults' | 'children' | 'rooms'>;

interface Props {
  value: SearchBarValue;
  onSubmit: (value: SearchBarValue) => void;
  /** hero: thanh lớn trên banner trang chủ; compact: đầu trang kết quả */
  variant?: 'hero' | 'compact';
  /** Nút phụ đặt cạnh nút Tìm kiếm (ví dụ "Xem tất cả") */
  extra?: ReactNode;
}

const ALL_CITY = 'Tất cả điểm đến';
const ALL_DISTRICT = 'Tất cả quận/huyện';

/**
 * Ô tìm kiếm Địa điểm + Ngày + Khách & phòng (tách từ trang chủ). Chỉ giữ trạng thái tạm,
 * bấm "Tìm kiếm" mới gọi onSubmit. Cha nên đổi `key` khi giá trị ngoài đổi để nạp lại.
 */
export default function SearchBar({ value, onSubmit, variant = 'hero', extra }: Props) {
  const [city, setCity] = useState<string | undefined>(value.city);
  const [district, setDistrict] = useState<string | undefined>(value.district);
  const [dates, setDates] = useState<[string, string] | null>(
    value.checkIn && value.checkOut ? [value.checkIn, value.checkOut] : null,
  );
  // Mặc định không lọc theo sức chứa để hiện đủ dữ liệu, giống trang chủ trước đây
  const [filterByGuests, setFilterByGuests] = useState(value.adults !== undefined);
  const [guests, setGuests] = useState({
    adults: value.adults ?? 2,
    children: value.children ?? 0,
    rooms: value.rooms ?? 1,
  });
  const [guestOpen, setGuestOpen] = useState(false);

  const compact = variant === 'compact';

  const submit = (useGuests = filterByGuests) => {
    onSubmit({
      city,
      district,
      checkIn: dates?.[0],
      checkOut: dates?.[1],
      ...(useGuests ? guests : { adults: undefined, children: undefined, rooms: undefined }),
    });
  };

  const counter = (label: string, key: 'adults' | 'children' | 'rooms', min: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
        {label}
      </Text>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          overflow: 'hidden',
          height: 38,
        }}
      >
        <Button
          type="text"
          aria-label={`Giảm ${label.toLowerCase()}`}
          icon={<MinusOutlined />}
          disabled={guests[key] <= min}
          onClick={() => setGuests((g) => ({ ...g, [key]: Math.max(min, g[key] - 1) }))}
          style={{ width: 38, height: 38 }}
        />
        <Text strong style={{ width: 32, textAlign: 'center', fontSize: 15 }}>
          {guests[key]}
        </Text>
        <Button
          type="text"
          aria-label={`Tăng ${label.toLowerCase()}`}
          icon={<PlusOutlined />}
          disabled={guests[key] >= max}
          onClick={() => setGuests((g) => ({ ...g, [key]: Math.min(max, g[key] + 1) }))}
          style={{ width: 38, height: 38 }}
        />
      </div>
    </div>
  );

  const guestPopover = (
    <div style={{ width: 280, padding: '8px 4px' }}>
      {counter('Người lớn', 'adults', 1, 16)}
      {counter('Trẻ em', 'children', 0, 10)}
      {counter('Phòng', 'rooms', 1, 10)}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button
          type="primary"
          style={{ flex: 1, background: '#6366f1', borderRadius: 8, height: 38, fontWeight: 600 }}
          onClick={() => {
            setFilterByGuests(true);
            setGuestOpen(false);
          }}
        >
          Áp dụng
        </Button>
        <Button
          style={{ flex: 1, borderRadius: 8, height: 38 }}
          onClick={() => {
            setFilterByGuests(false);
            setGuestOpen(false);
          }}
        >
          Bất kỳ
        </Button>
      </div>
    </div>
  );

  const label = (text: string) =>
    !compact && (
      <Text type="secondary" style={{ fontSize: 11, display: 'block', paddingLeft: 4, fontWeight: 600 }}>
        {text}
      </Text>
    );

  const divider = <div style={{ width: 1, height: compact ? 28 : 36, background: '#e2e8f0' }} />;

  return (
    <div
      style={{
        background: '#ffffff',
        padding: compact ? '8px 10px' : '12px 14px',
        borderRadius: compact ? 14 : 18,
        boxShadow: compact ? '0 4px 14px rgba(15,23,42,0.08)' : '0 20px 30px rgba(0,0,0,0.25)',
        border: compact ? '2px solid #6366f1' : undefined,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div style={{ flex: '1 1 180px', textAlign: 'left', minWidth: 160 }}>
        {label('TỈNH / THÀNH PHỐ')}
        <Select
          showSearch
          allowClear
          aria-label="Tỉnh / thành phố"
          placeholder="Tất cả điểm đến (Toàn quốc)"
          value={city || undefined}
          onChange={(val) => {
            setCity(val && val !== ALL_CITY ? val : undefined);
            setDistrict(undefined);
          }}
          filterOption={(input, option) => ((option?.value as string) || '').toLowerCase().includes(input.toLowerCase())}
          suffixIcon={<EnvironmentOutlined style={{ color: '#6366f1' }} />}
          style={{ width: '100%' }}
          variant="borderless"
          options={[
            {
              value: ALL_CITY,
              label: <span style={{ fontWeight: 700, color: '#4f46e5' }}>🌟 Tất cả điểm đến (Toàn quốc)</span>,
            },
            ...ALL_LOCATIONS_LIST.map((c) => ({
              value: c,
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: POPULAR_DESTINATIONS.includes(c) ? 600 : 400 }}>{c}</span>
                  {POPULAR_DESTINATIONS.includes(c) && (
                    <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', border: 'none' }}>
                      HOT
                    </Tag>
                  )}
                </div>
              ),
            })),
          ]}
        />
      </div>

      {divider}

      <div style={{ flex: '1 1 170px', textAlign: 'left', minWidth: 150 }}>
        {label('QUẬN / HUYỆN / KHU VỰC')}
        <Select
          showSearch
          allowClear
          aria-label="Quận / huyện"
          placeholder="Tất cả quận/huyện"
          value={district || undefined}
          onChange={(val) => setDistrict(val && val !== ALL_DISTRICT ? val : undefined)}
          filterOption={(input, option) => ((option?.value as string) || '').toLowerCase().includes(input.toLowerCase())}
          suffixIcon={<HomeOutlined style={{ color: '#6366f1' }} />}
          style={{ width: '100%' }}
          variant="borderless"
          options={[
            { value: ALL_DISTRICT, label: ALL_DISTRICT },
            ...((city && VIETNAM_LOCATIONS[city]) || [])
              .filter((w) => w !== ALL_DISTRICT)
              .map((d) => ({ value: d, label: d })),
          ]}
        />
      </div>

      {divider}

      <div style={{ flex: '1.4 1 230px', textAlign: 'left', minWidth: 220 }}>
        {label('NGÀY NHẬN - TRẢ PHÒNG')}
        <RangePicker
          allowClear
          placeholder={['Ngày đi', 'Ngày về']}
          format="DD/MM/YYYY"
          value={dates ? [dayjs(dates[0]), dayjs(dates[1])] : null}
          disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
          style={{ width: '100%', border: 'none' }}
          suffixIcon={<CalendarOutlined style={{ color: '#6366f1' }} />}
          onChange={(range) => {
            if (range?.[0] && range?.[1]) {
              setDates([range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')]);
            } else {
              setDates(null);
            }
          }}
        />
      </div>

      {divider}

      <div style={{ flex: '1.4 1 220px', textAlign: 'left', minWidth: 200 }}>
        {label('KHÁCH & PHÒNG')}
        <Popover content={guestPopover} trigger="click" open={guestOpen} onOpenChange={setGuestOpen} placement="bottomRight">
          <div
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, height: 32 }}
          >
            <UserOutlined style={{ color: '#6366f1' }} />
            <Text strong style={{ color: '#1e293b', fontSize: 13, whiteSpace: 'nowrap' }}>
              {filterByGuests
                ? `${guests.adults} người lớn · ${guests.children} trẻ em · ${guests.rooms} phòng`
                : 'Số khách bất kỳ'}
            </Text>
          </div>
        </Popover>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button
          type="primary"
          size="large"
          icon={<SearchOutlined />}
          onClick={() => submit()}
          style={{
            height: compact ? 42 : 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            padding: '0 24px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
          }}
        >
          Tìm kiếm
        </Button>
        {extra}
      </div>
    </div>
  );
}
