import type { RoomItem } from '../../types/customer';
import { formatVnd, todayInVietnam } from './pricing.utils';

export default function RoomDailyPrices({ room }: { room: RoomItem }) {
  const today = todayInVietnam();
  const prices = (room.daily_prices ?? [])
    .filter((day) => day.date >= today)
    .toSorted((a, b) => a.date.localeCompare(b.date));

  return (
    <section aria-label={`Giá theo ngày của ${room.room_name}`} style={{ fontSize: 13 }}>
      <div style={{ maxHeight: 220, overflow: 'auto' }}>
        {prices.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <caption style={{ textAlign: 'left', fontWeight: 600, marginBottom: 8 }}>Giá theo ngày</caption>
            <thead>
              <tr><th scope="col">Đêm lưu trú</th><th scope="col">Giá phòng</th></tr>
            </thead>
            <tbody>
              {prices.map((day) => (
                <tr key={day.date}>
                  <td style={{ padding: '6px 10px 6px 0' }}>
                    <time dateTime={day.date}>{day.date.split('-').reverse().join('/')}</time>
                  </td>
                  <td style={{ padding: '6px 0' }}>
                    <strong>{formatVnd(day.price)}</strong>
                    {day.is_ai_applied === 1 && (
                      <span style={{ display: 'block', color: '#4338ca', fontSize: 11 }}>Đã áp dụng giá AI</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div>Chưa thiết lập giá riêng theo ngày.</div>}
      </div>
      <p style={{ color: '#64748b', fontSize: 12, margin: '8px 0 0' }}>
        Ngày chưa có giá riêng áp dụng giá cơ bản {formatVnd(room.base_price)}/đêm.
      </p>
    </section>
  );
}
