import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement, useState } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom,
  vite,
  testing,
  DropshipOrders,
  Register,
  AuthContext,
  FavoritesContext,
  FavoritesProvider,
  favoritesService,
  HomePage,
  useHomestayCatalog,
  authService,
  customerService,
  HomestayDetail,
  UsersPage,
  adminService,
  AdminBookingsPage,
  adminBookingsService,
  HomestayRecommendations,
  recommendationsService,
  useTrackHomestayView,
  useTrackHomestaySearch,
  notifyRecommendationChange,
  useRoomAvailability,
  ConfigProvider,
  AntApp,
  MemoryRouter,
  Routes,
  Route,
  useLocation;
let payload;
let originalQuoteBooking;
let originalGetHomestayDetail;
let originalAdminService;
let originalAdminBookingsService;
let originalRecommendationsService;
let originalFavoritesService;
let originalGetHomestays;
const requests = [];
const nativeFetch = globalThis.fetch;
const financial = {
  total: 1,
  summary: { total_revenue: 1000000, total_wholesale_cost: 850000, total_profit_margin: 150000 },
  items: [
    {
      id: '321',
      booking_code: 'QA-321',
      booking_status: 'COMPLETED',
      created_at: '2026-11-01',
      customer_name: 'Khách QA',
      homestay_name: 'Homestay QA',
      room_name: 'Phòng QA',
      check_in_date: '2026-11-03',
      check_out_date: '2026-11-04',
      retail_amount: 1000000,
      wholesale_amount: 850000,
      profit_margin: 150000,
      ota_fulfillment: {
        status: 'CONFIRMED',
        ota_booking_code: 'OTA-QA',
        fulfilled_at: '2026-11-01',
      },
    },
  ],
};

