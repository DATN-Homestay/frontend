import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EMPTY_CRITERIA, applyFilters, computeFacets, matchesGuests, matchesLocation, minNightlyPrice,
  nightsBetween, parseCriteria, sortHomestays, toSearchParams, type SearchCriteria,
} from '../src/utils/homestaySearch.ts';
import type { HomestayItem } from '../src/types/customer.ts';

let seq = 0;
function hs(over: Partial<HomestayItem> & { price?: number; type?: string; fac?: string[]; caps?: number[] }): HomestayItem {
  const id = String(++seq);
  const { price = 800_000, type = 'HOMESTAY', fac = [], caps = [2], ...rest } = over;
  return {
    id,
    name: `Nhà ${id}`,
    city: 'Đà Lạt',
    address: 'Phường 1',
    latitude: 0,
    longitude: 0,
    average_rating: 4.2,
    total_reviews: 10,
    is_claimed: 0,
    cancellation_policy: 'FLEXIBLE',
    source_url: 'https://www.booking.com/hotel/vn/x.html',
    amenities_json: { property_type: type, popular_facilities: fac },
    rooms: caps.map((capacity, i) => ({
      id: `${id}-${i}`, homestay_id: id, room_name: 'P', capacity, base_price: price + i * 100_000,
    })),
    ...rest,
  } as HomestayItem;
}

const c = (over: Partial<SearchCriteria> = {}): SearchCriteria => ({ ...EMPTY_CRITERIA, ...over });

describe('địa điểm & số khách', () => {
  it('tỉnh dùng bảng alias: Lâm Đồng gồm Đà Lạt và Bảo Lộc, không gồm Hà Nội', () => {
    assert.equal(matchesLocation(hs({ city: 'Đà Lạt' }), 'Lâm Đồng'), true);
    assert.equal(matchesLocation(hs({ city: 'Bảo Lộc' }), 'Lâm Đồng'), true);
    assert.equal(matchesLocation(hs({ city: 'Hà Nội' }), 'Lâm Đồng'), false);
    assert.equal(matchesLocation(hs({ city: 'Hà Nội' }), 'Tất cả điểm đến'), true);
  });

  it('homestay thiếu tên thành phố không còn khớp mọi tỉnh', () => {
    assert.equal(matchesLocation(hs({ city: '', address: 'Hội An' }), 'Đà Lạt'), false);
    assert.equal(matchesLocation(hs({ city: '', address: '12 Phan Đình Phùng, Đà Lạt' }), 'Đà Lạt'), true);
  });

  it('quận/huyện bỏ tiền tố và khớp theo địa chỉ', () => {
    const h = hs({ city: 'Hà Nội', address: '5 Quảng An, Tây Hồ' });
    assert.equal(matchesLocation(h, 'Hà Nội', 'Quận Tây Hồ'), true);
    assert.equal(matchesLocation(h, 'Hà Nội', 'Quận Ba Đình'), false);
  });

  it('nhiều phòng: cộng sức chứa của các phòng lớn nhất', () => {
    const h = hs({ caps: [4, 2, 2] });
    assert.equal(matchesGuests(h, 4, 1), true);
    assert.equal(matchesGuests(h, 5, 1), false);
    assert.equal(matchesGuests(h, 6, 2), true);
    assert.equal(matchesGuests(h, 7, 2), false);
    assert.equal(matchesGuests(h, 2, 4), false); // chỉ có 3 phòng
  });

  it('chỉ lọc số khách khi có adults', () => {
    const list = [hs({ caps: [2] }), hs({ caps: [6] })];
    assert.equal(applyFilters(list, c()).length, 2);
    assert.equal(applyFilters(list, c({ adults: 4, children: 1, rooms: 1 })).length, 1);
  });
});

