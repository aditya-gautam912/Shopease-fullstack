/**
 * src/models/Return.js
 * Mongoose schema and model for product returns and refunds.
 */

const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    enum: ['defective', 'wrong-item', 'not-satisfied', 'other'],
    required: true,
  },
}, { _id: false });

const returnSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: {
    type: [returnItemSchema],
    required: true,
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'A return must have at least one item',
    },
  },
  reason: {
    type: String,
    enum: ['defective', 'wrong-item', 'not-satisfied', 'other'],
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 5,
      message: 'Maximum of 5 images allowed',
    },
  },
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'refunded'],
    default: 'requested',
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  refundMethod: {
    type: String,
    default: null,
  },
  razorpayRefundId: {
    type: String,
    default: null,
  },
  adminNotes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// ── Indexes for common query patterns ──────────────────────
returnSchema.index({ userId: 1, createdAt: -1 });
returnSchema.index({ status: 1 });
returnSchema.index({ orderId: 1 });

module.exports = mongoose.model('Return', returnSchema);