before(async () => {
  dom = new JSDOM('<html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });
  for (const key of [
    'window',
    'document',
    'Document',
    'HTMLElement',
    'Element',
    'Node',
    'SVGElement',
    'ShadowRoot',
    'MutationObserver',
    'localStorage',
    'sessionStorage',
    'Event',
    'MouseEvent',
    'KeyboardEvent',
  ])
    globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
  globalThis.getComputedStyle = (element) => dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia = (media) => ({
    matches: false,
    media,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  window.scrollTo = () => {};
  testing = await import('@testing-library/react');
  testing.configure({ getElementError: (message) => new Error(message), asyncUtilTimeout: 5000 });
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    cacheDir: 'node_modules/.cache/frontend-regressions',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  DropshipOrders = (await vite.ssrLoadModule('/src/pages/admin/DropshipOrders.tsx')).default;
  Register = (await vite.ssrLoadModule('/src/pages/auth/Register.tsx')).default;
  ({ AuthContext } = await vite.ssrLoadModule('/src/contexts/AuthContextDefinition.ts'));
  ({ FavoritesContext } = await vite.ssrLoadModule('/src/contexts/FavoritesContextDefinition.ts'));
  ({ FavoritesProvider } = await vite.ssrLoadModule('/src/contexts/FavoritesContext.tsx'));
  ({ favoritesService } = await vite.ssrLoadModule('/src/services/favoritesService.ts'));
  originalFavoritesService = { ...favoritesService };
  ({ authService } = await vite.ssrLoadModule('/src/services/authService.ts'));
  ({ customerService } = await vite.ssrLoadModule('/src/services/customerService.ts'));
  originalGetHomestays = customerService.getHomestays;
  HomePage = (await vite.ssrLoadModule('/src/pages/customer/Home.tsx')).default;
  ({ useHomestayCatalog } = await vite.ssrLoadModule('/src/pages/customer/useHomestayCatalog.ts'));
  ({ useRoomAvailability } = await vite.ssrLoadModule('/src/pages/customer/useRoomAvailability.ts'));
  HomestayDetail = (await vite.ssrLoadModule('/src/pages/customer/HomestayDetail.tsx')).default;
  UsersPage = (await vite.ssrLoadModule('/src/pages/admin/Users.tsx')).default;
  ({ adminService } = await vite.ssrLoadModule('/src/services/adminService.ts'));
  originalAdminService = { ...adminService };
  AdminBookingsPage = (await vite.ssrLoadModule('/src/pages/admin/Bookings.tsx')).default;
  ({ adminBookingsService } = await vite.ssrLoadModule('/src/services/adminBookingsService.ts'));
  originalAdminBookingsService = { ...adminBookingsService };
  HomestayRecommendations = (await vite.ssrLoadModule('/src/features/recommendations/HomestayRecommendations.tsx')).default;
  ({ recommendationsService } = await vite.ssrLoadModule('/src/features/recommendations/recommendations.service.ts'));
  ({ useTrackHomestayView } = await vite.ssrLoadModule('/src/features/recommendations/useTrackHomestayView.ts'));
  ({ useTrackHomestaySearch } = await vite.ssrLoadModule('/src/features/recommendations/useTrackHomestaySearch.ts'));
  ({ notifyRecommendationChange } = await vite.ssrLoadModule('/src/features/recommendations/recommendation-events.ts'));
  originalRecommendationsService = { ...recommendationsService };
  originalQuoteBooking = customerService.quoteBooking;
  originalGetHomestayDetail = customerService.getHomestayDetail;
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom'));
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), method: options?.method ?? 'GET' });
    assert.ok(String(url).endsWith('/admin/dropship/orders'), `Unexpected request: ${url}`);
    return new Response(JSON.stringify({ statusCode: 200, data: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
});

afterEach(() => {
  testing.cleanup();
  requests.length = 0;
  customerService.quoteBooking = originalQuoteBooking;
  customerService.getHomestayDetail = originalGetHomestayDetail;
  Object.assign(adminService, originalAdminService);
  Object.assign(adminBookingsService, originalAdminBookingsService);
  Object.assign(recommendationsService, originalRecommendationsService);
  Object.assign(favoritesService, originalFavoritesService);
  customerService.getHomestays = originalGetHomestays;
});
after(async () => {
  await vite?.close();
  dom?.window.close();
  globalThis.fetch = nativeFetch;
});

function render(component) {
  return testing.render(
    createElement(
      ConfigProvider,
      { theme: { token: { motion: false } } },
      createElement(AntApp, null, component),
    ),
  );
}

test('uses one financial API response for the B2B status and reconciliation tabs', async () => {
  payload = financial;
  render(createElement(DropshipOrders));
  await testing.screen.findByText('Khách QA');
  assert.equal(requests.length, 1);
  assert.equal(testing.screen.queryByText('Không thể tải trạng thái B2B'), null);
  testing.fireEvent.click(testing.screen.getByRole('tab', { name: /Đối soát B2B/ }));
  await testing.screen.findByText('QA-321');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
});

test('accepts a legacy status array and explains when financial totals are unavailable', async () => {
  payload = [
    {
      booking_id: '7',
      customer_name: 'Khách cũ',
      homestay_name: 'Homestay cũ',
      check_in: '2026-11-03',
      check_out: '2026-11-04',
      total_amount: 700000,
      b2b_status: 'BOOKED',
    },
  ];
  render(createElement(DropshipOrders));
  await testing.screen.findByText('Khách cũ');
  testing.fireEvent.click(testing.screen.getByRole('tab', { name: /Đối soát B2B/ }));
  await testing.screen.findByText(
    'API hiện chỉ cung cấp trạng thái đơn, chưa có số liệu đối soát.',
  );
  assert.equal(requests.length, 1);
});

test('binds OTP fields to the form and requires verification again after changing email', async () => {
  const verifications = [];
  authService.verifyRegisterOtp = async (email, code) => {
    verifications.push({ email, code });
    return { verified: true };
  };
  render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/auth/register?role=HOST'] },
      createElement(
        AuthContext.Provider,
        { value: { register: async () => {} } },
        createElement(Register),
      ),
    ),
  );
  const email = testing.screen.getByPlaceholderText('Email của bạn');
  const otp = testing.screen.getByPlaceholderText('Nhập mã OTP (6 số từ email)');
  testing.fireEvent.change(email, { target: { value: 'first@example.test' } });
  testing.fireEvent.change(otp, { target: { value: '123456' } });
  await testing.screen.findByText('Đã xác thực');
  assert.deepEqual(verifications, [{ email: 'first@example.test', code: '123456' }]);
  assert.equal(email.disabled, false);
  testing.fireEvent.change(email, { target: { value: 'second@example.test' } });
  await testing.waitFor(() => assert.equal(otp.value, ''));
  assert.equal(testing.screen.queryByText('Đã xác thực'), null);
  assert.equal(otp.disabled, false);
});

function pendingQuotes() {
  const pending = [];
  customerService.quoteBooking = (params) => new Promise((resolve, reject) => {
    pending.push({ params, resolve, reject });
  });
  return pending;
}

test('uses only the selected room quote when responses arrive out of order', async () => {
  const pending = pendingQuotes();
  const dates = ['2026-11-10', '2026-11-12'];
  const { result, rerender } = testing.renderHook(
    ({ roomId }) => useRoomAvailability(roomId, dates, true),
    { initialProps: { roomId: '9007199254740993' } },
  );
  assert.equal(result.current.loading, true);
  assert.deepEqual(pending[0].params, {
    room_id: '9007199254740993', check_in_date: dates[0], check_out_date: dates[1],
  });
  rerender({ roomId: '2' });
  const selectedQuote = { room_id: '2', available: false, held_dates: [dates[0]] };
  await testing.act(async () => pending[1].resolve(selectedQuote));
  assert.deepEqual(result.current, { quote: selectedQuote, error: null, loading: false });
  await testing.act(async () => pending[0].resolve({ room_id: '9007199254740993', available: true }));
  assert.equal(result.current.quote, selectedQuote);

  // Revisiting a room must check again rather than reuse its earlier response.
  rerender({ roomId: '9007199254740993' });
  assert.deepEqual(result.current, { quote: null, error: null, loading: true });
  assert.equal(pending.length, 3);
});

test('clears an old quote on date changes and stops loading when dates are removed', async () => {
  const pending = pendingQuotes();
  const dates = ['2026-11-10', '2026-11-12'];
  const { result, rerender } = testing.renderHook(
    ({ dates }) => useRoomAvailability('1', dates, true),
    { initialProps: { dates } },
  );
  await testing.act(async () => pending[0].resolve({ available: true, total_amount: 1000000 }));
  assert.equal(result.current.quote.total_amount, 1000000);

  rerender({ dates: ['2026-11-12', '2026-11-14'] });
  assert.deepEqual(result.current, { quote: null, error: null, loading: true });
  rerender({ dates: null });
  assert.deepEqual(result.current, { quote: null, error: null, loading: false });
  await testing.act(async () => pending[1].resolve({ available: false }));
  assert.deepEqual(result.current, { quote: null, error: null, loading: false });

  rerender({ dates });
  assert.equal(result.current.loading, true);
  assert.equal(pending.length, 3);
});

test('reports availability errors separately and skips quotes for partner homestays', async () => {
  const pending = pendingQuotes();
  const dates = ['2026-11-10', '2026-11-12'];
  const { result, rerender } = testing.renderHook(
    ({ enabled }) => useRoomAvailability('1', dates, enabled),
    { initialProps: { enabled: false } },
  );
  assert.equal(pending.length, 0);
  assert.deepEqual(result.current, { quote: null, error: null, loading: false });
  rerender({ enabled: true });
  await testing.act(async () => pending[0].reject(new Error('Máy chủ tạm thời không phản hồi')));
  assert.deepEqual(result.current, {
    quote: null, error: 'Máy chủ tạm thời không phản hồi', loading: false,
  });
  rerender({ enabled: false });
  assert.deepEqual(result.current, { quote: null, error: null, loading: false });
});

test('shows a claimed room daily price field even when the property retains its Booking.com source URL', async () => {
  const favorites = [];
  customerService.getHomestayDetail = async () => ({
    id: '42', name: 'Homestay giá theo ngày', city: 'Đà Lạt', address: 'Đà Lạt',
    is_claimed: 1, source_url: 'https://www.booking.com/hotel/vn/example.html',
    rooms: [{
      id: '21', homestay_id: '42', room_name: 'Deluxe theo ngày', capacity: 2, base_price: 700000,
      daily_prices: [{ date: '2099-02-10', price: 840000, is_ai_applied: 1 }],
      images: [{ id: '1', image_url: 'https://example.test/room.jpg', is_primary: 1 }],
    }],
  });
  render(createElement(FavoritesContext.Provider, { value: {
    isFavorite: () => false,
    toggleFavorite: async (id) => { favorites.push(id); return true; },
  } }, createElement(MemoryRouter, { initialEntries: ['/homestays/42'] },
    createElement(Routes, null, createElement(Route, {
      path: '/homestays/:id', element: createElement(HomestayDetail),
    })),
  )));
  await testing.screen.findByRole('button', { name: 'Đặt phòng ngay' });
  testing.fireEvent.click(testing.screen.getByRole('button', { name: /Lưu vào yêu thích/ }));
  assert.deepEqual(favorites, ['42']);
  testing.fireEvent.click(testing.screen.getByRole('button', { name: /Xem chi tiết$/ }));
  const priceTable = await testing.screen.findByRole('table', { name: 'Giá theo ngày' });
  assert.match(priceTable.textContent, /10\/02\/2099/);
  assert.match(priceTable.textContent, /840\.000/);
  assert.match(priceTable.textContent, /Đã áp dụng giá AI/);
});

async function renderUserManagement() {
  const userRow = (id, name, roles, status = 'ACTIVE') => ({
    id, full_name: name, email: `${id}@example.test`, roles, status, created_at: '2026-11-01',
  });
  const items = [
    userRow('1', 'Admin hiện tại', ['ADMIN']),
    userRow('2', 'Admin khác', ['ADMIN']),
    userRow('3', 'Admin kiêm chủ nhà', ['HOST', 'ADMIN']),
    userRow('4', 'Admin đang khóa', ['ADMIN'], 'SUSPENDED'),
    userRow('5', 'Khách bình thường', ['CUSTOMER']),
    userRow('6', 'Chủ nhà bình thường', ['HOST']),
  ];
  adminService.listUsers = async () => ({
    items, pagination: { page: 1, limit: 10, total: items.length, total_pages: 1 },
  });
  render(createElement(AuthContext.Provider, {
    value: { user: { id: '1', roles: ['ADMIN'] } },
  }, createElement(UsersPage)));
  await testing.screen.findByText('Khách bình thường');
  return (name) => testing.within(testing.screen.getByText(name, { exact: true }).closest('tr'));
}

test('renders other admins as read-only, including mixed-role and suspended admin accounts', async () => {
  const row = await renderUserManagement();
  for (const name of ['Admin khác', 'Admin kiêm chủ nhà', 'Admin đang khóa']) {
    const account = row(name);
    assert.equal(account.getAllByRole('button').length, 1);
    assert.ok(account.getByRole('button', { name: 'Xem chi tiết' }));
    assert.equal(account.queryByRole('button', { name: 'Đổi role' }), null);
    assert.equal(account.queryByRole('button', { name: 'Khóa tài khoản' }), null);
    assert.equal(account.queryByRole('button', { name: 'Mở khóa' }), null);
    assert.equal(account.queryByRole('button', { name: 'Xóa' }), null);
  }
  const self = row('Admin hiện tại');
  assert.equal(self.queryByRole('button', { name: 'Khóa tài khoản' }), null);
  assert.equal(self.queryByRole('button', { name: 'Xóa' }), null);
});

test('keeps customer and host management available and allows updating a customer status', async () => {
  const changes = [];
  adminService.updateUserStatus = async (...args) => { changes.push(args); };
  const row = await renderUserManagement();
  for (const name of ['Khách bình thường', 'Chủ nhà bình thường']) {
    const account = row(name);
    assert.ok(account.getByRole('button', { name: 'Đổi role' }));
    assert.ok(account.getByRole('button', { name: 'Khóa tài khoản' }));
    assert.ok(account.getByRole('button', { name: 'Xóa' }));
  }
  testing.fireEvent.click(row('Khách bình thường').getByRole('button', { name: 'Khóa tài khoản' }));
  await testing.screen.findByText('Khóa tài khoản này?');
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'OK', exact: true }));
  await testing.waitFor(() => assert.deepEqual(changes, [['5', 'SUSPENDED', 'Vi phạm quy định']]));
});

