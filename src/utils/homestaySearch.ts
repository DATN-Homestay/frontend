import type { HomestayItem } from '../types/customer';

/**
 * Tìm kiếm & lọc homestay trên trình duyệt cho trang /search.
 * Hàm thuần (không phụ thuộc React/antd) để test bằng node --test.
 */

export type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'reviews';
export type BookingSource = 'stayai' | 'booking';

export interface SearchCriteria {
  city?: string;
  district?: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  /** Chỉ lọc theo sức chứa khi người dùng đã chọn số khách (có adults trên URL) */
  adults?: number;
  children?: number;
  rooms?: number;
  prices: string[]; // khóa của PRICE_BUCKETS
  minRating?: number;
  types: string[];
  amenities: string[];
  meals: string[]; // khóa của MEAL_OPTIONS
  sources: BookingSource[];
  sort: SortKey;
  page: number;
}

export const EMPTY_CRITERIA: SearchCriteria = {
  prices: [],
  types: [],
  amenities: [],
  meals: [],
  sources: [],
  sort: 'popular',
  page: 1,
};

export const PRICE_BUCKETS = [
  { key: 'lt500', label: 'Dưới 500.000đ', min: 0, max: 500_000 },
  { key: '500-1m', label: '500.000đ – 1.000.000đ', min: 500_000, max: 1_000_000 },
  { key: '1m-2m', label: '1.000.000đ – 2.000.000đ', min: 1_000_000, max: 2_000_000 },
  { key: '2m-5m', label: '2.000.000đ – 5.000.000đ', min: 2_000_000, max: 5_000_000 },
  { key: 'gt5m', label: 'Trên 5.000.000đ', min: 5_000_000, max: Infinity },
] as const;

export const RATING_OPTIONS = [
  { value: 4.5, label: 'Tuyệt vời: từ 4.5' },
  { value: 4, label: 'Rất tốt: từ 4.0' },
  { value: 3.5, label: 'Tốt: từ 3.5' },
] as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  HOMESTAY: 'Homestay',
  VILLA: 'Biệt thự (Villa)',
  APARTMENT: 'Căn hộ',
  STUDIO: 'Studio',
  OTHER: 'Khác',
};

export const MEAL_OPTIONS = [
  { key: 'breakfast', label: 'Có bữa sáng', pattern: /bữa sáng/i },
  { key: 'restaurant', label: 'Nhà hàng tại chỗ', pattern: /nhà hàng/i },
  { key: 'bar', label: 'Quầy bar', pattern: /quầy bar/i },
  { key: 'kitchen', label: 'Có bếp', pattern: /bếp/i },
] as const;

export const SOURCE_LABELS: Record<BookingSource, string> = {
  stayai: 'Đặt ngay trên StayAI',
  booking: 'Đặt qua Booking.com',
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'popular', label: 'Phù hợp nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'rating', label: 'Điểm đánh giá cao nhất' },
  { value: 'reviews', label: 'Nhiều đánh giá nhất' },
];

const ALL_PLACES = ['Tất cả điểm đến', 'Tất cả'];
const ALL_DISTRICTS = ['Tất cả quận/huyện', 'Tất cả'];

// Một tỉnh có thể chứa nhiều điểm đến (Lâm Đồng → Đà Lạt, Bảo Lộc...) – chuyển nguyên từ Home.tsx
const CITY_ALIASES: Record<string, string[]> = {
  'lâm đồng': ['đà lạt', 'lâm đồng', 'bảo lộc', 'tuyền lâm'],
  'đà lạt': ['đà lạt', 'lâm đồng', 'tuyền lâm'],
  'khánh hòa': ['nha trang', 'cam ranh', 'khánh hòa'],
  'nha trang': ['nha trang', 'khánh hòa'],
  'kiên giang': ['phú quốc', 'rạch giá', 'kiên giang'],
  'phú quốc': ['phú quốc', 'kiên giang'],
  'lào cai': ['sa pa', 'sapa', 'lào cai'],
  'sa pa': ['sa pa', 'sapa', 'lào cai'],
  'quảng ninh': ['hạ long', 'bãi cháy', 'quảng ninh'],
  'hạ long': ['hạ long', 'bãi cháy', 'quảng ninh'],
  'bình thuận': ['phan thiết', 'mũi né', 'bình thuận'],
  'phan thiết': ['phan thiết', 'mũi né', 'bình thuận'],
  'bình định': ['quy nhơn', 'bình định'],
  'quy nhơn': ['quy nhơn', 'bình định'],
  'bà rịa - vũng tàu': ['vũng tàu', 'hồ tràm', 'bà rịa', 'xuyên mộc', 'long hải'],
  'vũng tàu': ['vũng tàu', 'hồ tràm', 'bà rịa', 'bà rịa - vũng tàu'],
  'quảng nam': ['hội an', 'quảng nam'],
  'hội an': ['hội an', 'quảng nam'],
  'đà nẵng': ['đà nẵng', 'da nang'],
  'hà nội': ['hà nội', 'ha noi', 'hoàn kiếm', 'tây hồ', 'hà đông', 'ba đình', 'cầu giấy', 'đống đa', 'hai bà trưng', 'nam từ liêm', 'bắc từ liêm', 'thanh xuân', 'long biên'],
  'hồ chí minh': ['hồ chí minh', 'sài gòn', 'saigon', 'tp.hcm', 'tp hcm'],
};

