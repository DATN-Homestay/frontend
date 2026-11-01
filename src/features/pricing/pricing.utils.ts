import type { PricingSuggestion } from '../../types/host';

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 2,
});
const percentage = new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

function numericValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim()))
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyCents(value: unknown): number | null {
  const amount = numericValue(value);
  if (amount === null || amount <= 0 || Number(amount.toFixed(2)) !== amount)
    return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents * 130) ? cents : null;
}

/** Calendar days use Vietnam time, even when the browser is in another zone. */
export function todayInVietnam(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) return '';
  const localDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return Number.isFinite(localDate.getTime())
    ? localDate.toISOString().slice(0, 10)
    : '';
}

export function formatVnd(value: unknown): string {
  const amount = numericValue(value);
  return amount === null || amount < 0 ? '—' : currency.format(amount);
}

/** Round inward to cents so the input bounds always remain inside ±30%. */
export function priceBounds(
  basePrice: unknown,
): { min: number; max: number } | null {
  const cents = moneyCents(basePrice);
  if (cents === null) return null;
  return {
    min: Math.ceil((cents * 70) / 100) / 100,
    max: Math.floor((cents * 130) / 100) / 100,
  };
}

export function isPriceWithinBounds(
  value: unknown,
  basePrice: unknown,
): boolean {
  if (typeof value !== 'number') return false;
  const price = moneyCents(value);
  const base = moneyCents(basePrice);
  return (
    price !== null &&
    base !== null &&
    price * 100 >= base * 70 &&
    price * 100 <= base * 130
  );
}

function identifier(value: unknown): string | null {
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return String(value);
  return null;
}

function isRealDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function suggestionMatchesSelection(
  suggestion: PricingSuggestion | null | undefined,
  selection: { homestayId: string | null; roomId: string | null; date: string },
): boolean {
  if (
    !suggestion ||
    !isRealDate(suggestion.date) ||
    !isRealDate(selection.date)
  )
    return false;
  const homestayId = identifier(selection.homestayId);
  const roomId = identifier(selection.roomId);
  return (
    homestayId !== null &&
    roomId !== null &&
    identifier(suggestion.homestay_id) === homestayId &&
    identifier(suggestion.room_id) === roomId &&
    suggestion.date === selection.date
  );
}

export function formatDemandFactor(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? percentage.format(value)
    : '—';
}