function bookingFixture(id = '9007199254740993') {
  return {
    id, booking_code: `BK-QA-${id}`, status: 'PAID_ESCROW', is_dropship: false,
    check_in_date: '2026-11-10', check_out_date: '2026-11-12', nights: 2, num_guests: 2,
    total_amount: 1700000, created_at: '2026-11-07T02:00:00Z',
    customer: { id: '11', full_name: 'Khách booking QA', email: 'guest@example.test', phone_number: '0900000000' },
    host: { id: '12', full_name: 'Chủ nhà booking QA', email: 'host@example.test', phone_number: null },
    homestay: { id: '42', name: 'Nhà booking QA', city: 'Đà Lạt' },
    room: { id: '21', room_name: 'Deluxe booking QA' }, escrow_status: 'HOLDING',
  };
}
function bookingPage(items = [bookingFixture()]) {
  return {
    items, pagination: { page: 1, limit: 10, total: 53, total_pages: 6 },
    summary: { total_amount: 15100000, by_status: { PENDING_PAYMENT: 50, PAID_ESCROW: 3 } },
  };
}
function bookingDetail(id = '9007199254740993') {
  return {
    ...bookingFixture(id), room_subtotal: 1800000, service_fee: 0, discount_amount: 100000,
    customer_note: 'Đến muộn QA', address: 'Địa chỉ booking QA', cancellation_policy: 'FLEXIBLE',
    escrow: { status: 'HOLDING', amount: 1700000, release_due_at: '2026-11-11T02:00:00Z' },
    payments: [{ id: '1', amount: 1700000, method: 'VNPAY', status: 'SUCCESS', transaction_code: 'TX-BOOKING-QA', paid_at: '2026-11-07T02:01:00Z' }],
    refunds: [], payout: { id: '31', status: 'PENDING', platform_commission: 127500, actual_payout_amount: 1572500 },
  };
}