export function isAllPlaces(city?: string): boolean {
  return !city || !city.trim() || ALL_PLACES.includes(city);
}

export function matchesLocation(h: HomestayItem, city?: string, district?: string): boolean {
  if (!isAllPlaces(city)) {
    const cityLower = city!.toLowerCase();
    const validNames = CITY_ALIASES[cityLower] || [cityLower];
    const hCity = (h.city || '').toLowerCase();
    const hAddr = (h.address || '').toLowerCase();
    const hName = (h.name || '').toLowerCase();
    const ok = validNames.some(
      (v) => hCity.includes(v) || (hCity !== '' && v.includes(hCity)) || hAddr.includes(v) || hName.includes(v),
    );
    if (!ok) return false;
  }
  if (district && district.trim() && !ALL_DISTRICTS.includes(district)) {
    const kw = district.replace(/quận|huyện|thành phố|thị xã|phường|xã/gi, '').trim().toLowerCase();
    if (kw) {
      const hDist = (h.district || '').toLowerCase();
      const ok =
        (hDist !== '' && (hDist.includes(kw) || kw.includes(hDist))) || (h.address || '').toLowerCase().includes(kw);
      if (!ok) return false;
    }
  }
  return true;
}

/** Đủ chỗ cho số khách với số phòng yêu cầu (giữ nguyên quy tắc cũ của trang chủ) */
export function matchesGuests(h: HomestayItem, totalGuests: number, rooms = 1): boolean {
  if (totalGuests <= 0) return true;
  if (!h.rooms || h.rooms.length === 0) return true;
  const requiredRooms = rooms > 0 ? rooms : 1;
  if (h.rooms.length < requiredRooms) return false;
  if (requiredRooms === 1) return h.rooms.some((r) => Number(r.capacity) >= totalGuests);
  const top = h.rooms
    .map((r) => Number(r.capacity) || 2)
    .sort((a, b) => b - a)
    .slice(0, requiredRooms)
    .reduce((sum, c) => sum + c, 0);
  return top >= totalGuests;
}

