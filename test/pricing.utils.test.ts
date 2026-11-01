import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDemandFactor, formatVnd, isPriceWithinBounds, priceBounds,
  suggestionMatchesSelection, todayInVietnam,
} from '../src/features/pricing/pricing.utils.ts';
import type { PricingSuggestion } from '../src/types/host.ts';

describe('pricing boundaries', () => {
  it('accepts exact decimal ±30% boundaries using integer cents', () => {
    assert.deepEqual(priceBounds(1998.1), { min: 1398.67, max: 2597.53 });
    assert.equal(isPriceWithinBounds(1398.67, 1998.1), true);
    assert.equal(isPriceWithinBounds(2597.53, 1998.1), true);
    assert.equal(isPriceWithinBounds(1398.66, 1998.1), false);
    assert.equal(isPriceWithinBounds(2597.54, 1998.1), false);
  });

  it('rounds fractional cent limits inward and supports decimal strings from MySQL', () => {
    assert.deepEqual(priceBounds('100.01'), { min: 70.01, max: 130.01 });
    assert.equal(isPriceWithinBounds(70, '100.01'), false);
    assert.equal(isPriceWithinBounds(130.01, '100.01'), true);
    assert.deepEqual(priceBounds(0.01), { min: 0.01, max: 0.01 });
  });

  it('rejects missing, malformed, nonfinite or excessively precise amounts', () => {
    for (const invalid of [null, undefined, '', 'bad', [], {}, NaN, Infinity, 0, -1, 100.001]) {
      assert.equal(priceBounds(invalid), null);
      assert.equal(isPriceWithinBounds(invalid, 100), false);
    }
    assert.equal(isPriceWithinBounds('100.00', 100), false);
    assert.equal(isPriceWithinBounds(100, undefined), false);
  });
});

describe('Vietnam pricing dates', () => {
  it('crosses midnight at 17:00 UTC rather than browser midnight', () => {
    assert.equal(todayInVietnam(new Date('2026-11-01T16:59:59Z')), '2026-11-01');
    assert.equal(todayInVietnam(new Date('2026-11-01T17:00:00Z')), '2026-11-02');
    assert.equal(todayInVietnam(new Date('invalid')), '');
  });
});

describe('suggestion identity', () => {
  const suggestion = {
    homestay_id: 42, room_id: '21', date: '2026-11-07',
  } as PricingSuggestion;
  const selection = { homestayId: '42', roomId: '21', date: '2026-11-07' };

  it('matches only the same homestay, room and valid calendar date', () => {
    assert.equal(suggestionMatchesSelection(suggestion, selection), true);
    assert.equal(suggestionMatchesSelection(suggestion, { ...selection, homestayId: '43' }), false);
    assert.equal(suggestionMatchesSelection(suggestion, { ...selection, roomId: '22' }), false);
    assert.equal(suggestionMatchesSelection(suggestion, { ...selection, date: '2026-11-08' }), false);
    assert.equal(suggestionMatchesSelection({ ...suggestion, date: '2026-02-30' }, { ...selection, date: '2026-02-30' }), false);
  });

  it('rejects absent selections, empty identities and unsafe numeric IDs', () => {
    assert.equal(suggestionMatchesSelection(null, selection), false);
    assert.equal(suggestionMatchesSelection(undefined, selection), false);
    assert.equal(suggestionMatchesSelection(suggestion, { ...selection, roomId: null }), false);
    assert.equal(suggestionMatchesSelection(suggestion, { ...selection, homestayId: '' }), false);
    assert.equal(suggestionMatchesSelection({ ...suggestion, homestay_id: Number.MAX_SAFE_INTEGER + 1 }, selection), false);
  });
});

describe('pricing display values', () => {
  it('formats real amounts and shows unavailable values without substituting zero', () => {
    assert.match(formatVnd(700000), /700\.000/);
    assert.equal(formatVnd('700000.00'), formatVnd(700000));
    assert.match(formatVnd(0), /^0/);
    for (const invalid of [null, undefined, '', 'bad', NaN, Infinity, false, -1]) {
      assert.equal(formatVnd(invalid), '—');
    }
  });

  it('formats demand factors as signed percentages without inventing missing factors', () => {
    assert.equal(formatDemandFactor(0.15), '+15%');
    assert.equal(formatDemandFactor(-0.1), '-10%');
    assert.equal(formatDemandFactor(0), '0%');
    assert.equal(formatDemandFactor(undefined), '—');
    assert.equal(formatDemandFactor('0.15'), '—');
  });
});