describe('bộ lọc bên trái', () => {
  const villaPool = hs({ type: 'VILLA', price: 3_000_000, fac: ['Hồ bơi ngoài trời', 'WiFi miễn phí', 'Bữa sáng'], average_rating: 4.8 });
  const cheap = hs({ price: 300_000, fac: ['WiFi miễn phí'], average_rating: 3.6 });
  const mid = hs({ type: 'APARTMENT', price: 900_000, fac: ['WiFi miễn phí', 'Chỗ đỗ xe miễn phí', 'Có bếp riêng'], average_rating: 4.1, is_claimed: 1, source_url: undefined });
  const list = [villaPool, cheap, mid];

  it('giá theo giá phòng thấp nhất; nhiều mốc giá là HOẶC', () => {
    assert.equal(minNightlyPrice(mid), 900_000);
    assert.deepEqual(applyFilters(list, c({ prices: ['lt500'] })).map((h) => h.id), [cheap.id]);
    assert.deepEqual(applyFilters(list, c({ prices: ['lt500', '2m-5m'] })).map((h) => h.id), [villaPool.id, cheap.id]);
  });

  it('điểm tối thiểu, loại chỗ ở, tiện nghi (VÀ), bữa ăn, hình thức đặt', () => {
    assert.deepEqual(applyFilters(list, c({ minRating: 4 })).map((h) => h.id), [villaPool.id, mid.id]);
    assert.deepEqual(applyFilters(list, c({ types: ['VILLA', 'APARTMENT'] })).map((h) => h.id), [villaPool.id, mid.id]);
    assert.deepEqual(applyFilters(list, c({ amenities: ['WiFi miễn phí', 'Chỗ đỗ xe miễn phí'] })).map((h) => h.id), [mid.id]);
    assert.deepEqual(applyFilters(list, c({ meals: ['breakfast'] })).map((h) => h.id), [villaPool.id]);
    assert.deepEqual(applyFilters(list, c({ meals: ['kitchen'] })).map((h) => h.id), [mid.id]);
    assert.deepEqual(applyFilters(list, c({ sources: ['stayai'] })).map((h) => h.id), [mid.id]);
  });

  it('số đếm của một nhóm không bị chính nhóm đó làm về 0', () => {
    const f = computeFacets(list, c({ types: ['VILLA'] }));
    const count = (key: string) => f.type.find((o) => o.key === key)?.count;
    assert.equal(count('VILLA'), 1);
    assert.equal(count('HOMESTAY'), 1); // vẫn thấy được dù đang chọn VILLA
    assert.equal(count('APARTMENT'), 1);
    // nhóm khác thì bị thu hẹp theo VILLA
    assert.equal(f.price.find((o) => o.key === 'lt500')?.count, 0);
    assert.equal(f.source.find((o) => o.key === 'booking')?.count, 1);
  });

  it('tiện nghi đếm theo dữ liệu, bỏ các mục thuộc nhóm bữa ăn', () => {
    const f = computeFacets(list, c());
    assert.equal(f.amenity[0].key, 'WiFi miễn phí');
    assert.equal(f.amenity[0].count, 3);
    assert.equal(f.amenity.some((o) => o.key === 'Bữa sáng' || o.key === 'Có bếp riêng'), false);
    assert.equal(f.meal.find((o) => o.key === 'breakfast')?.count, 1);
  });

  it('mục đang chọn vẫn hiện dù đếm 0', () => {
    const f = computeFacets(list, c({ amenities: ['Sân bay riêng'] }));
    assert.equal(f.amenity.find((o) => o.key === 'Sân bay riêng')?.count, 0);
  });
});

describe('sắp xếp & URL', () => {
  const a = hs({ price: 2_000_000, average_rating: 4.9, total_reviews: 3 });
  const b = hs({ price: 500_000, average_rating: 4.0, total_reviews: 90 });
  const noPrice = hs({ rooms: [], average_rating: 3, total_reviews: 0 });

  it('xếp theo giá đưa căn chưa có giá xuống cuối ở cả hai chiều', () => {
    const ids = (s: Parameters<typeof sortHomestays>[1]) => sortHomestays([noPrice, a, b], s).map((h) => h.id);
    assert.deepEqual(ids('price_asc'), [b.id, a.id, noPrice.id]);
    assert.deepEqual(ids('price_desc'), [a.id, b.id, noPrice.id]);
    assert.deepEqual(ids('rating'), [a.id, b.id, noPrice.id]);
    assert.deepEqual(ids('reviews'), [b.id, a.id, noPrice.id]);
    assert.deepEqual(ids('popular'), [noPrice.id, a.id, b.id]);
  });

  it('URL ↔ tiêu chí khứ hồi', () => {
    const crit = c({
      city: 'Hà Nội', district: 'Quận Tây Hồ', checkIn: '2026-12-01', checkOut: '2026-12-03',
      adults: 2, children: 1, rooms: 1, prices: ['500-1m'], minRating: 4.5, types: ['VILLA'],
      amenities: ['WiFi miễn phí', 'Máy pha trà/cà phê trong tất cả các phòng'], meals: ['breakfast'],
      sources: ['stayai'], sort: 'price_asc', page: 3,
    });
    assert.deepEqual(parseCriteria(new URLSearchParams(toSearchParams(crit).toString())), crit);
  });

  it('bỏ qua tham số rác trên URL', () => {
    const p = parseCriteria(new URLSearchParams('checkin=2026-12-05&checkout=2026-12-01&price=abc&rating=2&sort=x&page=-1&source=foo&adults=0'));
    const defined = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
    assert.deepEqual(defined, c());
  });

  it('số đêm', () => {
    assert.equal(nightsBetween('2026-12-30', '2027-01-02'), 3);
    assert.equal(nightsBetween('2026-12-02', '2026-12-01'), 0);
    assert.equal(nightsBetween(undefined, '2026-12-01'), 0);
  });
});