test('admin bookings shows full-filter totals and real contact, payment and escrow details', async () => {
  const details = [];
  adminBookingsService.list = async () => bookingPage();
  adminBookingsService.detail = async (id) => { details.push(id); return bookingDetail(id); };
  render(createElement(AdminBookingsPage));
  await testing.screen.findByRole('button', { name: 'Xem booking BK-QA-9007199254740993' });
  assert.ok(testing.screen.getByText('53', { exact: true }));
  assert.ok(testing.screen.getByText('15.100.000', { exact: true }));
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Xem booking BK-QA-9007199254740993' }));
  const drawer = await testing.screen.findByRole('dialog', { name: 'Booking BK-QA-9007199254740993' });
  const detail = testing.within(drawer);
  await detail.findByText('TX-BOOKING-QA');
  assert.ok(detail.getByText('Đang giữ ký quỹ'));
  assert.ok(detail.getByText('Đến muộn QA'));
  assert.ok(detail.getByText('guest@example.test'));
  assert.ok(detail.getByText('Chủ nhà booking QA'));
  assert.deepEqual(details, ['9007199254740993']);
});

test('admin bookings sends pagination and search filters to the API and resets search results to page one', async () => {
  const queries = [];
  adminBookingsService.list = async (query) => {
    queries.push(query);
    return { ...bookingPage(), pagination: { ...bookingPage().pagination, page: query.page } };
  };
  render(createElement(AdminBookingsPage));
  await testing.screen.findByText('Khách booking QA');
  testing.fireEvent.click(testing.screen.getByTitle('2'));
  await testing.waitFor(() => assert.equal(queries.at(-1).page, 2));
  const search = testing.screen.getByRole('searchbox', { name: 'Tìm booking' });
  testing.fireEvent.change(search, { target: { value: 'BK-QA' } });
  testing.fireEvent.keyDown(search, { key: 'Enter', code: 'Enter', keyCode: 13 });
  await testing.waitFor(() => assert.equal(queries.at(-1).search, 'BK-QA'));
  assert.equal(queries.at(-1).page, 1);
  testing.fireEvent.mouseDown(testing.screen.getByRole('combobox', { name: 'Lọc trạng thái booking' }));
  testing.fireEvent.click(await testing.screen.findByText('Đã hủy', { exact: true }));
  await testing.waitFor(() => assert.equal(queries.at(-1).status, 'CANCELLED'));
  testing.fireEvent.mouseDown(testing.screen.getByRole('combobox', { name: 'Lọc nguồn booking' }));
  testing.fireEvent.click(await testing.screen.findByText('Dropship B2B', { exact: true }));
  await testing.waitFor(() => assert.equal(queries.at(-1).source, 'DROPSHIP'));
});

