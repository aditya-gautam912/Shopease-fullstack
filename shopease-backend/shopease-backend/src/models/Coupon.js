/**
 * src/models/Coupon.js
 * Mongoose schema for coupon codes.
 * Supports percentage and fixed-amount discounts,
 * optional expiry date, usage limits, and active/inactive toggle.
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type:      String,
    required:  [true, 'Coupon code is required'],
    unique:    true,
    uppercase: true,
    trim:      true,
    match:     [/^[A-Z0-9_-]{2,20}$/, 'Code must be 2-20 alphanumeric characters'],
  },

  description: {
    type:    String,
    default: '',
    trim:    true,
  },

  // 'percentage' = X% off  |  'fixed' = flat ₹ off
  type: {
    type:    String,
    enum:    ['percentage', 'fixed'],
    default: 'percentage',
  },

  // For percentage: 0.10 = 10%.  For fixed: amount in INR (e.g. 500)
  discount: {
    type:     Number,
    required: [true, 'Discount value is required'],
    min:      [0,    'Discount cannot be negative'],
  },

  // Minimum cart subtotal (INR) required to use this coupon
  minOrderValue: {
    type:    Number,
    default: 0,
    min:     0,
  },

  // Optional expiry — null means no expiry
  expiresAt: {
    type:    Date,
    default: null,
  },

  // Max times this coupon can be used across all users (null = unlimited)
  usageLimit: {
    type:    Number,
    default: null,
    min:     1,
  },

  // How many times it has been used so far
  usedCount: {
    type:    Number,
    default: 0,
    min:     0,
  },

  isActive: {
    type:    Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Note: 'unique: true' on 'code' already creates an index

module.exports = mongoose.model('Coupon', couponSchema);