export function minNightlyPrice(h: HomestayItem): number | null {
  const prices = (h.rooms ?? []).map((r) => Number(r.base_price)).filter((p) => Number.isFinite(p) && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function propertyTypeOf(h: HomestayItem): string {
  const t = h.amenities_json?.property_type;
  return typeof t === 'string' && t.trim() ? t.trim().toUpperCase() : 'OTHER';
}

export function facilitiesOf(h: HomestayItem): string[] {
  const list = h.amenities_json?.popular_facilities;
  return Array.isArray(list) ? list.filter((f): f is string => typeof f === 'string' && f.trim() !== '') : [];
}

/** Cùng tiêu chí với HomestayDetail: chưa có chủ hoặc nguồn Booking.com thì chuyển hướng sang Booking.com */
export function isBookableOnStayAI(h: HomestayItem): boolean {
  return !(Number(h.is_claimed) === 0 || !!h.source_url?.toLowerCase().includes('booking.com'));
}

export function sourceOf(h: HomestayItem): BookingSource {
  return isBookableOnStayAI(h) ? 'stayai' : 'booking';
}

function priceBucketOf(price: number | null): string | null {
  if (price === null) return null;
  return PRICE_BUCKETS.find((b) => price >= b.min && price < b.max)?.key ?? null;
}

function mealsOf(h: HomestayItem): string[] {
  const fac = facilitiesOf(h);
  return MEAL_OPTIONS.filter((m) => fac.some((f) => m.pattern.test(f))).map((m) => m.key);
}

function isMealFacility(f: string): boolean {
  return MEAL_OPTIONS.some((m) => m.pattern.test(f));
}

type Group = 'price' | 'rating' | 'type' | 'amenity' | 'meal' | 'source';

/** Lọc theo địa điểm + số khách: tập ứng viên gốc của trang kết quả */
export function baseResults(list: HomestayItem[], c: SearchCriteria): HomestayItem[] {
  const guests = c.adults !== undefined ? c.adults + (c.children ?? 0) : 0;
  return list.filter((h) => matchesLocation(h, c.city, c.district) && matchesGuests(h, guests, c.rooms ?? 1));
}

function passes(h: HomestayItem, c: SearchCriteria, skip?: Group): boolean {
  if (skip !== 'price' && c.prices.length) {
    const b = priceBucketOf(minNightlyPrice(h));
    if (!b || !c.prices.includes(b)) return false;
  }
  if (skip !== 'rating' && c.minRating !== undefined && Number(h.average_rating) < c.minRating) return false;
  if (skip !== 'type' && c.types.length && !c.types.includes(propertyTypeOf(h))) return false;
  if (skip !== 'amenity' && c.amenities.length) {
    const fac = facilitiesOf(h);
    if (!c.amenities.every((a) => fac.includes(a))) return false;
  }
  if (skip !== 'meal' && c.meals.length) {
    const meals = mealsOf(h);
    if (!c.meals.every((m) => meals.includes(m))) return false;
  }
  if (skip !== 'source' && c.sources.length && !c.sources.includes(sourceOf(h))) return false;
  return true;
}

/** Áp toàn bộ bộ lọc (địa điểm, khách, giá, điểm, loại, tiện nghi, bữa ăn, hình thức đặt) */
export function applyFilters(list: HomestayItem[], c: SearchCriteria): HomestayItem[] {
  return baseResults(list, c).filter((h) => passes(h, c));
}

export interface FacetOption {
  key: string;
  label: string;
  count: number;
}

export interface Facets {
  price: FacetOption[];
  rating: FacetOption[];
  type: FacetOption[];
  amenity: FacetOption[];
  meal: FacetOption[];
  source: FacetOption[];
}

/**
 * Số lượng cho từng lựa chọn. Mỗi nhóm đếm khi áp mọi bộ lọc KHÁC trừ chính nhóm đó,
 * nên tick một ô không làm các ô cùng nhóm về 0 (giống Booking.com).
 */
export function computeFacets(list: HomestayItem[], c: SearchCriteria): Facets {
  const base = baseResults(list, c);
  const without = (g: Group) => base.filter((h) => passes(h, c, g));

  const priceSet = without('price');
  const price = PRICE_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    count: priceSet.filter((h) => priceBucketOf(minNightlyPrice(h)) === b.key).length,
  }));

  const ratingSet = without('rating');
  const rating = RATING_OPTIONS.map((r) => ({
    key: String(r.value),
    label: r.label,
    count: ratingSet.filter((h) => Number(h.average_rating) >= r.value).length,
  }));

  const typeCounts = new Map<string, number>();
  for (const h of without('type')) {
    const t = propertyTypeOf(h);
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  for (const t of c.types) if (!typeCounts.has(t)) typeCounts.set(t, 0);
  const type = [...typeCounts.entries()]
    .map(([key, count]) => ({ key, label: PROPERTY_TYPE_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));

  const amenityCounts = new Map<string, number>();
  for (const h of without('amenity')) {
    for (const f of new Set(facilitiesOf(h))) {
      if (!isMealFacility(f)) amenityCounts.set(f, (amenityCounts.get(f) ?? 0) + 1);
    }
  }
  for (const a of c.amenities) if (!amenityCounts.has(a)) amenityCounts.set(a, 0);
  const amenity = [...amenityCounts.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));

  const mealSet = without('meal');
  const meal = MEAL_OPTIONS.map((m) => ({
    key: m.key,
    label: m.label,
    count: mealSet.filter((h) => mealsOf(h).includes(m.key)).length,
  }));

  const sourceSet = without('source');
  const source = (Object.keys(SOURCE_LABELS) as BookingSource[]).map((s) => ({
    key: s,
    label: SOURCE_LABELS[s],
    count: sourceSet.filter((h) => sourceOf(h) === s).length,
  }));

  return { price, rating, type, amenity, meal, source };
}

