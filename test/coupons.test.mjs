import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createElement } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

let dom, vite, testing, CouponManager, Checkout, couponService, customerService;
let ConfigProvider,
  AntApp,
  MemoryRouter,
  originalCoupons,
  originalCustomer,
  utils;
let coupons, changes, creates, bookings;
const nativeFetch = globalThis.fetch;
const fixture = (overrides = {}) => ({
  id: "1",
  code: "SAVE10",
  name: "Ưu đãi mùa hè",
  created_by_role: "HOST",
  host_id: "10",
  sponsor_by: "HOST",
  discount_type: "PERCENTAGE",
  discount_value: "10.00",
  min_order_value: "100000.00",
  max_discount: "50000.00",
  usage_limit: 10,
  used_count: 0,
  per_user_limit: 1,
  is_active: 1,
  target_audience: "ALL",
  loyalty_condition_type: "OR",
  min_completed_bookings: null,
  min_total_spent: null,
  start_date: "2020-01-01T00:00:00+07:00",
  end_date: "2099-12-31T23:59:59+07:00",
  created_at: "2026-11-16",
  ...overrides,
});

before(async () => {
  dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
  });
  for (const key of [
    "window",
    "document",
    "Document",
    "HTMLElement",
    "Element",
    "Node",
    "SVGElement",
    "ShadowRoot",
    "MutationObserver",
    "localStorage",
    "sessionStorage",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
  ])
    globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  globalThis.getComputedStyle = (element) =>
    dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
    dom.window,
  );
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
    dom.window,
  );
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
  testing = await import("@testing-library/react");
  testing.configure({
    asyncUtilTimeout: 7000,
    getElementError: (message) => new Error(message),
  });
  ({ ConfigProvider, App: AntApp } = await import("antd"));
  ({ MemoryRouter } = await import("react-router-dom"));
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    cacheDir: "node_modules/.cache/coupons-test",
    server: {
      middlewareMode: true,
      ws: false,
      hmr: false,
      watch: { ignored: ["**/*"] },
    },
  });
  CouponManager = (
    await vite.ssrLoadModule("/src/features/coupons/CouponManager.tsx")
  ).default;
  Checkout = (await vite.ssrLoadModule("/src/pages/customer/Checkout.tsx"))
    .default;
  ({ couponService } = await vite.ssrLoadModule(
    "/src/services/couponService.ts",
  ));
  ({ customerService } = await vite.ssrLoadModule(
    "/src/services/customerService.ts",
  ));
  utils = await vite.ssrLoadModule("/src/features/coupons/coupon.utils.ts");
  originalCoupons = { ...couponService };
  originalCustomer = { ...customerService };
});

beforeEach(() => {
  coupons = [fixture()];
  changes = [];
  creates = [];
  bookings = [];
  couponService.list = async () => coupons.map((c) => ({ ...c }));
  couponService.update = async (role, id, payload) => {
    changes.push({ role, id, payload });
    return { ...coupons[0], ...payload };
  };
  couponService.create = async (role, payload) => {
    creates.push({ role, payload });
    return fixture(payload);
  };
  customerService.getHomestayCoupons = async () => [];
  customerService.quoteBooking = async () => ({
    homestay: { id: "42", name: "Homestay kiểm thử" },
    room_name: "Deluxe",
    available: true,
    room_subtotal: 500000,
    total_amount: 500000,
    num_guests: 2,
    check_in_date: "2026-12-01",
    check_out_date: "2026-12-02",
    nights: 1,
    nightly_prices: [{ date: "2026-12-01", price: 500000 }],
    no_price_dates: [],
    held_dates: [],
  });
  customerService.createBooking = async (payload) => {
    bookings.push(payload);
    throw new Error("Payment test");
  };
});

afterEach(() => {
  testing.cleanup();
  globalThis.fetch = nativeFetch;
  Object.assign(couponService, originalCoupons);
  Object.assign(customerService, originalCustomer);
});

test("renders host coupons through the real API adapter with the controller and interceptor envelopes", async () => {
  couponService.list = originalCoupons.list;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        statusCode: 200,
        message: "Thành công",
        data: { statusCode: 200, data: [fixture()] },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  render(CouponManager, { role: "host" });
  await testing.screen.findByText("SAVE10");
  assert.equal(
    testing.screen.queryByText("Không thể tải danh sách mã giảm giá"),
    null,
  );
});