test('admin bookings ignores late detail responses after switching to another booking', async () => {
  const pending = [];
  adminBookingsService.list = async () => bookingPage([bookingFixture('21'), bookingFixture('22')]);
  adminBookingsService.detail = (id) => new Promise((resolve) => pending.push({ id, resolve }));
  render(createElement(AdminBookingsPage));
  testing.fireEvent.click(await testing.screen.findByRole('button', { name: 'Xem booking BK-QA-21' }));
  await testing.waitFor(() => assert.equal(pending.length, 1));
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Close' }));
  await testing.waitFor(() => assert.equal(testing.screen.queryByRole('dialog'), null));
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Xem booking BK-QA-22' }));
  await testing.waitFor(() => assert.equal(pending.length, 2));
  await testing.act(async () => pending[1].resolve(bookingDetail('22')));
  await testing.screen.findByRole('dialog', { name: 'Booking BK-QA-22' });
  await testing.act(async () => pending[0].resolve(bookingDetail('21')));
  assert.ok(testing.screen.getByRole('dialog', { name: 'Booking BK-QA-22' }));
  assert.equal(testing.screen.queryByRole('dialog', { name: 'Booking BK-QA-21' }), null);
});

test('admin bookings reports loading failures and can retry without showing mock data', async () => {
  let attempts = 0;
  adminBookingsService.list = async () => {
    if (++attempts === 1) throw new Error('Máy chủ booking không phản hồi');
    return bookingPage([]);
  };
  render(createElement(AdminBookingsPage));
  await testing.screen.findByText('Máy chủ booking không phản hồi');
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Thử lại' }));
  await testing.screen.findByText('Không có booking phù hợp');
  assert.equal(attempts, 2);
});

function recommendationResult(name, mode = 'PERSONALIZED') {
  return {
    mode, signals: { viewed_homestays: mode === 'PERSONALIZED' ? 1 : 0, bookings: 0, favorites: 0, searches: 0 },
    items: [{ homestay: {
      id: '9007199254740993', name, city: 'Đà Lạt', average_rating: 4.7,
      is_claimed: 1, rooms: [{ id: '21', base_price: 700000, images: [] }],
    }, reasons: [mode === 'PERSONALIZED' ? 'Thuộc khu vực Đà Lạt bạn quan tâm' : 'Nổi bật theo điểm và số lượt đánh giá'] }],
  };
}
function recommendationTree(user) {
  return createElement(AuthContext.Provider, { value: { user, initializing: false } },
    createElement(MemoryRouter, null, createElement(HomestayRecommendations)));
}

