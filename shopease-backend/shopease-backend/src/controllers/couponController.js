const { Coupon } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const validateCouponCode = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Coupon code is required' });
  }
  if (!subtotal || isNaN(subtotal) || subtotal <= 0) {
    return res.status(400).json({ success: false, message: 'A valid subtotal is required' });
  }

  const sub = parseFloat(subtotal);
  const coupon = await Coupon.findOne({
    where: { code: code.trim().toUpperCase(), isActive: true },
    raw: true,
  });

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
  }

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    return res.status(400).json({ success: false, message: 'This coupon has expired' });
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
  }

  if (sub < coupon.minOrderValue) {
    return res.status(400).json({
      success: false,
      message: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} required for this coupon`,
    });
  }

  let amount;
  let label;
  if (coupon.type === 'percentage') {
    amount = parseFloat((sub * coupon.discount).toFixed(2));
    label = `${Math.round(coupon.discount * 100)}% off your order`;
  } else {
    amount = Math.min(coupon.discount, sub);
    label = `₹${coupon.discount.toLocaleString('en-IN')} off your order`;
  }

  if (coupon.description) label = coupon.description;

  res.json({
    success: true,
    data: {
      code: coupon.code,
      label,
      discount: coupon.type === 'percentage' ? coupon.discount : null,
      amount,
      type: coupon.type,
    },
  });
});

const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: coupons });
});

const createCoupon = asyncHandler(async (req, res) => {
  const { code, description, type, discount, minOrderValue, expiresAt, usageLimit, isActive } = req.body;

  const coupon = await Coupon.create({
    code, description, type, discount,
    minOrderValue: minOrderValue || 0,
    expiresAt: expiresAt || null,
    usageLimit: usageLimit || null,
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({ success: true, data: coupon });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const { code, description, type, discount, minOrderValue, expiresAt, usageLimit, isActive } = req.body;

  const [affected] = await Coupon.update(
    { code, description, type, discount, minOrderValue, expiresAt, usageLimit, isActive },
    { where: { id: req.params.id } },
  );

  if (affected === 0) {
    return res.status(404).json({ success: false, message: 'Coupon not found' });
  }

  const coupon = await Coupon.findByPk(req.params.id);
  res.json({ success: true, data: coupon });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const affected = await Coupon.destroy({ where: { id: req.params.id } });
  if (affected === 0) {
    return res.status(404).json({ success: false, message: 'Coupon not found' });
  }
  res.json({ success: true, message: 'Coupon deleted' });
});

const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found' });
  }
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  res.json({ success: true, data: coupon });
});

module.exports = {
  validateCouponCode, getAllCoupons, createCoupon,
  updateCoupon, deleteCoupon, toggleCoupon,
};