test("renders admin coupons through the real API adapter with the controller and interceptor envelopes", async () => {
  couponService.list = originalCoupons.list;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        statusCode: 200,
        message: "Thành công",
        data: {
          statusCode: 200,
          data: { items: [fixture()], total: 1, page: 1, limit: 100 },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  render(CouponManager, { role: "admin" });
  await testing.screen.findByText("SAVE10");
  assert.equal(
    testing.screen.queryByText("Không thể tải danh sách mã giảm giá"),
    null,
  );
});

test("shows a recoverable error if a list adapter unexpectedly returns an object", async () => {
  couponService.list = async () => ({ statusCode: 200, data: [] });
  render(CouponManager, { role: "host" });
  await testing.screen.findByText(
    "Dữ liệu mã giảm giá từ máy chủ không hợp lệ. Vui lòng thử lại.",
  );
  assert.ok(testing.screen.getByRole("button", { name: "Thử lại" }));
});
after(async () => {
  await vite?.close();
  dom?.window.close();
});

function render(component, props = {}, path = "/host/coupons") {
  return testing.render(
    createElement(
      ConfigProvider,
      { theme: { token: { motion: false } } },
      createElement(
        AntApp,
        null,
        createElement(
          MemoryRouter,
          { initialEntries: [path] },
          createElement(component, props),
        ),
      ),
    ),
  );
}

test("shows real loading errors and never substitutes demo coupons", async () => {
  couponService.list = async () => {
    throw new Error("API unavailable");
  };
  render(CouponManager, { role: "host" });
  await testing.screen.findByText("API unavailable");
  assert.equal(testing.screen.queryByText("WELCOME10"), null);
  assert.equal(testing.screen.queryByText("SAVE10"), null);
  couponService.list = async () => [fixture()];
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: "Thử lại" }),
  );
  await testing.screen.findByText("SAVE10");
});

test("creates a percentage coupon with a discount cap and per-customer limit", async () => {
  render(CouponManager, { role: "host" });
  await testing.screen.findByText("SAVE10");
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: /Tạo mã giảm giá$/ }),
  );
  const dialog = await testing.screen.findByRole("dialog", {
    name: "Tạo mã giảm giá",
  });
  const scope = testing.within(dialog);
  testing.fireEvent.change(scope.getByLabelText("Mã giảm giá"), {
    target: { value: " summer10 " },
  });
  testing.fireEvent.change(scope.getByLabelText("Giảm tối đa (VNĐ)"), {
    target: { value: "75000" },
  });
  testing.fireEvent.click(
    scope.getByRole("button", { name: "Tạo mã", exact: true }),
  );
  await testing.waitFor(() => assert.equal(creates.length, 1));
  assert.equal(creates[0].role, "host");
  assert.equal(creates[0].payload.code, "SUMMER10");
  assert.equal(creates[0].payload.max_discount, 75000);
  assert.equal(creates[0].payload.per_user_limit, 1);
  assert.equal(creates[0].payload.discount_type, "PERCENTAGE");
});

test("editing a used code only submits mutable fields", async () => {
  coupons = [fixture({ used_count: 2 })];
  render(CouponManager, { role: "host" });
  await testing.screen.findByText("SAVE10");
  testing.fireEvent.click(testing.screen.getByRole("button", { name: /Sửa$/ }));
  const dialog = await testing.screen.findByRole("dialog", {
    name: "Sửa mã SAVE10",
  });
  const scope = testing.within(dialog);
  assert.equal(scope.getByLabelText("Phần trăm giảm (%)").disabled, true);
  testing.fireEvent.change(scope.getByLabelText("Tên chương trình"), {
    target: { value: "Ưu đãi mới" },
  });
  testing.fireEvent.click(scope.getByRole("button", { name: "Lưu thay đổi" }));
  await testing.waitFor(() => assert.equal(changes.length, 1));
  assert.deepEqual(Object.keys(changes[0].payload).sort(), [
    "end_date",
    "name",
    "per_user_limit",
    "usage_limit",
  ]);
  assert.equal(changes[0].payload.name, "Ưu đãi mới");
});

test("admin can deactivate a host coupon while editing remains restricted to platform coupons", async () => {
  let deactivated;
  couponService.deactivate = async (id) => {
    deactivated = id;
  };
  render(CouponManager, { role: "admin" });
  await testing.screen.findByText("SAVE10");
  assert.equal(testing.screen.queryByRole("button", { name: /Sửa$/ }), null);
  assert.equal(testing.screen.queryByRole("button", { name: /Xóa$/ }), null);
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: "Tắt mã" }),
  );
  testing.fireEvent.click(
    await testing.screen.findByRole("button", { name: "Xác nhận" }),
  );
  await testing.waitFor(() => assert.equal(deactivated, "1"));
  assert.equal(changes.length, 0);
});

