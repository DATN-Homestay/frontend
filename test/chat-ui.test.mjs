import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { createElement as h } from 'react';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, ChatPage, ChatContext, AuthContext, chatService, originalService;
let ConfigProvider, AntApp, MemoryRouter, creates, contacts, historyRequests;
const people = {
  CUSTOMER: { id: '1', full_name: 'Khách kiểm thử', role: 'CUSTOMER', avatar_url: null },
  HOST: { id: '2', full_name: 'Chủ nhà kiểm thử', role: 'HOST', avatar_url: null },
  ADMIN: { id: '3', full_name: 'Hỗ trợ kiểm thử', role: 'ADMIN', avatar_url: null },
};
const conversation = (role, id = '10') => ({
  id, type: role === 'HOST' ? 'HOST_ADMIN' : 'CUSTOMER_ADMIN',
  customer_id: role === 'CUSTOMER' ? '1' : null, host_id: role === 'HOST' ? '2' : null,
  admin_id: '3', homestay: null, participants: [people[role], people.ADMIN],
  partner: people.ADMIN, unread_count: 0, last_message: null,
  created_at: '2026-11-16T00:00:00Z', last_message_at: null,
});
const legacy = { ...conversation('CUSTOMER', '9'), type: 'CUSTOMER_HOST', admin_id: null,
  host_id: '2', partner: people.HOST, participants: [people.CUSTOMER, people.HOST], unread_count: 5 };

before(async () => {
  dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'Document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot',
    'MutationObserver', 'localStorage', 'sessionStorage', 'Event', 'MouseEvent', 'KeyboardEvent']) globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.getComputedStyle = (element) => dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = (media) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  HTMLElement.prototype.scrollTo = function (options) { this.scrollTop = options.top ?? 0; };
  testing = await import('@testing-library/react');
  testing.configure({ asyncUtilTimeout: 5000, getElementError: (message) => new Error(message) });
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter } = await import('react-router-dom'));
  vite = await createServer({
    configFile: false, root: process.cwd(), plugins: [react()], appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: 'node_modules/.cache/chat-policy-test',
    server: { middlewareMode: true, ws: false, hmr: false, watch: { ignored: ['**/*'] } },
  });
  ChatPage = (await vite.ssrLoadModule('/src/features/chat/ChatPage.tsx')).default;
  ({ ChatContext } = await vite.ssrLoadModule('/src/features/chat/ChatContext.ts'));
  ({ AuthContext } = await vite.ssrLoadModule('/src/contexts/AuthContextDefinition.ts'));
  ({ chatService } = await vite.ssrLoadModule('/src/services/chatService.ts'));
  originalService = { ...chatService };
});

beforeEach(() => {
  creates = []; contacts = []; historyRequests = [];
  chatService.contacts = async (role) => { contacts.push(role); return { contacts: [people[role]], has_more: false }; };
  chatService.messages = async (id) => { historyRequests.push(id); return { messages: [], has_more: false, next_before_id: null }; };
});
afterEach(() => { testing.cleanup(); Object.assign(chatService, originalService); });
after(async () => { await vite?.close(); dom?.window.close(); });

function render(role, rows = [], query = '') {
  const context = {
    conversations: rows, loading: false, error: null, connection: 'connected',
    refreshInbox: async () => {}, reconnect: () => {}, notifyRead: () => {}, typing: () => {},
    subscribe: () => () => {},
    ensureConversation: async (id) => {
      const row = rows.find((c) => c.id === id);
      if (row?.type === 'CUSTOMER_HOST') throw new Error('Chức năng nhắn tin giữa chủ nhà và khách hàng đã được gỡ bỏ');
      return row;
    },
    createConversation: async (body) => { creates.push(body); return conversation(role === 'ADMIN' ? 'CUSTOMER' : role); },
  };
  const path = role === 'CUSTOMER' ? '/messages' : `/${role.toLowerCase()}/messages`;
  testing.render(h(ConfigProvider, { theme: { token: { motion: false } } }, h(AntApp, null,
    h(AuthContext.Provider, { value: { user: { ...people[role], roles: [role] }, initializing: false } },
      h(ChatContext.Provider, { value: context },
        h(MemoryRouter, { initialEntries: [`${path}${query}`] }, h(ChatPage, { portalRole: role })))))));
}

