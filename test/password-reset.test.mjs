import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement as h } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, ForgotPassword, ResetPassword, Login, AuthLayout, AuthContext;
let ConfigProvider, AntApp, MemoryRouter, Routes, Route, authService;
let requests, reply, logoutCount;
const nativeFetch = globalThis.fetch;
const token = 'a'.repeat(64);
const success = { message: 'Nếu email thuộc một tài khoản đang hoạt động, mã OTP đã được gửi tới email đó.', retry_after_seconds: 60 };
const verifiedEntry = () => ({ pathname: '/auth/reset-password', state: { resetToken: token, resetExpiresAt: Date.now() + 300_000 } });

before(async () => {
  dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'Document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot', 'MutationObserver', 'localStorage', 'sessionStorage', 'Event', 'MouseEvent', 'KeyboardEvent']) {
    globalThis[key] = dom.window[key];
  }
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.getComputedStyle = (element) => dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = (media) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  testing = await import('@testing-library/react');
  testing.configure({ getElementError: (message) => new Error(message), asyncUtilTimeout: 5000 });
  vite = await createServer({
    configFile: false, root: process.cwd(), plugins: [react()], appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: 'node_modules/.cache/password-reset-tests',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  // Preload external UI modules before evaluating the pages through Vite SSR.
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  await import('@ant-design/icons');
  ForgotPassword = (await vite.ssrLoadModule('/src/pages/auth/ForgotPassword.tsx')).default;
  ResetPassword = (await vite.ssrLoadModule('/src/pages/auth/ResetPassword.tsx')).default;
  Login = (await vite.ssrLoadModule('/src/pages/auth/Login.tsx')).default;
  AuthLayout = (await vite.ssrLoadModule('/src/layouts/AuthLayout.tsx')).default;
  ({ AuthContext } = await vite.ssrLoadModule('/src/contexts/AuthContextDefinition.ts'));
  ({ authService } = await vite.ssrLoadModule('/src/services/authService.ts'));
  ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), method: options?.method, body: JSON.parse(options?.body ?? '{}') });
    return new Response(JSON.stringify(reply.status >= 400 ? { message: reply.message } : { statusCode: 200, data: reply.data }), {
      status: reply.status, headers: { 'Content-Type': 'application/json' },
    });
  };
});

