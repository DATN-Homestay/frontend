import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement, useState } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, SearchResults, FilterSidebar, searchUtils, ConfigProvider, AntApp, MemoryRouter, Routes, Route, useLocation;
const nativeFetch = globalThis.fetch;
const requests = [];
afterEach(() => { testing?.cleanup(); });

const room = (id, price, capacity = 2) => ({ id: `${id}-r`, homestay_id: id, room_name: 'Phòng', capacity, base_price: price });
const homestays = [
  {
    id: '11', name: 'Mộc Homestay', city: 'Đà Lạt', address: 'Phường 3', average_rating: 4.6, total_reviews: 40,
    is_claimed: 1, cancellation_policy: 'FLEXIBLE',
    amenities_json: { property_type: 'HOMESTAY', popular_facilities: ['WiFi miễn phí', 'Bữa sáng'] },
    rooms: [room('11', 450000)],
  },
  {
    id: '12', name: 'Đồi Thông House', city: 'Đà Lạt', address: 'Phường 10', average_rating: 4.1, total_reviews: 12,
    is_claimed: 0, source_url: 'https://www.booking.com/hotel/vn/doi-thong.html', cancellation_policy: 'FLEXIBLE',
    amenities_json: { property_type: 'HOMESTAY', popular_facilities: ['WiFi miễn phí'] },
    rooms: [room('12', 800000)],
  },
  {
    id: '13', name: 'Lâm Viên Villa', city: 'Đà Lạt', address: 'Hồ Tuyền Lâm', average_rating: 4.9, total_reviews: 7,
    is_claimed: 0, source_url: 'https://www.booking.com/hotel/vn/lam-vien.html', cancellation_policy: 'FLEXIBLE',
    amenities_json: { property_type: 'VILLA', popular_facilities: ['Hồ bơi ngoài trời', 'WiFi miễn phí'] },
    rooms: [room('13', 3500000, 8)],
  },
  {
    id: '14', name: 'Phố Cổ Stay', city: 'Hà Nội', address: 'Hoàn Kiếm', average_rating: 4.3, total_reviews: 30,
    is_claimed: 0, source_url: 'https://www.booking.com/hotel/vn/pho-co.html', cancellation_policy: 'FLEXIBLE',
    amenities_json: { property_type: 'APARTMENT', popular_facilities: ['WiFi miễn phí'] },
    rooms: [room('14', 600000)],
  },
];

