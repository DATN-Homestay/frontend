import { tokenStorage } from './tokenStorage';

/**
 * Mặc định gọi '/api/v1' cùng origin; khi chạy `npm run dev`, Vite proxy chuyển sang backend
 * (xem vite.config.ts) nên không cần bật CORS. Khi deploy, đặt VITE_API_URL = địa chỉ backend.
 */
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

/** Sự kiện phát ra khi phiên đăng nhập hết hiệu lực, AuthContext lắng nghe để đăng xuất */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

/** Khung response chuẩn của backend: { statusCode, message, data } */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
  /** Không tự refresh token khi gặp 401 (dùng cho chính các API đăng nhập / refresh) */
  skipAuthRefresh?: boolean;
}

function buildUrl(endpoint: string, params?: RequestOptions['params']): string {
  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  return url;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Lỗi máy chủ (HTTP ${response.status})`;
  try {
    const body = await response.json();
    // ValidationPipe của NestJS trả message dạng mảng
    if (Array.isArray(body.message)) {
      message = body.message.join('\n');
    } else if (body.message || body.error) {
      message = body.message || body.error;
    }
  } catch {
    // body không phải JSON
  }
  if (response.status === 429) {
    message = 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút';
  }
  return new ApiError(response.status, message);
}

// =========================================================
// LÀM MỚI TOKEN (chỉ 1 request refresh tại một thời điểm)
// =========================================================

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Backend xoay vòng refresh token và coi token cũ bị dùng lại là bị đánh cắp,
 * nên nhiều request cùng gặp 401 phải dùng chung 1 lần refresh.
 */
function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const body = (await response.json()) as ApiResponse<{ access_token: string; refresh_token: string }>;
      tokenStorage.updateTokens(body.data.access_token, body.data.refresh_token);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// =========================================================
// API CLIENT
// =========================================================

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers = {}, skipAuthRefresh = false, ...customConfig } = options;
  const url = buildUrl(endpoint, params);

  const send = () => {
    const token = tokenStorage.getAccessToken();
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });
  };

  let response = await send();

  if (response.status === 401 && !skipAuthRefresh && tokenStorage.getRefreshToken()) {
    if (await refreshAccessToken()) {
      response = await send();
    } else {
      tokenStorage.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}