/** Sắp xếp; 'popular' giữ thứ tự backend (chính chủ trước). Căn chưa có giá luôn xuống cuối khi xếp theo giá. */
export function sortHomestays(list: HomestayItem[], sort: SortKey): HomestayItem[] {
  const arr = [...list];
  const priceOrLast = (h: HomestayItem, dir: 1 | -1) => {
    const p = minNightlyPrice(h);
    return p === null ? Infinity : p * dir;
  };
  switch (sort) {
    case 'price_asc':
      return arr.sort((a, b) => priceOrLast(a, 1) - priceOrLast(b, 1));
    case 'price_desc':
      return arr.sort((a, b) => priceOrLast(a, -1) - priceOrLast(b, -1));
    case 'rating':
      return arr.sort(
        (a, b) =>
          Number(b.average_rating) - Number(a.average_rating) || Number(b.total_reviews) - Number(a.total_reviews),
      );
    case 'reviews':
      return arr.sort((a, b) => Number(b.total_reviews) - Number(a.total_reviews));
    default:
      return arr;
  }
}

/** Số đêm giữa hai ngày YYYY-MM-DD (0 nếu thiếu/không hợp lệ) */
export function nightsBetween(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function ratingLabel(rating: number): string {
  if (rating >= 4.5) return 'Tuyệt vời';
  if (rating >= 4) return 'Rất tốt';
  if (rating >= 3.5) return 'Tốt';
  if (rating > 0) return 'Dễ chịu';
  return 'Chưa có đánh giá';
}

// ---------------- URL <-> tiêu chí ----------------

const SORT_KEYS = SORT_OPTIONS.map((s) => s.value);
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

function intParam(v: string | null, min: number, max: number): number | undefined {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

export function parseCriteria(params: URLSearchParams): SearchCriteria {
  const list = (key: string) => [...new Set(params.getAll(key).filter((v) => v.trim() !== ''))];
  const sort = params.get('sort') as SortKey | null;
  const rating = Number(params.get('rating'));
  const checkIn = params.get('checkin');
  const checkOut = params.get('checkout');
  const adults = intParam(params.get('adults'), 1, 30);
  return {
    city: params.get('city')?.trim() || undefined,
    district: params.get('district')?.trim() || undefined,
    checkIn: isDate(checkIn) && isDate(checkOut) && checkOut > checkIn ? checkIn : undefined,
    checkOut: isDate(checkIn) && isDate(checkOut) && checkOut > checkIn ? checkOut : undefined,
    adults,
    children: adults !== undefined ? (intParam(params.get('children'), 0, 20) ?? 0) : undefined,
    rooms: adults !== undefined ? (intParam(params.get('rooms'), 1, 10) ?? 1) : undefined,
    prices: list('price').filter((p) => PRICE_BUCKETS.some((b) => b.key === p)),
    minRating: RATING_OPTIONS.some((r) => r.value === rating) ? rating : undefined,
    types: list('type').map((t) => t.toUpperCase()),
    amenities: list('amenity'),
    meals: list('meal').filter((m) => MEAL_OPTIONS.some((o) => o.key === m)),
    sources: list('source').filter((s): s is BookingSource => s === 'stayai' || s === 'booking'),
    sort: sort && SORT_KEYS.includes(sort) ? sort : 'popular',
    page: intParam(params.get('page'), 1, 10_000) ?? 1,
  };
}

export function toSearchParams(c: Partial<SearchCriteria>): URLSearchParams {
  const p = new URLSearchParams();
  if (c.city && !isAllPlaces(c.city)) p.set('city', c.city);
  if (c.district && !ALL_DISTRICTS.includes(c.district)) p.set('district', c.district);
  if (c.checkIn && c.checkOut) {
    p.set('checkin', c.checkIn);
    p.set('checkout', c.checkOut);
  }
  if (c.adults !== undefined) {
    p.set('adults', String(c.adults));
    p.set('children', String(c.children ?? 0));
    p.set('rooms', String(c.rooms ?? 1));
  }
  for (const v of c.prices ?? []) p.append('price', v);
  if (c.minRating !== undefined) p.set('rating', String(c.minRating));
  for (const v of c.types ?? []) p.append('type', v);
  for (const v of c.amenities ?? []) p.append('amenity', v);
  for (const v of c.meals ?? []) p.append('meal', v);
  for (const v of c.sources ?? []) p.append('source', v);
  if (c.sort && c.sort !== 'popular') p.set('sort', c.sort);
  if (c.page && c.page > 1) p.set('page', String(c.page));
  return p;
}