test('recommendations show real behavior reasons and label the guest fallback honestly', async () => {
  const calls = [];
  recommendationsService.get = async (personalized) => {
    calls.push(personalized);
    return recommendationResult(personalized ? 'Gợi ý cá nhân QA' : 'Chỗ nghỉ phổ biến QA', personalized ? 'PERSONALIZED' : 'POPULAR');
  };
  const view = render(recommendationTree({ id: '15' }));
  await testing.screen.findByRole('heading', { name: 'Gợi ý theo sở thích của bạn' });
  assert.ok(testing.screen.getByText('Thuộc khu vực Đà Lạt bạn quan tâm'));
  assert.equal(testing.screen.getByRole('link', { name: 'Gợi ý cá nhân QA' }).getAttribute('href'), '/homestay/9007199254740993');
  assert.doesNotMatch(document.body.textContent, /98%/);
  view.rerender(createElement(ConfigProvider, null, createElement(AntApp, null, recommendationTree(null))));
  await testing.screen.findByRole('heading', { name: 'Chỗ nghỉ nổi bật' });
  await testing.screen.findByRole('link', { name: 'Chỗ nghỉ phổ biến QA' });
  assert.deepEqual(calls, [true, false]);
  assert.equal(testing.screen.queryByText('Thuộc khu vực Đà Lạt bạn quan tâm'), null);
});

test('recommendations never display another account history when requests finish out of order', async () => {
  const pending = [];
  recommendationsService.get = () => new Promise((resolve) => pending.push(resolve));
  const tree = (id) => createElement(ConfigProvider, null, createElement(AntApp, null, recommendationTree({ id })));
  const view = testing.render(tree('15'));
  view.rerender(tree('16'));
  await testing.act(async () => pending[1](recommendationResult('Gợi ý tài khoản 16')));
  await testing.screen.findByRole('link', { name: 'Gợi ý tài khoản 16' });
  await testing.act(async () => pending[0](recommendationResult('Gợi ý tài khoản 15')));
  assert.equal(testing.screen.queryByRole('link', { name: 'Gợi ý tài khoản 15' }), null);
});

test('recommendations report errors and retry instead of inventing personalized results', async () => {
  let calls = 0;
  recommendationsService.get = async () => {
    if (++calls === 1) throw new Error('Dịch vụ gợi ý chưa phản hồi');
    return recommendationResult('Gợi ý sau khi thử lại');
  };
  render(recommendationTree({ id: '15' }));
  await testing.screen.findByText('Dịch vụ gợi ý chưa phản hồi');
  assert.equal(testing.screen.queryByRole('heading', { name: 'Gợi ý theo sở thích của bạn' }), null);
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Thử lại' }));
  await testing.screen.findByRole('link', { name: 'Gợi ý sau khi thử lại' });
});

test('view tracking runs only for loaded homestays on an authenticated account', async () => {
  const views = [];
  recommendationsService.recordView = async (id) => { views.push(id); };
  function Tracker({ id }) { useTrackHomestayView(id); return null; }
  const tree = (user, id, initializing = false) => createElement(AuthContext.Provider, {
    value: { user, initializing },
  }, createElement(Tracker, { id }));
  const view = testing.render(tree(null, '21'));
  assert.equal(views.length, 0);
  view.rerender(tree({ id: '15' }, undefined));
  assert.equal(views.length, 0);
  view.rerender(tree({ id: '15' }, '21', true));
  assert.equal(views.length, 0);
  view.rerender(tree({ id: '15' }, '21'));
  assert.deepEqual(views, ['21']);
  view.rerender(tree(null, '21'));
  assert.deepEqual(views, ['21']);
  view.rerender(tree({ id: '16' }, '21'));
  assert.deepEqual(views, ['21', '21']);
});

test('merges favorites into behavior recommendations without navigating away from the home page', async () => {
  const toggles = [];
  recommendationsService.get = async () => recommendationResult('Nhà gợi ý yêu thích QA');
  function Location() { return createElement('output', { 'data-testid': 'favorite-location' }, useLocation().pathname); }
  function Harness() {
    const [saved, setSaved] = useState(false);
    return createElement(FavoritesContext.Provider, { value: {
      isFavorite: () => saved,
      toggleFavorite: async (id) => { toggles.push(id); setSaved((value) => !value); return !saved; },
    } }, createElement(AuthContext.Provider, { value: { user: { id: '15' }, initializing: false } },
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(HomestayRecommendations), createElement(Location)),
    ));
  }
  render(createElement(Harness));
  const save = await testing.screen.findByRole('button', { name: 'Lưu vào yêu thích: Nhà gợi ý yêu thích QA' });
  assert.equal(save.getAttribute('aria-pressed'), 'false');
  testing.fireEvent.click(save);
  const remove = await testing.screen.findByRole('button', { name: 'Bỏ lưu yêu thích: Nhà gợi ý yêu thích QA' });
  assert.equal(remove.getAttribute('aria-pressed'), 'true');
  assert.equal(testing.screen.getByTestId('favorite-location').textContent, '/');
  assert.deepEqual(toggles, ['9007199254740993']);
  testing.fireEvent.click(remove);
  await testing.screen.findByRole('button', { name: 'Lưu vào yêu thích: Nhà gợi ý yêu thích QA' });
  assert.equal(toggles.length, 2);
  assert.ok(testing.screen.getByRole('heading', { name: 'Gợi ý theo sở thích của bạn' }));
});