test("blocks checkout while a coupon is being validated and submits the server-validated code", async () => {
  let resolveValidation;
  customerService.validateCoupon = () =>
    new Promise((resolve) => {
      resolveValidation = resolve;
    });
  render(
    Checkout,
    {},
    "/checkout?roomId=1&checkIn=2026-12-01&checkOut=2026-12-02&guests=2",
  );
  await testing.screen.findByText("Homestay kiểm thử");
  testing.fireEvent.change(
    testing.screen.getByPlaceholderText("Nhập mã giảm giá"),
    { target: { value: "SAVE10" } },
  );
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: "Áp dụng", exact: true }),
  );
  assert.equal(
    testing.screen.getByRole("button", { name: /Thanh toán VNPay$/ }).disabled,
    true,
  );
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: /Thanh toán VNPay$/ }),
  );
  assert.equal(bookings.length, 0);
  await testing.act(async () =>
    resolveValidation({
      valid: true,
      code: "SAVE10",
      name: "Ưu đãi",
      discount_amount: 50000,
      total_amount: 450000,
      subtotal: 500000,
    }),
  );
  await testing.screen.findByTestId("discount-line");
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: /Thanh toán VNPay$/ }),
  );
  await testing.waitFor(() => assert.equal(bookings.length, 1));
  assert.equal(bookings[0].coupon_code, "SAVE10");
});

test("uses the latest server price returned by coupon validation", async () => {
  customerService.validateCoupon = async () => ({
    valid: true,
    code: "SAVE10",
    name: "Ưu đãi",
    discount_amount: 60000,
    total_amount: 540000,
    subtotal: 600000,
  });
  render(
    Checkout,
    {},
    "/checkout?roomId=1&checkIn=2026-12-01&checkOut=2026-12-02",
  );
  await testing.screen.findByText("Homestay kiểm thử");
  testing.fireEvent.change(
    testing.screen.getByPlaceholderText("Nhập mã giảm giá"),
    { target: { value: "SAVE10" } },
  );
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: "Áp dụng", exact: true }),
  );
  await testing.screen.findByTestId("discount-line");
  assert.ok(testing.screen.getByText("540.000đ"));
  assert.ok(testing.screen.getByText("600.000đ"));
});

test("does not reapply a URL coupon after the customer removes it", async () => {
  let validations = 0;
  customerService.validateCoupon = async () => {
    validations += 1;
    return {
      valid: true,
      code: "SAVE10",
      name: "Ưu đãi",
      discount_amount: 50000,
      total_amount: 450000,
      subtotal: 500000,
    };
  };
  render(
    Checkout,
    {},
    "/checkout?roomId=1&checkIn=2026-12-01&checkOut=2026-12-02&coupon=SAVE10",
  );
  await testing.screen.findByTestId("discount-line");
  testing.fireEvent.click(
    testing.screen.getByRole("button", { name: "Bỏ mã" }),
  );
  await testing.waitFor(() =>
    assert.equal(testing.screen.queryByTestId("discount-line"), null),
  );
  assert.equal(validations, 1);
});

test("estimated savings and coupon statuses respect the server payment floor and date boundaries", () => {
  assert.equal(
    utils.estimateDiscount(
      {
        discount_type: "FIXED_AMOUNT",
        discount_value: 1000000,
        max_discount: null,
      },
      500000,
    ),
    490000,
  );
  assert.equal(
    utils.estimateDiscount(
      { discount_type: "PERCENTAGE", discount_value: 10, max_discount: 25000 },
      500000,
    ),
    25000,
  );
  assert.equal(
    utils.estimateDiscount(
      { discount_type: "PERCENTAGE", discount_value: 100, max_discount: null },
      5000,
    ),
    0,
  );
  assert.equal(
    utils.couponStatus(
      fixture({ start_date: "2090-01-01" }),
      Date.parse("2026-11-16"),
    ),
    "scheduled",
  );
  assert.equal(
    utils.couponStatus(
      fixture({ end_date: "2026-01-01" }),
      Date.parse("2026-11-16"),
    ),
    "expired",
  );
  assert.equal(
    utils.couponStatus(fixture({ usage_limit: 1, used_count: 1 })),
    "exhausted",
  );
});
