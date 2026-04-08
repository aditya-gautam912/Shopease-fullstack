import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  debounce,
  fakeDiscount,
  fmtPrice,
  getInitials,
  ratingStars,
  statusClass,
  truncate,
} from '../src/utils/helpers.js';

test('fmtPrice formats INR values', () => {
  assert.equal(fmtPrice(1299), '₹1,299');
});

test('getInitials extracts up to two initials', () => {
  assert.equal(getInitials('Shop Ease'), 'SE');
});

test('ratingStars rounds to the nearest whole star', () => {
  assert.equal(ratingStars(3.6), '★★★★☆');
});

test('truncate shortens long strings', () => {
  assert.equal(truncate('abcdefghijkl', 5), 'abcde…');
});

test('fakeDiscount is deterministic for the same input', () => {
  assert.equal(fakeDiscount('product-123', 10), fakeDiscount('product-123', 10));
});

test('statusClass maps known statuses and falls back safely', () => {
  assert.equal(statusClass('shipped'), 'status-shipped');
  assert.equal(statusClass('unknown'), 'status-pending');
});

test('clamp constrains values inside bounds', () => {
  assert.equal(clamp(15, 1, 10), 10);
  assert.equal(clamp(-1, 1, 10), 1);
});

test('debounce only invokes the wrapped function once', async () => {
  let calls = 0;
  const debounced = debounce(() => {
    calls += 1;
  }, 20);

  debounced();
  debounced();
  debounced();

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(calls, 1);
});
