import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let vite;
let PricingSuggestionPanel;

const suggestion = {
  homestay_id: 42,
  room_id: '21',
  date: '2026-11-03',
  base_price: 700000,
  current_price: 700000,
  suggested_price: 840000,
  change_percentage: 20,
  comp_set_stats: { compset_size: 8, market_avg_price: 780000, occupancy_rate: 87.5 },
  ai_explanation: 'Nhu cầu cao. Gợi ý tăng 20% so với giá gốc.',
  demand_level: 'HIGH',
  demand_factors: { occupancy: 0.1875, calendar: 0.15, lead_time: 0 },
  data_status: 'SUFFICIENT_DATA',
  warnings: [],
  cache_status: 'CACHE_HIT',
};

function render(overrides = {}) {
  return renderToStaticMarkup(createElement(PricingSuggestionPanel, {
    suggestion,
    appliedPrice: 840000,
    onPriceChange: () => {}, onApply: () => {}, onDiscard: () => {},
    applying: false, disabled: false, locked: false, expired: false,
    ...overrides,
  }));
}

function priceInput(markup) {
  const input = markup.match(/<input\b[^>]*role="spinbutton"[^>]*>/)?.[0];
  assert.ok(input, 'the price editor must expose its numeric input');
  return input;
}

function applyButton(markup) {
  const buttons = [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  const button = buttons.find(([, , contents]) => contents.includes('Áp dụng giá'));
  assert.ok(button, 'the confirmation action must be present');
  return button[1];
}

before(async () => {
  vite = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    plugins: [react()],
    appType: 'custom',
    cacheDir: 'node_modules/.cache/pricing-ui-qa/ssr-cache',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: { ignored: ['**/*'] } },
  });
  PricingSuggestionPanel = (await vite.ssrLoadModule('/src/features/pricing/PricingSuggestionPanel.tsx')).default;
});

after(async () => {
  await vite?.close();
});

describe('PricingSuggestionPanel static output', () => {
  it('keeps the AI recommendation immutable when the host edits the applied price', () => {
    const markup = render({ appliedPrice: 810000 });
    const proposal = markup.match(/<div class="pricing-suggestion__proposed-price">([\s\S]*?)<\/div>/)?.[1];

    assert.match(proposal ?? '', /840\.000/);
    assert.doesNotMatch(proposal ?? '', /810\.000/);
    assert.match(priceInput(markup), /value="810\.000"/);
    assert.match(markup, /Đã chỉnh sửa/);
    assert.doesNotMatch(applyButton(markup), /\bdisabled\b/);
  });

  it('preserves the current selling price and hides unknown market metrics when data is insufficient', () => {
    const markup = render({
      suggestion: {
        ...suggestion, room_id: '22', base_price: 500000, current_price: 600000,
        suggested_price: 500000, change_percentage: 0,
        comp_set_stats: { compset_size: 0, market_avg_price: 500000, occupancy_rate: 0 },
        data_status: 'INSUFFICIENT_DATA', demand_level: 'UNKNOWN',
      },
      appliedPrice: 500000,
    });
    const stats = markup.match(/<dl class="pricing-suggestion__stats"[\s\S]*?<\/dl>/)?.[0];

    assert.match(markup, /Giá đang bán<\/dt><dd>600\.000/);
    assert.match(markup, /Giá đang bán được giữ nguyên/);
    assert.match(markup, /Chờ thêm dữ liệu/);
    assert.equal((stats?.match(/Chưa có dữ liệu/g) ?? []).length, 2);
    assert.doesNotMatch(stats ?? '', /0%/);
    assert.match(priceInput(markup), /\bdisabled\b/);
    assert.match(applyButton(markup), /\bdisabled\b/);
  });

  it('keeps invalid prices editable while preventing confirmation', () => {
    const markup = render({ appliedPrice: 1000000 });

    assert.doesNotMatch(priceInput(markup), /\bdisabled\b/);
    assert.match(priceInput(markup), /aria-invalid="true"/);
    assert.match(applyButton(markup), /\bdisabled\b/);
    assert.match(markup, /Nhập mức giá trong khoảng cho phép/);
  });

  it('disables the editor and confirmation during an active payment hold', () => {
    const markup = render({ locked: true });

    assert.match(markup, /Ngày này đang có khách giữ chỗ/);
    assert.match(priceInput(markup), /\bdisabled\b/);
    assert.match(applyButton(markup), /\bdisabled\b/);
  });

  it('requires a fresh suggestion after expiry', () => {
    const markup = render({ expired: true });

    assert.match(markup, /Gợi ý này đã hết hiệu lực/);
    assert.match(priceInput(markup), /\bdisabled\b/);
    assert.match(applyButton(markup), /\bdisabled\b/);
  });
});
