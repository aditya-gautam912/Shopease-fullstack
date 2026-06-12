const test = require('node:test');
const assert = require('node:assert/strict');

const { COUPONS, validateCoupon } = require('../src/utils/coupons');

test('validateCoupon accepts known coupon codes case-insensitively', () => {
  const result = validateCoupon('save10', 2000);

  assert.equal(result.valid, true);
  assert.equal(result.code, 'SAVE10');
  assert.equal(result.amount, 200);
  assert.equal(result.label, COUPONS.SAVE10.label);
});

test('validateCoupon accepts "SAVE20" in uppercase', () => {
  const result = validateCoupon('SAVE20', 1000);

  assert.equal(result.valid, true);
  assert.equal(result.code, 'SAVE20');
  assert.equal(result.discount, 0.20);
  assert.equal(result.amount, 200);
});

test('validateCoupon accepts "shopease" in lowercase', () => {
  const result = validateCoupon('shopease', 500);

  assert.equal(result.valid, true);
  assert.equal(result.code, 'SHOPEASE');
  assert.equal(result.amount, 75);
});

test('validateCoupon rejects unknown coupon codes', () => {
  const result = validateCoupon('invalid-code', 2000);

  assert.deepEqual(result, {
    valid: false,
    discount: 0,
    label: '',
    amount: 0,
  });
});

test('validateCoupon rejects empty string', () => {
  const result = validateCoupon('', 1000);

  assert.equal(result.valid, false);
  assert.equal(result.amount, 0);
});

test('validateCoupon handles undefined code gracefully', () => {
  const result = validateCoupon(undefined, 1000);

  assert.equal(result.valid, false);
});

test('validateCoupon handles null code gracefully', () => {
  const result = validateCoupon(null, 1000);

  assert.equal(result.valid, false);
});

test('validateCoupon handles zero subtotal', () => {
  const result = validateCoupon('SAVE10', 0);

  assert.equal(result.valid, true);
  assert.equal(result.amount, 0);
});

test('validateCoupon handles negative subtotal', () => {
  const result = validateCoupon('SAVE10', -100);

  assert.equal(result.valid, true);
  assert.equal(result.amount, -10);
});

test('validateCoupon rounds discount amount to 2 decimal places', () => {
  const result = validateCoupon('SAVE20', 99.99);

  assert.equal(result.valid, true);
  assert.equal(result.amount, 20.00);
});

test('validateCoupon trims whitespace from code', () => {
  const result = validateCoupon('  save10  ', 100);

  assert.equal(result.valid, true);
  assert.equal(result.code, 'SAVE10');
});

test('COUPONS object contains expected keys', () => {
  assert.ok(COUPONS.SAVE10);
  assert.ok(COUPONS.SAVE20);
  assert.ok(COUPONS.SHOPEASE);
  assert.equal(Object.keys(COUPONS).length, 3);
});

test('all coupon discounts are between 0 and 1 (percentage)', () => {
  Object.values(COUPONS).forEach((c) => {
    assert.ok(c.discount > 0 && c.discount < 1, `Coupon ${c.label} has invalid discount: ${c.discount}`);
  });
});
