import type { CSSProperties } from 'react';

/** Nút chính dạng gradient phát sáng, dùng chung cho trang Đăng nhập / Đăng ký */
export const glowButtonStyle: CSSProperties = {
  height: 46,
  border: 'none',
  fontWeight: 600,
  background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
  boxShadow: '0 0 18px rgba(99, 102, 241, 0.55)',
};
