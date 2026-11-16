import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let vite, customerService, loadAllHomestays;
before(async () => {
  vite = await createServer({
    configFile: false, root: process.cwd(), appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } },
  });
  ({ customerService } = await vite.ssrLoadModule('/src/services/customerService.ts'));
  ({ loadAllHomestays } = await vite.ssrLoadModule('/src/services/homestayCache.ts'));
});
after(async () => { await vite?.close(); });

test('search loads every catalog page, coalesces calls and retries failed loads without caching partial data', async (t) => {
  const items = Array.from({ length: 601 }, (_, index) => ({ id: String(index), name: `Nhà ${index}` }));
  const calls = [];
  let now = Date.now(), active = 0, maxActive = 0, failure = true;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(customerService, 'getHomestays', async (city, limit, offset, filters) => {
    assert.equal(city, undefined);
    assert.equal(limit, 100);
    assert.deepEqual(filters, { view: 'search' });
    calls.push(offset);
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 0));
    active--;
    if (failure && offset === 200) throw new Error('Không tải được trang');
    return { items: items.slice(offset, offset + limit), total: items.length };
  });
  await assert.rejects(loadAllHomestays(), /Không tải được trang/);
  failure = false;
  const first = loadAllHomestays();
  assert.equal(first, loadAllHomestays());
  assert.deepEqual(await first, items);
  assert.ok(calls.filter((offset) => offset === 0).length === 2, 'failed partial load must be fetched again');
  assert.ok(calls.includes(600), 'last page must not be skipped');
  assert.ok(maxActive <= 4, 'catalog page requests must stay bounded');
  const requestCount = calls.length;
  assert.deepEqual(await loadAllHomestays(), items);
  assert.equal(calls.length, requestCount, 'reuse the successful complete catalog');
  now += 60_001;
  assert.deepEqual(await loadAllHomestays(), items);
  assert.equal(calls.length, requestCount + 7);
});
