import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { createElement } from 'react';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let dom, vite, testing, PriceCalendar, hostService, originalService;
let ConfigProvider, AntApp, MemoryRouter, targetDate, dateLabel;
let calendar, applies, manualUpdates, suggestionRequests;

before(async () => {
  dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of [
    'window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'ShadowRoot',
    'MutationObserver', 'localStorage', 'sessionStorage', 'Event', 'MouseEvent', 'KeyboardEvent',
  ]) globalThis[key] = dom.window[key];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.getComputedStyle = (element) => dom.window.getComputedStyle(element);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = (media) => ({
    matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  testing = await import('@testing-library/react');
  testing.configure({ asyncUtilTimeout: 5000, getElementError: (message) => new Error(message) });
  ({ ConfigProvider, App: AntApp } = await import('antd'));
  ({ MemoryRouter } = await import('react-router-dom'));
  vite = await createServer({
    configFile: false, root: process.cwd(), plugins: [react()], appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: 'node_modules/.cache/host-pricing-test',
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  PriceCalendar = (await vite.ssrLoadModule('/src/pages/host/PriceCalendar.tsx')).default;
  ({ hostService } = await vite.ssrLoadModule('/src/services/hostService.ts'));
  originalService = { ...hostService };
  const { todayInVietnam } = await vite.ssrLoadModule('/src/features/pricing/pricing.utils.ts');
  const date = new Date(`${todayInVietnam()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 2);
  targetDate = date.toISOString().slice(0, 10);
  dateLabel = targetDate.split('-').reverse().join('/');
});

beforeEach(() => {
  calendar = [{ id: '81', room_id: '21', date: targetDate, price: 700000, is_available: 0, is_ai_applied: 0 }];
  applies = []; manualUpdates = []; suggestionRequests = [];
  hostService.getMyListings = async () => [{
    id: '42', name: 'Homestay QA', host_id: '15',
    rooms: [{ id: '21', room_name: 'Deluxe QA', base_price: 700000, capacity: 2 }],
  }];
  hostService.getCalendar = async (_roomId, from, to) => calendar
    .filter((day) => day.date >= from && day.date <= to).map((day) => ({ ...day }));
  hostService.getPricingSuggestions = async (homestayId, date, roomId) => {
    suggestionRequests.push({ homestayId, date, roomId });
    return { data: {
      homestay_id: Number(homestayId), room_id: roomId, date,
      base_price: 700000, current_price: 700000, suggested_price: 840000, change_percentage: 20,
      comp_set_stats: { compset_size: 5, market_avg_price: 800000, occupancy_rate: 80 },
      ai_explanation: 'Giá đề xuất cho đúng phòng và ngày.', data_status: 'SUFFICIENT_DATA',
      demand_level: 'HIGH', cache_status: 'CACHE_HIT', warnings: [],
    } };
  };
  hostService.applyPricing = async (body) => {
    applies.push(body);
    calendar = calendar.map((day) => day.room_id === body.room_id && day.date === body.date
      ? { ...day, price: body.applied_price, is_ai_applied: 1 } : day);
    return { data: { ...body, new_price: body.applied_price, is_ai_applied: 1 } };
  };
  hostService.updateCalendar = async (...args) => { manualUpdates.push(args); };
});

afterEach(() => { testing.cleanup(); Object.assign(hostService, originalService); });
after(async () => { await vite?.close(); dom?.window.close(); });

async function renderPage() {
  testing.render(createElement(ConfigProvider, { theme: { token: { motion: false } } },
    createElement(AntApp, null, createElement(MemoryRouter, {
      initialEntries: ['/host/pricing?homestay_id=42&room_id=21'],
    }, createElement(PriceCalendar))),
  ));
  return testing.screen.findByRole('button', { name: new RegExp(`^${dateLabel},`) });
}

async function confirmAndCheck() {
  await testing.screen.findByRole('dialog', { name: 'Xác nhận áp dụng giá' });
  assert.equal(applies.length, 0, 'price changes only after explicit confirmation');
  testing.fireEvent.click(testing.screen.getByRole('button', { name: 'Xác nhận áp dụng', exact: true }));
  await testing.waitFor(() => assert.equal(applies.length, 1));
  assert.deepEqual(applies[0], { homestay_id: '42', room_id: '21', date: targetDate, applied_price: 840000 });
  assert.equal(manualUpdates.length, 0, 'AI apply must use the pricing endpoint rather than manual calendar editing');
  await testing.waitFor(() => assert.equal(testing.screen.queryByRole('dialog'), null));
  await testing.waitFor(() => {
    const updatedDay = testing.screen.getByRole('button', { name: new RegExp(`^${dateLabel},`) });
    assert.match(updatedDay.textContent, /840\.000/);
    assert.match(updatedDay.textContent, /Không mở bán/);
  });
  assert.equal(calendar[0].is_ai_applied, 1);
  assert.equal(calendar[0].is_available, 0);
}

test('applies a daily AI price from the suggestion panel and refreshes the selected calendar day', async () => {
  await renderPage();
  testing.fireEvent.click(testing.screen.getByRole('button', { name: /Nhận gợi ý giá/ }));
  const apply = await testing.screen.findByRole('button', { name: /Áp dụng giá$/ });
  testing.fireEvent.click(apply);
  await confirmAndCheck();
});

test('applies AI from the day dialog through the same confirmed pricing endpoint', async () => {
  const day = await renderPage();
  testing.fireEvent.click(day);
  await testing.screen.findByRole('dialog', { name: `Thiết lập giá ngày ${dateLabel}` });
  const apply = await testing.screen.findByRole('button', { name: /Áp dụng giá AI/ });
  assert.deepEqual(suggestionRequests, [{ homestayId: '42', roomId: '21', date: targetDate }]);
  testing.fireEvent.click(apply);
  await confirmAndCheck();
});