test('saving and removing a favorite refreshes recommendations and describes the real source', async () => {
  let saved = false;
  let calls = 0;
  favoritesService.getFavoriteIds = async () => [];
  favoritesService.toggleFavorite = async () => ({ is_favorite: saved = !saved });
  recommendationsService.get = async () => {
    calls++;
    const data = recommendationResult('Nhà theo yêu thích', saved ? 'PERSONALIZED' : 'POPULAR');
    data.signals = { viewed_homestays: 0, bookings: 0, favorites: saved ? 1 : 0, searches: 0 };
    return data;
  };
  render(createElement(AuthContext.Provider, { value: { user: { id: '15' }, isAuthenticated: true, initializing: false } },
    createElement(FavoritesProvider, null, createElement(MemoryRouter, null, createElement(HomestayRecommendations)))));
  testing.fireEvent.click(await testing.screen.findByRole('button', { name: 'Lưu vào yêu thích: Nhà theo yêu thích' }));
  await testing.screen.findByText('Dựa trên danh sách yêu thích của bạn.');
  assert.equal(calls, 2);
  testing.fireEvent.click(await testing.screen.findByRole('button', { name: 'Bỏ lưu yêu thích: Nhà theo yêu thích' }));
  await testing.screen.findByRole('heading', { name: 'Chỗ nghỉ nổi bật' });
  assert.equal(calls, 3);
});

test('recommendations refresh only for the current account behavior', async () => {
  let calls = 0;
  recommendationsService.get = async () => {
    calls++;
    const data = recommendationResult('Nhà sau tìm kiếm');
    data.signals = { viewed_homestays: 0, bookings: 0, favorites: 0, searches: 1 };
    return data;
  };
  render(recommendationTree({ id: '15' }));
  await testing.screen.findByText('Dựa trên lịch sử tìm kiếm của bạn.');
  await testing.act(async () => notifyRecommendationChange('16'));
  assert.equal(calls, 1);
  await testing.act(async () => notifyRecommendationChange('15'));
  assert.equal(calls, 2);
});

test('late favorite history cannot replace another account preferences', async () => {
  const pending = [];
  favoritesService.getFavoriteIds = () => new Promise((resolve) => pending.push(resolve));
  const tree = (user) => createElement(AuthContext.Provider, { value: { user, isAuthenticated: Boolean(user), initializing: false } },
    createElement(FavoritesProvider, null, createElement(FavoritesContext.Consumer, null,
      (value) => createElement('output', { 'data-testid': 'saved-ids' }, [...value.favoriteIds].join(',')))));
  const view = testing.render(tree({ id: '15' }));
  view.rerender(tree({ id: '16' }));
  await testing.act(async () => pending[1](['222']));
  assert.equal(testing.screen.getByTestId('saved-ids').textContent, '222');
  await testing.act(async () => pending[0](['111']));
  assert.equal(testing.screen.getByTestId('saved-ids').textContent, '222');
  view.rerender(tree(null));
  assert.equal(testing.screen.getByTestId('saved-ids').textContent, '');
});

test('search tracking ignores guests and defaults, and does not run merely from opening a page', async () => {
  const searches = [];
  recommendationsService.recordSearch = async (search) => searches.push(search);
  function Search() {
    const track = useTrackHomestaySearch();
    return createElement('div', null,
      createElement('button', { onClick: () => track({ city: 'Đà Lạt', guests: 4, rooms: 2 }) }, 'Tìm địa điểm'),
      createElement('button', { onClick: () => track({ city: 'Tất cả điểm đến', district: 'Tất cả quận/huyện' }) }, 'Tìm tất cả'));
  }
  const tree = (user, initializing = false) => createElement(AuthContext.Provider, { value: { user, initializing } }, createElement(Search));
  const view = testing.render(tree(null));
  testing.fireEvent.click(testing.screen.getByText('Tìm địa điểm'));
  assert.equal(searches.length, 0);
  view.rerender(tree({ id: '15' }, true));
  testing.fireEvent.click(testing.screen.getByText('Tìm địa điểm'));
  assert.equal(searches.length, 0);
  view.rerender(tree({ id: '15' }));
  assert.equal(searches.length, 0);
  testing.fireEvent.click(testing.screen.getByText('Tìm tất cả'));
  assert.equal(searches.length, 0);
  await testing.act(async () => testing.fireEvent.click(testing.screen.getByText('Tìm địa điểm')));
  assert.deepEqual(searches, [{ city: 'Đà Lạt', district: undefined, guests: 4, rooms: 2 }]);
});