before(async () => {
  dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot',
    'MutationObserver', 'localStorage', 'sessionStorage', 'Event', 'MouseEvent', 'KeyboardEvent'])
    globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.getComputedStyle = (el) => dom.window.getComputedStyle(el);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  // Màn hình rộng: mọi breakpoint khớp để cột lọc hiện bên trái (không vào Drawer)
  window.matchMedia = (media) => ({
    matches: true, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  testing = await import('@testing-library/react');
  testing.configure({ getElementError: (m) => new Error(m), asyncUtilTimeout: 5000 });
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    cacheDir: 'node_modules/.cache/search-results-test',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  SearchResults = (await vite.ssrLoadModule('/src/pages/customer/SearchResults.tsx')).default;
  FilterSidebar = (await vite.ssrLoadModule('/src/components/search/FilterSidebar.tsx')).default;
  searchUtils = await vite.ssrLoadModule('/src/utils/homestaySearch.ts');
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom'));
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    assert.match(String(url), /\/homestays(\?|$)/, `Unexpected request: ${url}`);
    return new Response(JSON.stringify({ statusCode: 200, data: { items: homestays, total: homestays.length } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
});

test('tìm tiện nghi không dấu, giữ lựa chọn ngoài phần xem trước và đặt lại bộ lọc', async () => {
  testing.cleanup();
  const extras = ['Điều hòa 2 chiều', ...Array.from({ length: 12 }, (_, i) => `Tiện nghi ${i + 1}`)];
  const properties = [{ ...homestays[0], amenities_json: { items: extras } }];
  function Filters() {
    const [criteria, setCriteria] = useState({ ...searchUtils.EMPTY_CRITERIA, amenities: ['Tiện nghi 9'] });
    return createElement(FilterSidebar, {
      facets: searchUtils.computeFacets(properties, criteria), criteria,
      onChange: (patch) => setCriteria((current) => ({ ...current, ...patch })),
      onReset: () => setCriteria({ ...searchUtils.EMPTY_CRITERIA }),
    });
  }
  testing.render(createElement(ConfigProvider, { theme: { token: { motion: false } } }, createElement(Filters)));
  const { screen, fireEvent } = testing;
  assert.equal(screen.getByRole('checkbox', { name: /^Tiện nghi 9/ }).checked, true);
  assert.equal(screen.queryByRole('checkbox', { name: /^Tiện nghi 8/ }), null);
  fireEvent.click(screen.getByRole('button', { name: /Xem tất cả 13 tiện nghi/ }));
  assert.ok(screen.getByRole('checkbox', { name: /^Tiện nghi 8/ }));
  fireEvent.click(screen.getByRole('button', { name: /Thu gọn/ }));
  const input = screen.getByRole('textbox', { name: 'Tìm tiện nghi' });
  fireEvent.change(input, { target: { value: 'dieu hoa' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Điều hòa 2 chiều/ }));
  fireEvent.change(input, { target: { value: '' } });
  assert.equal(screen.getByRole('checkbox', { name: /Điều hòa 2 chiều/ }).checked, true);
  assert.equal(screen.getByRole('checkbox', { name: /^Tiện nghi 9/ }).checked, true);
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại' }));
  assert.equal(screen.getByRole('button', { name: 'Đặt lại' }).disabled, true);
  assert.equal(screen.getAllByRole('checkbox').filter((element) => element.checked).length, 0);
});

after(async () => {
  testing?.cleanup();
  await vite?.close();
  dom?.window.close();
  globalThis.fetch = nativeFetch;
});

function Probe() {
  const loc = useLocation();
  return createElement('output', { 'data-testid': 'loc' }, `${loc.pathname}${loc.search}`);
}

const loc = () => decodeURIComponent(testing.screen.getByTestId('loc').textContent.replace(/\+/g, ' '));

test('trang /search: lọc theo tỉnh, số đếm bên trái, tick bộ lọc cập nhật URL, mở chỗ nghỉ giữ ngày', async () => {
  const start = '/search?city=Lâm Đồng&checkin=2026-12-01&checkout=2026-12-03';
  testing.render(
    createElement(ConfigProvider, { theme: { token: { motion: false } } },
      createElement(AntApp, null,
        createElement(MemoryRouter, { initialEntries: [start] },
          createElement(Probe),
          createElement(Routes, null,
            createElement(Route, { path: '/search', element: createElement(SearchResults) }),
            createElement(Route, { path: '/homestay/:id', element: createElement('div', null, 'TRANG CHI TIẾT') }),
          ),
        ),
      ),
    ),
  );

  const { screen, fireEvent, within } = testing;
  // Lâm Đồng gồm Đà Lạt (alias) → 3 căn, không có căn Hà Nội
  await screen.findByRole('heading', { name: 'Lâm Đồng: 3 chỗ nghỉ' });
  assert.equal(screen.queryByText('Phố Cổ Stay'), null);
  assert.ok(screen.getByText('01/12/2026 – 03/12/2026 · 2 đêm'));
  assert.equal(requests.length, 1);

  const sidebar = screen.getByRole('complementary', { name: 'Bộ lọc' });
  const villa = within(sidebar).getByRole('checkbox', { name: /Biệt thự \(Villa\)/ });
  const homestayBox = within(sidebar).getByRole('checkbox', { name: /^Homestay/ });
  assert.match(villa.closest('label').textContent, /Biệt thự \(Villa\)1$/);
  assert.match(homestayBox.closest('label').textContent, /Homestay2$/);

  fireEvent.click(villa);
  await screen.findByRole('heading', { name: 'Lâm Đồng: 1 chỗ nghỉ' });
  assert.ok(screen.getByText('Lâm Viên Villa'));
  assert.equal(screen.queryByText('Mộc Homestay'), null);
  assert.match(loc(), /type=VILLA/);
  // Đếm của nhóm Loại chỗ ở không bị chính nó làm về 0 (truy vấn lại: phần tử cũ có thể đã bị gỡ)
  const homestayAfter = within(sidebar).getByRole('checkbox', { name: /^Homestay/ });
  assert.ok(homestayAfter.isConnected);
  assert.match(homestayAfter.closest('label').textContent, /Homestay2$/);
  // Chip bộ lọc đang bật + giá 2 đêm
  assert.ok(screen.getByText('2 đêm: khoảng 7.000.000đ'));

  // Bỏ Villa, chọn "Đặt ngay trên StayAI" → chỉ còn căn chính chủ
  fireEvent.click(villa);
  fireEvent.click(within(sidebar).getByRole('checkbox', { name: /Đặt ngay trên StayAI/ }));
  await screen.findByRole('heading', { name: 'Lâm Đồng: 1 chỗ nghỉ' });
  assert.ok(screen.getByText('Mộc Homestay'));
  assert.match(loc(), /source=stayai/);
  assert.doesNotMatch(loc(), /type=VILLA/);

  fireEvent.click(screen.getByRole('button', { name: /Xem chỗ trống/ }));
  await screen.findByText('TRANG CHI TIẾT');
  assert.equal(loc(), '/homestay/11?checkin=2026-12-01&checkout=2026-12-03');
  assert.equal(requests.length, 1);
});

test('màn hình nhỏ: mở bộ lọc, chọn tiện ích phổ biến và xem kết quả', async (t) => {
  t.mock.method(window, 'matchMedia', (media) => ({
    matches: media.includes('max-width') || /min-width:\s*(480|576|768)px/.test(media),
    media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  }));
  testing.render(createElement(ConfigProvider, { theme: { token: { motion: false } } },
    createElement(AntApp, null,
      createElement(MemoryRouter, { initialEntries: ['/search?city=Lâm Đồng'] },
        createElement(Probe), createElement(SearchResults),
      ),
    ),
  ));
  const { screen, fireEvent, within } = testing;
  await screen.findByRole('heading', { name: 'Lâm Đồng: 3 chỗ nghỉ' });
  fireEvent.click(screen.getByRole('button', { name: 'Bộ lọc' }));
  const drawer = await screen.findByRole('dialog');
  const popularSection = within(drawer).getByRole('heading', { name: 'Tiện ích phổ biến' }).closest('section');
  fireEvent.click(within(popularSection).getByRole('checkbox', { name: /^Hồ bơi/ }));
  assert.match(loc(), /amenity=facility:pool/);
  assert.ok(within(drawer).getByRole('button', { name: 'Xem 1 chỗ nghỉ' }));
  fireEvent.click(within(drawer).getByRole('button', { name: 'Xem 1 chỗ nghỉ' }));
  await screen.findByRole('heading', { name: 'Lâm Đồng: 1 chỗ nghỉ' });
  assert.ok(screen.getByText('Lâm Viên Villa'));
});
