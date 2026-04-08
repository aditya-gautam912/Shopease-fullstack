/**
 * src/models/Order.js
 * Mongoose schema and model for customer orders.
 * Stores item snapshots (not refs) so order history never breaks
 * if a product is later edited or deleted.
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title:  { type: String, required: true },
  image:  { type: String, required: true },
  price:  { type: Number, required: true },
  qty:    { type: Number, required: true, min: 1 },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  street:  { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String, default: '' },
  zip:     { type: String, required: true },
  country: { type: String, default: 'US' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow guest checkout
  },
  guestEmail: {
    type: String,
    default: null,
  },
  guestName: {
    type: String,
    default: null,
  },
  guestPhone: {
    type: String,
    default: null,
  },
  trackingToken: {
    type: String,
    default: null,
    select: false,
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'An order must have at least one item',
    },
  },
  subtotal:  { type: Number, required: true, min: 0 },
  discount:  { type: Number, default: 0, min: 0 },
  shipping:  { type: Number, default: 0, min: 0 },
  total:     { type: Number, required: true, min: 0 },
  coupon:    { type: String, default: null },

  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending',
  },
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  trackingNumber: {
    type: String,
    default: null,
  },
  shippingAddress: {
    type: shippingAddressSchema,
    required: true,
  },
}, {
  timestamps: true,
});

// ── Indexes for common query patterns ──────────────────────
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ trackingToken: 1 });

module.exports = mongoose.model('Order', orderSchema);