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

test('validateCoupon rejects unknown coupon codes', () => {
  const result = validateCoupon('invalid-code', 2000);

  assert.deepEqual(result, {
    valid: false,
    discount: 0,
    label: '',
    amount: 0,
  });
});
