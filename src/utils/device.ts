/** Rút gọn chuỗi User-Agent thành "Chrome trên Windows" để người dùng dễ nhận ra thiết bị */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Thiết bị không xác định';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : null;

  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iOS/.test(userAgent)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;

  if (browser && os) return `${browser} trên ${os}`;
  return browser ?? os ?? userAgent.slice(0, 40);
}
