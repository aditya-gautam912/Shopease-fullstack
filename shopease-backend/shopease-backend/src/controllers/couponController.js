/**
 * src/controllers/couponController.js
 * Coupon validation for users + full CRUD for admins.
 *
 * Public (auth):
 *   POST /api/coupons/validate
 *
 * Admin only:
 *   GET    /api/coupons           — list all coupons
 *   POST   /api/coupons           — create coupon
 *   PUT    /api/coupons/:id       — update coupon
 *   DELETE /api/coupons/:id       — delete coupon
 *   PATCH  /api/coupons/:id/toggle — toggle active/inactive
 */

const Coupon       = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');

// ── POST /api/coupons/validate  (auth) ────────────────────
const validateCouponCode = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Coupon code is required' });
  }
  if (!subtotal || isNaN(subtotal) || subtotal <= 0) {
    return res.status(400).json({ success: false, message: 'A valid subtotal is required' });
  }

  const sub    = parseFloat(subtotal);
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
  }

  // Check expiry
  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    return res.status(400).json({ success: false, message: 'This coupon has expired' });
  }

  // Check usage limit
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
  }

  // Check minimum order value
  if (sub < coupon.minOrderValue) {
    return res.status(400).json({
      success: false,
      message: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} required for this coupon`,
    });
  }

  // Calculate discount amount
  let amount;
  let label;
  if (coupon.type === 'percentage') {
    amount = parseFloat((sub * coupon.discount).toFixed(2));
    label  = `${Math.round(coupon.discount * 100)}% off your order`;
  } else {
    amount = Math.min(coupon.discount, sub); // fixed amount, can't exceed subtotal
    label  = `₹${coupon.discount.toLocaleString('en-IN')} off your order`;
  }

  if (coupon.description) label = coupon.description;

  res.json({
    success: true,
    data: {
      code:     coupon.code,
      label,
      discount: coupon.type === 'percentage' ? coupon.discount : null,
      amount,
      type:     coupon.type,
    },
  });
});

// ── GET /api/coupons  (admin) ──────────────────────────────
const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
});

// ── POST /api/coupons  (admin) ─────────────────────────────
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, type, discount,
    minOrderValue, expiresAt, usageLimit, isActive,
  } = req.body;

  const coupon = await Coupon.create({
    code, description, type, discount,
    minOrderValue: minOrderValue || 0,
    expiresAt:     expiresAt    || null,
    usageLimit:    usageLimit   || null,
    isActive:      isActive !== undefined ? isActive : true,
  });

  res.status(201).json({ success: true, data: coupon });
});

// ── PUT /api/coupons/:id  (admin) ──────────────────────────
const updateCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, type, discount,
    minOrderValue, expiresAt, usageLimit, isActive,
  } = req.body;

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { code, description, type, discount, minOrderValue, expiresAt, usageLimit, isActive },
    { new: true, runValidators: true }
  );

  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

  res.json({ success: true, data: coupon });
});

// ── DELETE /api/coupons/:id  (admin) ──────────────────────
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  res.json({ success: true, message: 'Coupon deleted' });
});

// ── PATCH /api/coupons/:id/toggle  (admin) ────────────────
const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  res.json({ success: true, data: coupon });
});

module.exports = {
  validateCouponCode,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
};