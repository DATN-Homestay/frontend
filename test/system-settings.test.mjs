import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, Configs, ConfigProvider, AntApp, state, mode, requests, history;
const nativeFetch = globalThis.fetch;
const definitions = [
  ['BOOKING_HOLD_MINUTES', 'booking', 'Thời gian giữ chỗ thanh toán', 'phút', 15, 5, 30],
  ['BOOKING_MAX_NIGHTS', 'booking', 'Số đêm tối đa mỗi đơn', 'đêm', 30, 1, 30],
  ['BOOKING_MAX_ADVANCE_DAYS', 'booking', 'Khoảng thời gian được đặt trước', 'ngày', 365, 1, 365],
  ['REVIEW_WINDOW_DAYS', 'reviews', 'Thời hạn gửi đánh giá', 'ngày', 30, 1, 60],
  ['AI_PRICE_MAX_CHANGE_PERCENT', 'ai', 'Biên độ điều chỉnh giá AI', '%', 30, 1, 30],
  ['AI_SUGGESTION_TTL_HOURS', 'ai', 'Thời hạn sử dụng gợi ý giá', 'giờ', 6, 1, 6],
];

before(async () => {
  dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot', 'MutationObserver', 'localStorage', 'sessionStorage', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.getComputedStyle = (element) => dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = (media) => ({ matches: true, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  testing = await import('@testing-library/react');
  testing.configure({ getElementError: (message) => new Error(message), asyncUtilTimeout: 5000 });
  vite = await createServer({ configFile: false, root: process.cwd(), plugins: [react()], appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: 'node_modules/.cache/settings-test',
    server: { middlewareMode: true, ws: false, hmr: false, watch: { ignored: ['**/*'] } },
  });
  Configs = (await vite.ssrLoadModule('/src/pages/admin/Configs.tsx')).default;
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? 'GET';
    const path = String(url);
    const body = options.body ? JSON.parse(options.body) : undefined;
    requests.push({ path, method, body });
    let status = 200, data;
    if (path.includes('/admin/configs/history')) data = { items: history, meta: { page: 1, limit: 10, total: history.length } };
    else if (path.endsWith('/admin/configs')) {
      if (method === 'PATCH') {
        if (mode === 'conflict') { status = 409; data = { message: 'Một quản trị viên khác đã cập nhật cấu hình.' }; }
        else if (mode === 'save-error') { status = 503; data = { message: 'Không lưu được cấu hình. Vui lòng thử lại.' }; }
        else {
          state.revision++;
          for (const change of body.changes) {
            const item = state.items.find((value) => value.key === change.key);
            history.unshift({ id: String(history.length + 1), revision: state.revision, setting_key: item.key, label: item.label, unit: item.unit,
              old_value: item.value, new_value: change.value, actor_id: '9', actor_name: 'Admin QA', reason: body.reason, created_at: state.updated_at });
            item.value = change.value;
          }
          data = structuredClone(state);
        }
      } else if (mode === 'load-error') { status = 503; data = { message: 'Không tải được cấu hình.' }; }
      else data = structuredClone(state);
    } else throw new Error(`Unexpected request: ${url}`);
    return new Response(JSON.stringify(status === 200 ? { statusCode: 200, data } : data), { status, headers: { 'Content-Type': 'application/json' } });
  };
});

beforeEach(() => {
  mode = ''; requests = []; history = [];
  state = { revision: 1, updated_at: '2026-11-16T08:00:00Z',
    items: definitions.map(([key, group, label, unit, defaultValue, min, max]) => ({ key, group, label, unit, defaultValue, value: defaultValue, min, max, description: `Áp dụng: ${label}` })),
    policies: [{ key: 'commission', label: 'Hoa hồng sàn', value: '7,5%', description: 'Chính sách cố định' }],
  };
});
afterEach(() => testing.cleanup());
after(async () => { await vite?.close(); dom?.window.close(); globalThis.fetch = nativeFetch; });

