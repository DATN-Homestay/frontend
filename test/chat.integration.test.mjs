import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement, StrictMode } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// Optional integration workflow against an isolated backend with seeded test accounts.
// No .env, production accounts or shared database are used by this suite.
const origin = process.env.CHAT_TEST_ORIGIN;
let dom, vite, testing, AuthProvider, ChatProvider, ChatPage, MemoryRouter, ConfigProvider, AntApp;
const nativeFetch = globalThis.fetch;
const testPassword = process.env.CHAT_TEST_PASSWORD ?? 'DemoPass123';
let received = [];
let failNextSend = false;

async function login(email) {
  const response = await nativeFetch(`${origin}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: testPassword }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).data;
}

async function api(path, token, method = 'GET', body) {
  const response = await nativeFetch(`${origin}/api/v1${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(response.ok, `API ${method} ${path}: ${response.status}`);
  return (await response.json()).data;
}

async function mount(email, role, path) {
  testing.cleanup();
  const session = await login(email);
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('access_token', session.access_token);
  localStorage.setItem('refresh_token', session.refresh_token);
  localStorage.setItem('user_profile', JSON.stringify(session.user));
  testing.render(createElement(StrictMode, null,
    createElement(ConfigProvider, null, createElement(AntApp, null,
      createElement(AuthProvider, null, createElement(ChatProvider, null,
        createElement(MemoryRouter, { initialEntries: [path] }, createElement(ChatPage, { portalRole: role }))))))));
  await testing.screen.findByRole('button', { name: 'Đã kết nối' }, { timeout: 12000 });
  return session;
}

describe('Chat frontend with real REST + Socket.IO backend', { skip: !origin }, () => {
  before(async () => {
    dom = new JSDOM('<html><body></body></html>', { url: origin, pretendToBeVisual: true });
    for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot', 'MutationObserver',
      'localStorage', 'sessionStorage', 'Event', 'StorageEvent', 'MouseEvent', 'KeyboardEvent']) globalThis[key] = dom.window[key];
    Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
    globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.matchMedia = (media) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    HTMLElement.prototype.scrollTo = function (options) { this.scrollTop = options.top ?? 0; };
    globalThis.fetch = (url, options) => {
      if (String(url).includes('/messages') && options?.method === 'POST') {
        received.push(JSON.parse(options.body));
        if (failNextSend) { failNextSend = false; return Promise.reject(new TypeError('Test network error')); }
      }
      return nativeFetch(new URL(url, origin), options);
    };
    testing = await import('@testing-library/react');
    testing.configure({ getElementError: (message) => new Error(message), asyncUtilTimeout: 5000 });
    vite = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [react()],
      appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] },
      cacheDir: 'node_modules/.cache/chat-ui-test',
      server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } } });
    ({ AuthProvider } = await vite.ssrLoadModule('/src/contexts/AuthContext.tsx'));
    ChatProvider = (await vite.ssrLoadModule('/src/features/chat/ChatProvider.tsx')).default;
    ChatPage = (await vite.ssrLoadModule('/src/features/chat/ChatPage.tsx')).default;
    ({ MemoryRouter } = await import('react-router-dom'));
    ({ ConfigProvider, App: AntApp } = await import('antd'));
  });

  after(async () => {
    testing?.cleanup();
    await vite?.close();
    dom?.window.close();
    globalThis.fetch = nativeFetch;
  });

  it('loads persisted history, sends optimistic text once, receives realtime replies and updates receipts', async () => {
    const customer = await mount('kh-chat@example.test', 'CUSTOMER', '/messages?conversation=1');
    const host = await login('host-chat@example.test');
    const screen = testing.screen;
    await testing.within(screen.getByRole('log')).findByText('Mình sẽ kiểm tra lịch phòng ngày đó và báo lại bạn nhé. Giờ nhận phòng thông thường là 14h.', {}, { timeout: 10000 });
    const input = screen.getByRole('textbox', { name: 'Nội dung tin nhắn' });
    testing.fireEvent.change(input, { target: { value: 'Tin gửi từ kiểm thử frontend' } });
    testing.fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    const log = screen.getByRole('log');
    await testing.waitFor(() => assert.equal(testing.within(log).getAllByText('Tin gửi từ kiểm thử frontend').length, 1), { timeout: 10000 });
    await testing.waitFor(() => assert.equal(screen.queryByText('Đang gửi'), null), { timeout: 10000 });
    assert.equal(input.value, '');
    assert.equal(received.filter((body) => body.content === 'Tin gửi từ kiểm thử frontend').length, 1);
    const saved = await api('/chat/conversations/1/messages', customer.access_token);
    const sent = saved.messages.find((m) => m.content === 'Tin gửi từ kiểm thử frontend');
    assert.ok(sent?.client_message_id);
    await api('/chat/conversations/1/messages', host.access_token, 'POST', { content: 'Host trả lời realtime cho frontend' });
    await testing.within(log).findByText('Host trả lời realtime cho frontend', {}, { timeout: 10000 });
    await api('/chat/conversations/1/read', host.access_token, 'PATCH', {});
    await testing.waitFor(() => {
      const bubble = testing.within(log).getByText('Tin gửi từ kiểm thử frontend').closest('.chat-message');
      assert.match(bubble.textContent, /Đã xem/);
    }, { timeout: 10000 });
  });

  it('loads older messages through the cursor and searches Vietnamese conversation names', async () => {
    const screen = testing.screen;
    testing.fireEvent.click(screen.getByRole('button', { name: 'Xem tin nhắn trước' }));
    await testing.within(screen.getByRole('log')).findByText('Mình muốn tìm hiểu thêm về tiện nghi của chỗ ở. (1)', {}, { timeout: 10000 });
    testing.fireEvent.change(screen.getByRole('textbox', { name: 'Tìm hội thoại' }), { target: { value: 'hoang nam' } });
    assert.ok(screen.getByRole('button', { name: /Nguyễn Hoàng Nam/ }));
    assert.equal(screen.queryByRole('button', { name: /Trần Mai Phương/ }), null);
    testing.fireEvent.change(screen.getByRole('textbox', { name: 'Tìm hội thoại' }), { target: { value: '' } });
  });

  it('opens a real admin conversation from the new conversation picker', async () => {
    const screen = testing.screen;
    testing.fireEvent.click(screen.getByRole('button', { name: 'Cuộc trò chuyện mới' }));
    await screen.findByRole('dialog');
    testing.fireEvent.click(screen.getByRole('radio', { name: 'Hỗ trợ StayAI' }));
    const contact = await testing.within(screen.getByRole('dialog')).findByRole('button', { name: /StayAI · Thanh Thảo/ }, { timeout: 10000 });
    testing.fireEvent.click(contact);
    await testing.waitFor(() => assert.equal(screen.queryByRole('dialog'), null), { timeout: 10000 });
    await testing.within(screen.getByRole('log')).findByText('Chào Minh Anh, đội ngũ StayAI có thể hỗ trợ bạn điều gì hôm nay?', {}, { timeout: 10000 });
  });

  it('retains the same client ID when retrying a failed send', async () => {
    const screen = testing.screen;
    failNextSend = true;
    testing.fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung tin nhắn' }), { target: { value: 'Tin thử gửi lại khi lỗi mạng' } });
    testing.fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    const retry = await screen.findByRole('button', { name: /Gửi lại tin nhắn/ });
    testing.fireEvent.click(retry);
    await testing.waitFor(() => assert.equal(screen.queryByText('Chưa gửi được'), null), { timeout: 10000 });
    const requests = received.filter((body) => body.content === 'Tin thử gửi lại khi lỗi mạng');
    assert.equal(requests.length, 2);
    assert.equal(requests[0].client_message_id, requests[1].client_message_id);
  });

  it('shows the host inbox and creates host-admin messages with the host role', async () => {
    await mount('host-chat@example.test', 'HOST', '/host/messages?conversation=4');
    const screen = testing.screen;
    await testing.within(screen.getByRole('log')).findByText('Chào StayAI, mình muốn hỏi về lịch đối soát tháng này.', {}, { timeout: 10000 });
    testing.fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung tin nhắn' }), { target: { value: 'Host gửi tin từ frontend' } });
    testing.fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await testing.waitFor(() => assert.equal(screen.queryByText('Đang gửi'), null), { timeout: 10000 });
    const session = await login('host-chat@example.test');
    const page = await api('/chat/conversations/4/messages', session.access_token);
    assert.equal(page.messages.find((m) => m.content === 'Host gửi tin từ frontend')?.sender_role, 'HOST');
  });

  it('shows both customer and host conversations to an admin', async () => {
    await mount('admin-chat@example.test', 'ADMIN', '/admin/messages');
    await testing.screen.findByRole('button', { name: /Minh Anh/ }, { timeout: 10000 });
    assert.ok(testing.screen.getByRole('button', { name: /Nguyễn Hoàng Nam/ }));
    testing.fireEvent.click(testing.screen.getByRole('tab', { name: 'Khách hàng' }));
    assert.equal(testing.screen.queryByRole('button', { name: /Nguyễn Hoàng Nam/ }), null);
  });
});
