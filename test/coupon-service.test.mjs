import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

let vite, couponService, responses, requests;
const nativeFetch = globalThis.fetch;
const nativeLocalStorage = globalThis.localStorage;
const nativeSessionStorage = globalThis.sessionStorage;
const coupon = { id: "1", code: "SAVE10", name: "Promotion" };
const envelope = (data, statusCode = 200) => ({
  statusCode,
  message: "Thành công",
  data,
});
const wire = (data, nested, statusCode = 200) =>
  envelope(nested ? envelope(data, statusCode) : data, statusCode);

before(async () => {
  globalThis.localStorage = { getItem: () => null };
  globalThis.sessionStorage = { getItem: () => null };
  globalThis.fetch = async (url, options) => {
    requests.push({
      url: String(url),
      method: options?.method ?? "GET",
      body: options?.body,
    });
    assert.ok(responses.length, `Unexpected API request: ${url}`);
    return new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    cacheDir: "node_modules/.cache/coupon-service-test",
    server: {
      middlewareMode: true,
      ws: false,
      hmr: false,
      watch: { ignored: ["**/*"] },
    },
  });
  ({ couponService } = await vite.ssrLoadModule(
    "/src/services/couponService.ts",
  ));
});

beforeEach(() => {
  requests = [];
  responses = [];
});
after(async () => {
  await vite?.close();
  globalThis.fetch = nativeFetch;
  if (nativeLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = nativeLocalStorage;
  if (nativeSessionStorage === undefined) delete globalThis.sessionStorage;
  else globalThis.sessionStorage = nativeSessionStorage;
});

for (const nested of [false, true]) {
  const shape = nested
    ? "controller + interceptor envelopes"
    : "single envelope";

  test(`host list reads ${shape}`, async () => {
    responses.push(wire([coupon], nested));
    assert.deepEqual(await couponService.list("host"), [coupon]);
    assert.ok(requests[0].url.endsWith("/host/coupons"));
  });

  test(`empty host list reads ${shape}`, async () => {
    responses.push(wire([], nested));
    assert.deepEqual(await couponService.list("host"), []);
  });

  test(`admin pagination reads ${shape}`, async () => {
    const second = { ...coupon, id: "2", code: "SAVE20" };
    responses.push(
      wire({ items: [coupon], total: 2 }, nested),
      wire({ items: [second], total: 2 }, nested),
    );
    assert.deepEqual(await couponService.list("admin"), [coupon, second]);
    assert.equal(requests.length, 2);
    assert.equal(
      new URL(requests[0].url, "http://localhost").searchParams.get("page"),
      "1",
    );
    assert.equal(
      new URL(requests[1].url, "http://localhost").searchParams.get("page"),
      "2",
    );
  });

  test(`create and update return the coupon from ${shape}`, async () => {
    responses.push(wire(coupon, nested, 201), wire(coupon, nested));
    assert.deepEqual(
      await couponService.create("host", { code: "SAVE10" }),
      coupon,
    );
    assert.deepEqual(
      await couponService.update("admin", "1", { is_active: 0 }),
      coupon,
    );
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[1].method, "PATCH");
  });

  test(`delete keeps the deactivation message from ${shape}`, async () => {
    const result = {
      message: "Mã đã có lượt dùng nên được tắt thay vì xóa",
      deactivated: true,
    };
    responses.push(wire(result, nested));
    assert.deepEqual(await couponService.remove("1"), result);
    assert.equal(requests[0].method, "DELETE");
  });
}

test("rejects malformed host data instead of returning a non-array to the page", async () => {
  for (const data of [null, {}, { items: [] }]) {
    responses.push(wire(data, true));
    await assert.rejects(couponService.list("host"), /Dữ liệu mã giảm giá/);
  }
});

test("rejects malformed admin pages instead of crashing during pagination", async () => {
  for (const data of [
    null,
    { items: {}, total: 1 },
    { items: [], total: "1" },
  ]) {
    responses.push(wire(data, true));
    await assert.rejects(couponService.list("admin"), /Dữ liệu mã giảm giá/);
  }
});
