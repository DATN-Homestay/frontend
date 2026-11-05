/**
 * Tiện ích định dạng ngày giờ đồng bộ chuẩn múi giờ Việt Nam (GMT+7 - Asia/Ho_Chi_Minh).
 * Đảm bảo hiển thị đồng bộ trên mọi thiết bị, hệ điều hành và trình duyệt của người dùng.
 */
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Định dạng ngày giờ: HH:mm:ss DD/MM/YYYY (hoặc HH:mm DD/MM/YYYY) theo múi giờ GMT+7
 */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  options?: { showSeconds?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? '—';
  if (!value) return fallback;
  try {
    const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleString('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      ...(options?.showSeconds ? { second: '2-digit' } : {}),
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    });
  } catch {
    return fallback;
  }
}

/**
 * Định dạng ngày: DD/MM/YYYY theo múi giờ GMT+7
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  if (!value) return fallback;
  try {
    const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fallback;
  }
}

/**
 * Định dạng giờ: HH:mm (hoặc HH:mm:ss) theo múi giờ GMT+7
 */
export function formatTime(
  value: string | number | Date | null | undefined,
  showSeconds = false,
  fallback = '—',
): string {
  if (!value) return fallback;
  try {
    const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds ? { second: '2-digit' } : {}),
      hour12: false,
    });
  } catch {
    return fallback;
  }
}
