import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, ComplaintsPage, ConfigProvider, AntApp;
const nativeFetch = globalThis.fetch;
const requests = [];

const complaint = (over = {}) => ({
  id: '24',
  booking_id: '100',
  booking_code: 'BK-100',
  check_in_date: '2026-11-10',
  check_out_date: '2026-11-12',
  homestay: { id: '1', name: 'Mộc Homestay' },
  reporter: { id: '7', full_name: 'Nguyễn Văn An' },
  category: 'NOT_AS_DESCRIBED',
  title: 'Điều hòa hỏng',
  description: 'Điều hòa hỏng cả đêm, đã báo chủ nhà nhưng không sửa.',
  attachments: [],
  status: 'OPEN',
  resolution_note: null,
  resolved_at: null,
  created_at: '2026-11-13T02:00:00.000Z',
  updated_at: '2026-11-13T02:00:00.000Z',
  ...over,
});

let current = complaint();

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
    cacheDir: 'node_modules/.cache/admin-complaints-test',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  ComplaintsPage = (await vite.ssrLoadModule('/src/pages/admin/Complaints.tsx')).default;
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    requests.push({ url: String(url), method, body: init.body ? JSON.parse(init.body) : undefined });
    const json = (data) =>
      new Response(JSON.stringify({ statusCode: 200, message: 'ok', data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    if (method === 'GET' && /\/admin\/complaints\?/.test(String(url))) {
      return json({ items: [current], meta: { page: 1, limit: 10, total: 1, total_pages: 1 } });
    }
    if (method === 'PATCH' && /\/admin\/complaints\/24$/.test(String(url))) {
      const body = JSON.parse(init.body);
      current = complaint({ status: body.status, resolution_note: body.resolution_note ?? null });
      return json(current);
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };
});

after(async () => {
  testing?.cleanup();
  await vite?.close();
  dom?.window.close();
  globalThis.fetch = nativeFetch;
});

test('admin khiếu nại: xem danh sách, nhận xử lý, đóng phải có ghi chú, gửi đúng API', async () => {
  testing.render(
    createElement(ConfigProvider, { theme: { token: { motion: false } } },
      createElement(AntApp, null, createElement(ComplaintsPage)),
    ),
  );
  const { screen, fireEvent, within, waitFor } = testing;

  await screen.findByText('Điều hòa hỏng');
  assert.ok(screen.getByText('BK-100'));
  assert.ok(screen.getByText('Mới gửi'));
  assert.match(requests[0].url, /\/admin\/complaints\?page=1&limit=10$/);

  fireEvent.click(screen.getByRole('button', { name: 'Xử lý' }));
  const drawer = await screen.findByRole('dialog');
  assert.ok(within(drawer).getByText('Điều hòa hỏng cả đêm, đã báo chủ nhà nhưng không sửa.'));

  // Nhận xử lý: không cần ghi chú
  fireEvent.click(within(drawer).getByRole('button', { name: 'Nhận xử lý' }));
  await waitFor(() => assert.ok(requests.some((r) => r.method === 'PATCH')));
  assert.deepEqual(requests.find((r) => r.method === 'PATCH').body, { status: 'IN_REVIEW' });
  await waitFor(() => assert.equal(within(screen.getByRole('dialog')).queryByRole('button', { name: 'Nhận xử lý' }), null));

  // Đóng mà chưa ghi chú → không gọi API
  const patches = () => requests.filter((r) => r.method === 'PATCH');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Đã giải quyết/ }));
  await screen.findByText('Ghi chú kết quả cho khách cần ít nhất 10 ký tự');
  assert.equal(patches().length, 1);

  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Ghi chú kết quả' }), {
    target: { value: '  Đã yêu cầu chủ nhà sửa điều hòa.  ' },
  });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Đã giải quyết/ }));
  await waitFor(() => assert.equal(patches().length, 2));
  assert.deepEqual(patches()[1].body, { status: 'RESOLVED', resolution_note: 'Đã yêu cầu chủ nhà sửa điều hòa.' });

  // Đã đóng: không còn nút xử lý, hiện ghi chú
  const dlg = screen.getByRole('dialog');
  await within(dlg).findByText('Đã yêu cầu chủ nhà sửa điều hòa.', { exact: false });
  assert.equal(within(dlg).queryByRole('button', { name: /Bác bỏ/ }), null);
});
