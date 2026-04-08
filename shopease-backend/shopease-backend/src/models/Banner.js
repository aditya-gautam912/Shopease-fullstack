/**
 * src/models/Banner.js
 * Mongoose schema and model for promotional banners.
 * Supports scheduled activation, positioning, and image display.
 */

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  image: {
    type: String,
    required: [true, 'Banner image URL is required'],
  },
  link: {
    type: String,
    trim: true,
    default: '',
  },
  active: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
  position: {
    type: String,
    enum: {
      values: ['hero', 'top-bar', 'sidebar', 'category'],
      message: '{VALUE} is not a valid position',
    },
    default: 'hero',
  },
}, {
  timestamps: true,
});

// Index for efficient queries on active banners
bannerSchema.index({ active: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