test('home quick destination searches record the selected city without default guest preferences', async () => {
  const searches = [];
  recommendationsService.recordSearch = async (search) => searches.push(search);
  recommendationsService.get = async () => recommendationResult('Nhà trang chủ', 'POPULAR');
  customerService.getHomestays = async () => ({ items: [] });
  render(createElement(AuthContext.Provider, { value: { user: { id: '15' }, initializing: false } },
    createElement(MemoryRouter, null, createElement(HomePage))));
  await testing.screen.findByText('Nhà trang chủ');
  assert.equal(searches.length, 0);
  await testing.act(async () => testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Đà Lạt' })));
  assert.equal(searches.length, 1);
  assert.equal(searches[0].city, 'Đà Lạt');
  assert.equal(searches[0].guests, undefined);
});

test('home requests only one page and resets pagination when changing destination', async () => {
  const calls = [];
  recommendationsService.get = async () => ({ ...recommendationResult('Gợi ý trang chủ', 'POPULAR'), items: [] });
  recommendationsService.recordSearch = async () => {};
  customerService.getHomestays = async (...args) => {
    calls.push(args);
    const [city, , offset] = args;
    const homestay = recommendationResult(`Danh sách ${city ?? 'toàn quốc'} trang ${offset / 12 + 1}`).items[0].homestay;
    return { items: [homestay], total: 30 };
  };
  render(createElement(AuthContext.Provider, { value: { user: null, initializing: false } },
    createElement(MemoryRouter, null, createElement(HomePage))));
  await testing.screen.findByText('Danh sách toàn quốc trang 1');
  assert.deepEqual(calls[0].slice(0, 3), [undefined, 12, 0]);
  testing.fireEvent.click(testing.screen.getByTitle('2'));
  await testing.screen.findByText('Danh sách toàn quốc trang 2');
  assert.deepEqual(calls[1].slice(0, 3), [undefined, 12, 12]);
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Đà Lạt' }));
  await testing.screen.findByText('Danh sách Đà Lạt trang 1');
  assert.deepEqual(calls[2].slice(0, 3), ['Đà Lạt', 12, 0]);
});

test('late catalog responses cannot replace a more recent search', async () => {
  const pending = [];
  customerService.getHomestays = () => new Promise((resolve) => pending.push(resolve));
  function Catalog({ city }) {
    const result = useHomestayCatalog(city, 1, 12, {}, 0);
    return createElement('output', { 'data-testid': 'catalog-result' }, result.items[0]?.name ?? 'Đang tải');
  }
  const view = testing.render(createElement(Catalog, { city: 'Đà Lạt' }));
  view.rerender(createElement(Catalog, { city: 'Hà Nội' }));
  await testing.act(async () => pending[1]({ items: [{ name: 'Kết quả Hà Nội' }], total: 1 }));
  await testing.act(async () => pending[0]({ items: [{ name: 'Kết quả Đà Lạt cũ' }], total: 1 }));
  assert.equal(testing.screen.getByTestId('catalog-result').textContent, 'Kết quả Hà Nội');
});

test('home shows a failed catalog request and retries instead of reporting no results', async () => {
  let calls = 0;
  recommendationsService.get = async () => ({ ...recommendationResult('Gợi ý trang chủ', 'POPULAR'), items: [] });
  customerService.getHomestays = async () => {
    if (++calls === 1) throw new Error('Chưa kết nối được máy chủ danh sách');
    return { items: [], total: 0 };
  };
  render(createElement(MemoryRouter, null, createElement(HomePage)));
  await testing.screen.findByText('Chưa kết nối được máy chủ danh sách');
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Thử lại danh sách' }));
  await testing.waitFor(() => assert.equal(calls, 2));
  await testing.waitFor(() => assert.equal(testing.screen.queryByText('Chưa kết nối được máy chủ danh sách'), null));
});

test('public catalog coalesces identical network reads but keeps pages and errors separate', async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  const urls = [];
  try {
    globalThis.fetch = async (url) => {
      calls++; urls.push(String(url));
      return new Response(JSON.stringify({ data: { items: [], total: 30 } }), { headers: { 'content-type': 'application/json' } });
    };
    await Promise.all([originalGetHomestays('QA cache A', 12, 0), originalGetHomestays('QA cache A', 12, 0)]);
    assert.equal(calls, 1);
    await originalGetHomestays('QA cache A', 12, 0);
    assert.equal(calls, 1);
    await originalGetHomestays('QA cache A', 12, 12);
    assert.equal(calls, 2);
    assert.match(urls[1], /limit=12&offset=12/);
    globalThis.fetch = async () => { calls++; return new Response('{}', { status: 503 }); };
    await assert.rejects(originalGetHomestays('QA cache error', 12, 0));
    await assert.rejects(originalGetHomestays('QA cache error', 12, 0));
    assert.equal(calls, 4);
  } finally { globalThis.fetch = previousFetch; }
});
