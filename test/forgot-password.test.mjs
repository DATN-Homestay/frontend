import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, ForgotPasswordPage, ConfigProvider, AntApp, MemoryRouter, Routes, Route, useLocation;
const nativeFetch = globalThis.fetch;
const requests = [];
/** Lần gọi reset-password tiếp theo trả lỗi gì (null = thành công) */
let resetError = null;

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
    cacheDir: 'node_modules/.cache/forgot-password-test',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  ForgotPasswordPage = (await vite.ssrLoadModule('/src/pages/auth/ForgotPassword.tsx')).default;
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom'));
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ url: String(url), body });
    const json = (status, payload) =>
      new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
    if (/\/auth\/forgot-password$/.test(String(url))) {
      return json(200, { statusCode: 200, data: { message: 'Nếu email đã đăng ký tài khoản, mã khôi phục đã được gửi.' } });
    }
    if (/\/auth\/reset-password$/.test(String(url))) {
      if (resetError) {
        const msg = resetError;
        resetError = null;
        return json(400, { statusCode: 400, message: msg, error: 'Bad Request' });
      }
      return json(200, { statusCode: 200, data: { message: 'ok', revoked_sessions: 1 } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
});

after(async () => {
  testing?.cleanup();
  await vite?.close();
  dom?.window.close();
  globalThis.fetch = nativeFetch;
});

function LoginStub() {
  const loc = useLocation();
  return createElement('div', null, `TRANG ĐĂNG NHẬP email=${loc.state?.email ?? ''}`);
}

test('quên mật khẩu: gửi mã → nhập mã + mật khẩu mới → về đăng nhập với email điền sẵn', async () => {
  testing.render(
    createElement(ConfigProvider, { theme: { token: { motion: false } } },
      createElement(AntApp, null,
        createElement(MemoryRouter, { initialEntries: [{ pathname: '/auth/forgot-password', state: { email: 'Duc@Gmail.com ' } }] },
          createElement(Routes, null,
            createElement(Route, { path: '/auth/forgot-password', element: createElement(ForgotPasswordPage) }),
            createElement(Route, { path: '/auth/login', element: createElement(LoginStub) }),
          ),
        ),
      ),
    ),
  );
  const { screen, fireEvent, waitFor } = testing;
  const resets = () => requests.filter((r) => r.url.endsWith('/auth/reset-password'));

  // Bước 1: email điền sẵn từ trang đăng nhập, được chuẩn hóa trước khi gửi
  const emailInput = screen.getByPlaceholderText('Email');
  assert.equal(emailInput.value, 'Duc@Gmail.com ');
  fireEvent.change(emailInput, { target: { value: 'Duc@Gmail.com' } });
  fireEvent.click(screen.getByRole('button', { name: /Gửi Mã Khôi Phục/ }));
  await screen.findByText('Nhập mã 6 chữ số đã gửi tới duc@gmail.com');
  assert.deepEqual(requests[0].body, { email: 'duc@gmail.com' });
  assert.ok(screen.getByText(/mã khôi phục đã được gửi/));
  // Nút gửi lại bị khóa trong lúc đếm ngược
  assert.equal(screen.getByRole('button', { name: /Gửi lại mã sau \d+s/ }).disabled, true);

  // Bước 2: mật khẩu nhập lại không khớp → chặn, không gọi API
  fireEvent.change(screen.getByPlaceholderText('6 chữ số'), { target: { value: '123456' } });
  fireEvent.change(screen.getByPlaceholderText('Mật khẩu mới'), { target: { value: 'NewPass456' } });
  fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), { target: { value: 'NewPass457' } });
  fireEvent.click(screen.getByRole('button', { name: /Đặt Lại Mật Khẩu/ }));
  await screen.findByText('Mật khẩu nhập lại không khớp');
  assert.equal(resets().length, 0);

  // Mã sai: hiện lỗi của server, vẫn ở trang
  fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), { target: { value: 'NewPass456' } });
  resetError = 'Mã khôi phục không đúng hoặc đã hết hạn. Bạn còn 4 lần thử';
  fireEvent.click(screen.getByRole('button', { name: /Đặt Lại Mật Khẩu/ }));
  await screen.findByText(/Bạn còn 4 lần thử/);
  assert.equal(resets().length, 1);

  // Mã đúng → gửi đúng dữ liệu, chuyển về đăng nhập kèm email
  fireEvent.click(screen.getByRole('button', { name: /Đặt Lại Mật Khẩu/ }));
  await screen.findByText('TRANG ĐĂNG NHẬP email=duc@gmail.com');
  await waitFor(() => assert.equal(resets().length, 2));
  assert.deepEqual(resets()[1].body, { email: 'duc@gmail.com', otp_code: '123456', new_password: 'NewPass456' });
});
