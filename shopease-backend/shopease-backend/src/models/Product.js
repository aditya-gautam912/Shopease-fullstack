/**
 * src/models/Product.js
 * Mongoose schema and model for e-commerce products.
 * Supports categories, ratings, stock tracking, and soft activation.
 */

const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'Variant SKU is required'],
    trim: true,
  },
  size: {
    type: String,
    default: '',
    trim: true,
  },
  color: {
    type: String,
    default: '',
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Variant price is required'],
    min: [0, 'Price cannot be negative'],
  },
  stock: {
    type: Number,
    required: [true, 'Variant stock is required'],
    min: [0, 'Stock cannot be negative'],
  },
  image: {
    type: String,
    default: '',
  },
}, { _id: true });

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  oldPrice: {
    type: Number,
    default: null,
    min: [0, 'Old price cannot be negative'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['electronics', 'fashion', 'home', 'sports', 'beauty'],
      message: '{VALUE} is not a valid category',
    },
    lowercase: true,
  },
  image: {
    type: String,
    required: [true, 'Product image URL is required'],
  },
  images: {
    type: [String],
    default: [],
  },
  rating: {
    rate:  { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  stock: {
    type: Number,
    default: 100,
    min: [0, 'Stock cannot be negative'],
  },
  variants: {
    type: [variantSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// ── Index for fast text search ─────────────────────────────
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);