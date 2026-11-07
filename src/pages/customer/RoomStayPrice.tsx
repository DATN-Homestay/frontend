import type { BookingQuote, RoomItem } from '../../types/customer';
import { formatVnd } from '../../features/pricing/pricing.utils';

interface RoomStayPriceProps {
  room: RoomItem | null;
  dateRange: [string, string] | null;
  quote: BookingQuote | null;
  loading?: boolean;
  error?: string | null;
  partner?: boolean;
  detailed?: boolean;
  fontSize?: number;
  color?: string;
}

/** Use the same server quote as checkout; an AI suggestion is not a selling price. */
export default function RoomStayPrice({
  room, dateRange, quote, loading = false, error, partner = false,
  detailed = false, fontSize = 20, color = '#006ce4',
}: RoomStayPriceProps) {
  if (!room) return null;
  const currentQuote = !partner && dateRange && quote &&
    String(quote.room_id) === String(room.id) &&
    quote.check_in_date === dateRange[0] && quote.check_out_date === dateRange[1]
    ? quote : null;
  const nightlyPrices = currentQuote?.nightly_prices ?? [];
  const hasQuote = nightlyPrices.length > 0;
  const varied = new Set(nightlyPrices.map((night) => Number(night.price))).size > 1;
  const needsQuote = !partner && dateRange !== null;

  if (needsQuote && !hasQuote) {
    return (
      <div aria-live="polite" style={{ fontSize: 13, color: '#64748b' }}>
        {loading ? 'Đang tải giá theo ngày…'
          : error ? 'Chưa lấy được giá theo ngày'
            : 'Chọn phòng để xem giá theo ngày'}
      </div>
    );
  }

  const price = hasQuote
    ? Number(currentQuote!.room_subtotal) / nightlyPrices.length
    : room.base_price;
  return (
    <div aria-live="polite">
      <div style={{ fontSize: 12, color: '#64748b' }}>
        {hasQuote ? 'Giá theo ngày đã chọn' : partner ? 'Giá tham khảo' : 'Giá cơ bản'}
      </div>
      <strong style={{ fontSize, color }}>{formatVnd(price)}</strong>
      <span style={{ fontSize: 12, color: '#64748b' }}>
        {varied ? ' /đêm (trung bình)' : ' /đêm'}
      </span>
      {detailed && currentQuote && hasQuote && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Chi tiết giá từng đêm</div>
          {nightlyPrices.map((night) => (
            <div key={night.date} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
              <time dateTime={night.date}>{night.date.split('-').reverse().join('/')}</time>
              <span>{formatVnd(night.price)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 8 }}>
            <span>Tổng {nightlyPrices.length} đêm</span>
            <strong>{formatVnd(currentQuote.total_amount)}</strong>
          </div>
        </div>
      )}
      {detailed && !needsQuote && !partner && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Chọn ngày lưu trú để xem giá chính xác từng đêm.
        </div>
      )}
    </div>
  );
}