async function render() {
  testing.render(createElement(ConfigProvider, { theme: { token: { motion: false } } }, createElement(AntApp, null, createElement(Configs))));
  return testing.screen.findByRole('spinbutton', { name: 'Thời gian giữ chỗ thanh toán' });
}
const saveButton = () => testing.screen.getByRole('button', { name: /Lưu thay đổi/ });
const enterReason = () => testing.fireEvent.change(testing.screen.getByRole('textbox', { name: 'Lý do thay đổi' }), { target: { value: 'Điều chỉnh mùa cao điểm' } });

test('loads persisted values, saves only changed keys, and displays real change history', async () => {
  const field = await render();
  assert.equal(field.value, '15');
  assert.equal(saveButton().disabled, true);
  testing.fireEvent.change(field, { target: { value: '10' } });
  enterReason();
  testing.fireEvent.click(saveButton());
  await testing.waitFor(() => assert.equal(saveButton().disabled, true));
  const patch = requests.find((request) => request.method === 'PATCH');
  assert.deepEqual(patch.body, { revision: 1, changes: [{ key: 'BOOKING_HOLD_MINUTES', value: 10 }], reason: 'Điều chỉnh mùa cao điểm' });
  assert.equal(state.items[0].value, 10);
  testing.fireEvent.click(testing.screen.getByRole('tab', { name: /Lịch sử thay đổi/ }));
  await testing.screen.findByText('Admin QA');
  assert.ok(testing.screen.getByText('Điều chỉnh mùa cao điểm'));
});

test('blocks invalid numeric values and restores the saved values with undo', async () => {
  const field = await render();
  testing.fireEvent.change(field, { target: { value: '4' } });
  enterReason();
  assert.equal(field.getAttribute('aria-invalid'), 'true');
  assert.equal(saveButton().disabled, true);
  assert.equal(requests.filter((request) => request.method === 'PATCH').length, 0);
  testing.fireEvent.click(testing.screen.getByRole('button', { name: /Hoàn tác/ }));
  assert.equal(field.value, '15');
  assert.equal(testing.screen.queryByRole('textbox', { name: 'Lý do thay đổi' }), null);
});

test('default values are a draft until the admin explicitly saves them', async () => {
  state.items[0].value = 20;
  const field = await render();
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Dùng mặc định' }));
  assert.equal(field.value, '15');
  assert.equal(state.items[0].value, 20);
  assert.equal(requests.some((request) => request.method === 'PATCH'), false);
  enterReason(); testing.fireEvent.click(saveButton());
  await testing.waitFor(() => assert.equal(state.items[0].value, 15));
});

test('preserves the draft on save failure and can retry without fetching over it', async () => {
  const field = await render();
  testing.fireEvent.change(field, { target: { value: '10' } }); enterReason();
  mode = 'save-error'; testing.fireEvent.click(saveButton());
  const retry = await testing.screen.findByRole('button', { name: 'Thử lưu lại' });
  assert.equal(field.value, '10');
  mode = ''; testing.fireEvent.click(retry);
  await testing.waitFor(() => assert.equal(state.items[0].value, 10));
  assert.equal(requests.filter((request) => request.method === 'GET' && request.path.endsWith('/admin/configs')).length, 1);
});

test('prevents overwriting a newer revision and reloads only when requested', async () => {
  const field = await render();
  testing.fireEvent.change(field, { target: { value: '10' } }); enterReason();
  mode = 'conflict'; state.revision = 2; state.items[0].value = 20;
  testing.fireEvent.click(saveButton());
  const reload = await testing.screen.findByRole('button', { name: 'Tải bản mới' });
  assert.equal(field.value, '10'); assert.equal(saveButton().disabled, true);
  testing.fireEvent.click(reload);
  const refreshed = await testing.screen.findByRole('spinbutton', { name: 'Thời gian giữ chỗ thanh toán' });
  assert.equal(refreshed.value, '20');
});

test('shows a loading error and retry instead of mock or default configuration', async () => {
  mode = 'load-error';
  testing.render(createElement(ConfigProvider, { theme: { token: { motion: false } } }, createElement(AntApp, null, createElement(Configs))));
  await testing.screen.findByText('Không tải được cấu hình.');
  assert.equal(testing.screen.queryByRole('spinbutton'), null);
  mode = ''; testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Thử lại' }));
  assert.equal((await testing.screen.findByRole('spinbutton', { name: 'Thời gian giữ chỗ thanh toán' })).value, '15');
});
