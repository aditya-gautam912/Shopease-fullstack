/**
 * src/utils/coupons.js
 * Hardcoded coupon definitions and a helper to validate & apply them.
 * In a real app these would live in a DB collection.
 */

const COUPONS = {
  SAVE10:    { discount: 0.10, label: '10% off your order' },
  SAVE20:    { discount: 0.20, label: '20% off your order' },
  SHOPEASE:  { discount: 0.15, label: '15% off your order' },
};

/**
 * Validates a coupon code and returns the discount multiplier.
 * @param {string} code - Coupon code entered by user (case-insensitive)
 * @param {number} subtotal - Current cart subtotal
 * @returns {{ valid: boolean, discount: number, label: string, amount: number }}
 */
const validateCoupon = (code, subtotal = 0) => {
  const normalised = (code || '').toUpperCase().trim();
  const coupon = COUPONS[normalised];

  if (!coupon) {
    return { valid: false, discount: 0, label: '', amount: 0 };
  }

  const amount = parseFloat((subtotal * coupon.discount).toFixed(2));
  return {
    valid:    true,
    code:     normalised,
    discount: coupon.discount,
    label:    coupon.label,
    amount,
  };
};

module.exports = { COUPONS, validateCoupon };