beforeEach(() => {
  requests = [];
  logoutCount = 0;
  reply = { status: 200, data: success };
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => testing.cleanup());
after(async () => { await vite?.close(); globalThis.fetch = nativeFetch; dom?.window.close(); });

function renderAt(path, user = null) {
  const context = { user, initializing: false, logout: async () => { logoutCount++; }, login: async () => {} };
  return testing.render(h(ConfigProvider, { theme: { token: { motion: false } } }, h(AntApp, null,
    h(AuthContext.Provider, { value: context }, h(MemoryRouter, { initialEntries: [path] },
      h(Routes, null,
        h(Route, { path: '/auth', element: h(AuthLayout) },
          h(Route, { path: 'login', element: h(Login) }),
          h(Route, { path: 'forgot-password', element: h(ForgotPassword) }),
          h(Route, { path: 'reset-password', element: h(ResetPassword) }),
        ),
        h(Route, { path: '/', element: h('div', null, 'Trang chủ') }),
      ),
    )),
  )));
}

const change = (label, value) => testing.fireEvent.change(testing.screen.getByLabelText(label), { target: { value } });
const submit = (name) => testing.fireEvent.click(testing.screen.getByRole('button', { name }));

test('login links to the recovery form', async () => {
  renderAt('/auth/login');
  testing.fireEvent.click(testing.screen.getByRole('link', { name: 'Quên mật khẩu?' }));
  await testing.screen.findByRole('button', { name: 'Gửi mã OTP' });
});

test('forgot password submits normalized email and shows a resend cooldown', async () => {
  renderAt('/auth/forgot-password');
  change('Email', 'Customer@Example.COM');
  submit('Gửi mã OTP');
  await testing.screen.findByText('Kiểm tra email để lấy mã OTP');
  assert.deepEqual(requests[0].body, { email: 'customer@example.com' });
  assert.ok(requests[0].url.endsWith('/auth/forgot-password'));
  assert.equal(requests[0].method, 'POST');
  assert.equal(testing.screen.getByRole('button', { name: /Gửi lại mã sau/ }).disabled, true);
  assert.ok(testing.screen.getByLabelText('Mã OTP'));
  assert.equal(testing.screen.queryByLabelText('Mật khẩu mới'), null);
});

test('invalid email is rejected before any API call', async () => {
  renderAt('/auth/forgot-password');
  change('Email', 'not-an-email');
  submit('Gửi mã OTP');
  await testing.screen.findByText('Email không đúng định dạng');
  assert.equal(requests.length, 0);
});

test('SMTP errors remain visible and allow retry', async () => {
  reply = { status: 503, message: 'Chưa gửi được email. Vui lòng thử lại sau.' };
  renderAt('/auth/forgot-password');
  change('Email', 'customer@example.com');
  submit('Gửi mã OTP');
  await testing.screen.findByText(reply.message);
  assert.equal(testing.screen.getByRole('button', { name: 'Gửi mã OTP' }).disabled, false);
  reply = { status: 200, data: success };
  submit('Gửi mã OTP');
  await testing.screen.findByText('Kiểm tra email để lấy mã OTP');
  assert.equal(requests.length, 2);
});

test('direct access and legacy email links cannot open the password form without OTP verification', () => {
  renderAt('/auth/reset-password#token=849201');
  assert.ok(testing.screen.getByText('Vui lòng xác minh mã OTP trước'));
  assert.equal(testing.screen.queryByLabelText('Mật khẩu mới'), null);
  assert.equal(testing.screen.getByRole('link', { name: 'Yêu cầu mã OTP mới' }).getAttribute('href'), '/auth/forgot-password');
  assert.equal(requests.length, 0);
});

test('password confirmation prevents submitting a mismatched password', async () => {
  renderAt(verifiedEntry());
  change('Mật khẩu mới', 'NewPassword123');
  change('Xác nhận mật khẩu mới', 'OtherPassword123');
  submit('Lưu mật khẩu mới');
  await testing.screen.findByText('Mật khẩu xác nhận không khớp');
  assert.equal(requests.length, 0);
});

test('a verified reset clears the session and returns to login', async () => {
  reply = { status: 200, data: { message: 'Đặt lại thành công' } };
  renderAt(verifiedEntry());
  change('Mật khẩu mới', 'NewPassword123');
  change('Xác nhận mật khẩu mới', 'NewPassword123');
  submit('Lưu mật khẩu mới');
  await testing.screen.findByText('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
  assert.ok(requests[0].url.endsWith('/auth/reset-password'));
  assert.deepEqual(requests[0].body, { token, new_password: 'NewPassword123' });
  assert.equal(logoutCount, 1);
  assert.ok(testing.screen.getByRole('button', { name: 'Đăng Nhập' }));
});

test('an expired verified session displays the API error and lets the user request a new OTP', async () => {
  reply = { status: 400, message: 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' };
  renderAt(verifiedEntry());
  change('Mật khẩu mới', 'NewPassword123');
  change('Xác nhận mật khẩu mới', 'NewPassword123');
  submit('Lưu mật khẩu mới');
  await testing.screen.findByText(reply.message);
  assert.equal(logoutCount, 0);
  testing.fireEvent.click(testing.screen.getByRole('link', { name: 'Yêu cầu mã OTP mới' }));
  await testing.screen.findByRole('button', { name: 'Gửi mã OTP' });
});

test('a logged-in user can open a verified reset session without being redirected home', () => {
  renderAt(verifiedEntry(), { full_name: 'Khách hàng', roles: ['CUSTOMER'] });
  assert.ok(testing.screen.getByLabelText('Mật khẩu mới'));
  assert.equal(testing.screen.queryByText('Trang chủ'), null);
});

test('recovery API errors do not attempt token refresh', async () => {
  localStorage.setItem('refresh_token', 'existing-session');
  reply = { status: 401, message: 'Từ chối yêu cầu' };
  await assert.rejects(authService.forgotPassword('customer@example.com'), /Từ chối yêu cầu/);
  await assert.rejects(authService.verifyResetOtp('customer@example.com', '123456'), /Từ chối yêu cầu/);
  await assert.rejects(authService.resetPassword({ token, new_password: 'NewPassword123' }), /Từ chối yêu cầu/);
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => !request.url.endsWith('/auth/refresh')));
});

test('OTP must be six digits before sending a verification request', async () => {
  renderAt('/auth/forgot-password');
  change('Email', 'customer@example.com');
  submit('Gửi mã OTP');
  await testing.screen.findByLabelText('Mã OTP');
  change('Mã OTP', '12345');
  submit('Xác minh OTP');
  await testing.screen.findByText('Mã OTP phải gồm 6 chữ số');
  assert.equal(requests.length, 1);
});

test('OTP verification binds the code to the requested email and then opens the password form', async () => {
  renderAt('/auth/forgot-password');
  change('Email', 'Customer@Example.COM');
  submit('Gửi mã OTP');
  await testing.screen.findByLabelText('Mã OTP');
  reply = { status: 200, data: { reset_token: token, expires_in: 300 } };
  change('Mã OTP', '012345');
  submit('Xác minh OTP');
  await testing.screen.findByLabelText('Mật khẩu mới');
  assert.ok(requests[1].url.endsWith('/auth/verify-reset-otp'));
  assert.deepEqual(requests[1].body, { email: 'customer@example.com', otp_code: '012345' });
  assert.equal(requests[1].method, 'POST');
  assert.equal(testing.screen.queryByLabelText('Mã OTP'), null);
  reply = { status: 200, data: { message: 'Đặt lại thành công' } };
  change('Mật khẩu mới', 'NewPassword123');
  change('Xác nhận mật khẩu mới', 'NewPassword123');
  submit('Lưu mật khẩu mới');
  await testing.screen.findByText('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
  assert.deepEqual(requests[2].body, { token, new_password: 'NewPassword123' });
  assert.equal(logoutCount, 1);
});

test('wrong or expired OTP stays on verification and displays the server error', async () => {
  renderAt('/auth/forgot-password');
  change('Email', 'customer@example.com');
  submit('Gửi mã OTP');
  await testing.screen.findByLabelText('Mã OTP');
  reply = { status: 400, message: 'Mã OTP không đúng hoặc đã hết hạn.' };
  change('Mã OTP', '123456');
  submit('Xác minh OTP');
  await testing.screen.findByText(reply.message);
  assert.equal(testing.screen.queryByLabelText('Mật khẩu mới'), null);
  assert.equal(logoutCount, 0);
});

test('changing the email returns to the first step and sends to the new address', async () => {
  renderAt('/auth/forgot-password');
  change('Email', 'first@example.com');
  submit('Gửi mã OTP');
  await testing.screen.findByLabelText('Mã OTP');
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Đổi email' }));
  change('Email', 'second@example.com');
  submit('Gửi mã OTP');
  await testing.screen.findByText('Nhập mã OTP được gửi đến second@example.com');
  assert.deepEqual(requests[1].body, { email: 'second@example.com' });
});

test('a verified session that already expired does not show password fields', () => {
  renderAt({ pathname: '/auth/reset-password', state: { resetToken: token, resetExpiresAt: Date.now() - 1 } });
  assert.ok(testing.screen.getByText('Vui lòng xác minh mã OTP trước'));
  assert.equal(testing.screen.queryByLabelText('Mật khẩu mới'), null);
});
