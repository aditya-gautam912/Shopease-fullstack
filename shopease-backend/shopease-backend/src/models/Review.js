/**
 * src/models/Review.js
 * Mongoose schema for product reviews.
 * Each user can leave exactly one review per product (enforced by unique index).
 * After every save/delete the parent product's rating.rate and rating.count
 * are automatically recalculated via the static recalc() helper.
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Snapshot of the user's name at review time (survives user edits)
    userName: { type: String, required: true },

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
      default: '',
    },

    body: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },

    // Admin can hide abusive reviews without deleting them
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── One review per user per product ───────────────────────
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
// Fast lookup of all reviews for a product
reviewSchema.index({ product: 1, createdAt: -1 });

// ── Static: recalculate product rating after any change ───
reviewSchema.statics.recalcProductRating = async function (productId) {
  const Product = mongoose.model('Product');
  const result  = await this.aggregate([
    { $match: { product: productId, isVisible: true } },
    {
      $group: {
        _id:   '$product',
        rate:  { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      'rating.rate':  parseFloat(result[0].rate.toFixed(1)),
      'rating.count': result[0].count,
    });
  } else {
    // No reviews left — reset to zero
    await Product.findByIdAndUpdate(productId, {
      'rating.rate':  0,
      'rating.count': 0,
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);