for (const role of ['CUSTOMER', 'HOST']) {
  test(`${role} can only start a conversation with platform support`, async () => {
    render(role);
    assert.equal(testing.screen.queryByRole('tab', { name: role === 'HOST' ? 'Khách hàng' : 'Chủ nhà' }), null);
    assert.ok(testing.screen.getByRole('tab', { name: 'Hỗ trợ' }));
    testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Cuộc trò chuyện mới' }));
    const dialog = await testing.screen.findByRole('dialog');
    const contact = await testing.within(dialog).findByRole('button', { name: /Hỗ trợ kiểm thử/ });
    assert.deepEqual(contacts, ['ADMIN']);
    testing.fireEvent.click(contact);
    await testing.waitFor(() => assert.equal(creates.length, 1));
    assert.deepEqual(creates[0], { type: `${role}_ADMIN`, recipient_id: '3', as_role: role });
  });
}

test('legacy homestay chat links do not create a conversation or show customer/host history', async () => {
  render('CUSTOMER', [legacy], '?homestay=8');
  assert.ok(testing.screen.getByText('Chưa có cuộc trò chuyện'));
  assert.equal(testing.screen.queryByRole('button', { name: /Chủ nhà kiểm thử/ }), null);
  assert.equal(testing.screen.queryByRole('textbox', { name: 'Nội dung tin nhắn' }), null);
  assert.equal(creates.length, 0);
  assert.equal(historyRequests.length, 0);
});

test('a direct legacy conversation link has no composer or history access', async () => {
  render('CUSTOMER', [legacy], '?conversation=9');
  await testing.screen.findByRole('alert');
  assert.equal(testing.screen.queryByRole('textbox', { name: 'Nội dung tin nhắn' }), null);
  assert.equal(historyRequests.length, 0);
});

test('admins still see and filter customer and host support conversations', () => {
  const customer = { ...conversation('CUSTOMER'), partner: people.CUSTOMER };
  const host = { ...conversation('HOST', '11'), partner: people.HOST };
  render('ADMIN', [customer, host]);
  assert.ok(testing.screen.getByRole('button', { name: 'Khách kiểm thử' }));
  assert.ok(testing.screen.getByRole('button', { name: 'Chủ nhà kiểm thử' }));
  testing.fireEvent.click(testing.screen.getByRole('tab', { name: 'Chủ nhà' }));
  assert.equal(testing.screen.queryByRole('button', { name: 'Khách kiểm thử' }), null);
  assert.ok(testing.screen.getByRole('button', { name: 'Chủ nhà kiểm thử' }));
});

test('customers can still send messages to support', async () => {
  const sent = [];
  chatService.send = async (id, content, clientId) => {
    sent.push({ id, content });
    return { id: '20', conversation_id: id, sender_id: '1', sender_role: 'CUSTOMER', content,
      client_message_id: clientId, is_read: 0, read_at: null, created_at: '2026-11-16T00:00:00Z' };
  };
  render('CUSTOMER', [conversation('CUSTOMER')], '?conversation=10');
  const input = await testing.screen.findByRole('textbox', { name: 'Nội dung tin nhắn' });
  await testing.waitFor(() => assert.equal(input.disabled, false));
  testing.fireEvent.change(input, { target: { value: 'Tôi cần hỗ trợ đặt phòng' } });
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  await testing.waitFor(() => assert.deepEqual(sent, [{ id: '10', content: 'Tôi cần hỗ trợ đặt phòng' }]));
});
