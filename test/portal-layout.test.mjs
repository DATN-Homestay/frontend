import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, HostLayout, AdminLayout, AuthContext, ChatContext;
let ConfigProvider, AntApp, MemoryRouter, Routes, Route, useLocation;
let viewport = 1280;

before(async () => {
  dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot',
    'MutationObserver', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.getComputedStyle = (element) => dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = (media) => ({
    media,
    matches: (!/min-width:\s*(\d+)px/.test(media) || viewport >= Number(media.match(/min-width:\s*(\d+)px/)[1])) &&
      (!/max-width:\s*(\d+)px/.test(media) || viewport <= Number(media.match(/max-width:\s*(\d+)px/)[1])),
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  testing = await import('@testing-library/react');
  testing.configure({ getElementError: (message) => new Error(message) });
  vite = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
    plugins: [react()], appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] },
    cacheDir: 'node_modules/.cache/portal-layout-test',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } } });
  HostLayout = (await vite.ssrLoadModule('/src/layouts/HostLayout.tsx')).default;
  AdminLayout = (await vite.ssrLoadModule('/src/layouts/AdminLayout.tsx')).default;
  ({ AuthContext } = await vite.ssrLoadModule('/src/contexts/AuthContextDefinition.ts'));
  ({ ChatContext } = await vite.ssrLoadModule('/src/features/chat/ChatContext.ts'));
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom'));
});

afterEach(() => { testing.cleanup(); viewport = 1280; });
after(async () => { await vite?.close(); dom?.window.close(); });

function Location() { return h('output', { 'data-testid': 'location' }, useLocation().pathname); }

function mount(role, path, roles = [role]) {
  const base = role === 'HOST' ? '/host' : '/admin';
  const auth = { user: { id: '1', full_name: 'Người dùng QA', roles },
    isAdmin: roles.includes('ADMIN'), isHost: roles.includes('HOST'), logout: async () => {} };
  const chat = { conversations: [
    { participants: [{ id: '1', role }], unread_count: 3 },
    { participants: [{ id: '2', role }], unread_count: 8 },
  ] };
  return testing.render(h(ConfigProvider, { theme: { token: { motion: false } } }, h(AntApp, null,
    h(AuthContext.Provider, { value: auth }, h(ChatContext.Provider, { value: chat },
      h(MemoryRouter, { initialEntries: [path] },
        h(Routes, null,
          h(Route, { path: base, element: h(role === 'HOST' ? HostLayout : AdminLayout) },
            h(Route, { path: '*', element: h('p', null, 'Nội dung trang') })),
          h(Route, { path: '/', element: h('p', null, 'Trang khách hàng') })),
        h(Location)))))));
}

test('selects the host section on nested routes and preserves navigation while collapsed', async () => {
  mount('HOST', '/host/bookings/42');
  const toggle = await testing.screen.findByRole('button', { name: 'Thu gọn menu' });
  assert.equal(testing.screen.getByRole('heading', { name: 'Đơn đặt phòng' }).tagName, 'H1');
  assert.equal(testing.screen.getByRole('menuitem', { name: /Đơn đặt phòng/ }).querySelector('[aria-current="page"]').textContent, 'Đơn đặt phòng');
  testing.fireEvent.click(toggle);
  assert.equal(testing.screen.getByRole('button', { name: 'Mở rộng menu' }).getAttribute('aria-expanded'), 'false');
  testing.fireEvent.click(testing.screen.getByRole('menuitem', { name: /Lịch giá & gợi ý AI/ }));
  assert.equal(testing.screen.getByTestId('location').textContent, '/host/pricing');
});

test('shows real unread counts and keeps admin finance pages directly accessible', async () => {
  mount('ADMIN', '/admin/refunds');
  await testing.screen.findByRole('button', { name: 'Thu gọn menu' });
  assert.ok(testing.screen.getByRole('heading', { name: 'Yêu cầu hoàn tiền' }));
  assert.ok(testing.screen.getByRole('menuitem', { name: /Doanh thu & hoa hồng/ }));
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Tin nhắn, 3 chưa đọc' }));
  assert.equal(testing.screen.getByTestId('location').textContent, '/admin/messages');
});

test('opens a mobile drawer and closes it after choosing a page', async () => {
  viewport = 390;
  mount('HOST', '/host');
  const toggle = await testing.screen.findByRole('button', { name: 'Mở menu điều hướng' });
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  testing.fireEvent.click(toggle);
  const drawer = await testing.screen.findByRole('dialog');
  testing.fireEvent.click(testing.within(drawer).getByRole('menuitem', { name: /Chỗ nghỉ của tôi/ }));
  assert.equal(testing.screen.getByTestId('location').textContent, '/host/listings');
  await testing.waitFor(() => assert.equal(testing.screen.queryByRole('dialog'), null));
});

test('offers portal switching according to the signed-in roles', async () => {
  mount('HOST', '/host', ['HOST']);
  await testing.screen.findByRole('button', { name: 'Thu gọn menu' });
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Chuyển không gian làm việc' }));
  assert.ok(await testing.screen.findByRole('menuitem', { name: /Trang khách hàng/ }));
  assert.equal(testing.screen.queryByRole('menuitem', { name: /Quản trị hệ thống/ }), null);
});
