import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom,
  vite,
  testing,
  DropshipOrders,
  Register,
  AuthContext,
  authService,
  ConfigProvider,
  AntApp,
  MemoryRouter;
let payload;
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
  ({ authService } = await vite.ssrLoadModule('/src/services/authService.ts'));
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter } = await import('react-router-dom'));
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
