import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let vite, RoomStayPrice, RoomDailyPrices;
const room = { id: '9007199254740993', room_name: 'Phòng Deluxe', base_price: 700000 };
const dates = ['2027-02-10', '2027-02-12'];
const quote = {
  room_id: room.id, check_in_date: dates[0], check_out_date: dates[1],
  nightly_prices: [{ date: dates[0], price: 840000 }, { date: '2027-02-11', price: 700000 }],
  room_subtotal: 1540000, total_amount: 1540000,
};

before(async () => {
  vite = await createServer({
    configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
    plugins: [react()], appType: 'custom',
    cacheDir: 'node_modules/.cache/room-pricing-ui',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  RoomStayPrice = (await vite.ssrLoadModule('/src/pages/customer/RoomStayPrice.tsx')).default;
  RoomDailyPrices = (await vite.ssrLoadModule('/src/features/pricing/RoomDailyPrices.tsx')).default;
});
after(async () => { await vite?.close(); });

function renderPrice(overrides = {}) {
  return renderToStaticMarkup(createElement(RoomStayPrice, {
    room, dateRange: dates, quote, detailed: true, ...overrides,
  }));
}

test('displays the applied date price, base price for the other night, and their exact total', () => {
  const markup = renderPrice();
  assert.match(markup, /840\.000/);
  assert.match(markup, /700\.000/);
  assert.match(markup, /770\.000/);
  assert.match(markup, /trung bình/);
  assert.match(markup, /1\.540\.000/);
  assert.match(markup, /10\/02\/2027/);
  assert.match(markup, /11\/02\/2027/);
  assert.doesNotMatch(markup, /12\/02\/2027/);
});

test('never displays a quote for the previous room or dates', () => {
  for (const overrides of [
    { room: { ...room, id: '2' } },
    { dateRange: ['2027-02-11', '2027-02-13'] },
  ]) {
    const markup = renderPrice(overrides);
    assert.match(markup, /Chọn phòng để xem giá theo ngày/);
    assert.doesNotMatch(markup, /840\.000|700\.000|1\.540\.000/);
  }
});

test('shows quote loading or failure without falling back to a misleading base price', () => {
  assert.match(renderPrice({ quote: null, loading: true }), /Đang tải giá theo ngày/);
  const failed = renderPrice({ quote: null, error: 'Unavailable' });
  assert.match(failed, /Chưa lấy được giá theo ngày/);
  assert.doesNotMatch(failed, /700\.000/);
});

test('labels the base and external partner prices when there is no internal date quote', () => {
  assert.match(renderPrice({ dateRange: null }), /Giá cơ bản/);
  const partner = renderPrice({ partner: true });
  assert.match(partner, /Giá tham khảo/);
  assert.match(partner, /700\.000/);
  assert.doesNotMatch(partner, /840\.000|1\.540\.000/);
});

test('lists daily selling prices in date order, marks applied AI prices and explains missing dates', () => {
  const markup = renderToStaticMarkup(createElement(RoomDailyPrices, {
    room: { ...room, daily_prices: [
      { date: '2099-02-11', price: 700000, is_ai_applied: 0 },
      { date: '2099-02-10', price: 840000, is_ai_applied: 1 },
      { date: '2020-01-01', price: 600000, is_ai_applied: 0 },
    ] },
  }));
  assert.match(markup, /Giá theo ngày/);
  assert.match(markup, /840\.000/);
  assert.equal((markup.match(/Đã áp dụng giá AI/g) ?? []).length, 1);
  assert.ok(markup.indexOf('10/02/2099') < markup.indexOf('11/02/2099'));
  assert.doesNotMatch(markup, /01\/01\/2020/);
  assert.match(markup, /Ngày chưa có giá riêng áp dụng giá cơ bản/);
});

test('explains the base-price fallback for a room without daily price entries', () => {
  const markup = renderToStaticMarkup(createElement(RoomDailyPrices, { room }));
  assert.match(markup, /Chưa thiết lập giá riêng theo ngày/);
  assert.match(markup, /700\.000/);
});
