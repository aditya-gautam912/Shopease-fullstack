/**
 * src/controllers/reviewController.js
 * Full CRUD for product reviews.
 *
 * GET  /api/products/:productId/reviews        — public, paginated
 * POST /api/products/:productId/reviews        — auth required
 * PUT  /api/products/:productId/reviews/:id    — own review only
 * DELETE /api/products/:productId/reviews/:id  — own review or admin
 *
 * After every write the product's aggregate rating is recalculated.
 */

const Review       = require('../models/Review');
const Product      = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// ── GET /api/products/:productId/reviews ──────────────────
// Public — returns paginated, visible reviews with user name + date
const getReviews = asyncHandler(async (req, res) => {
  const { productId }   = req.params;
  const page            = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit           = Math.min(20, parseInt(req.query.limit || '10', 10));
  const skip            = (page - 1) * limit;

  const filter = { product: productId, isVisible: true };

  const [reviews, total] = await Promise.all([
    Review
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('userName rating title body createdAt user')
      .lean(),
    Review.countDocuments(filter),
  ]);

  // Rating breakdown (how many 1★, 2★ … 5★)
  const breakdown = await Review.aggregate([
    { $match: filter },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      breakdown,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore:    page * limit < total,
      },
    },
  });
});

// ── POST /api/products/:productId/reviews ─────────────────
// Auth required. One review per user per product.
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, body } = req.body;

  // Verify product exists
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Check for duplicate
  const existing = await Review.findOne({ product: productId, user: req.user.userId });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'You have already reviewed this product. Edit your existing review instead.',
    });
  }

  const review = await Review.create({
    product:  productId,
    user:     req.user.userId,
    userName: req.user.email.split('@')[0], // fallback name from email
    rating:   Number(rating),
    title:    title || '',
    body,
  });

  // Fetch the user's actual name and update the snapshot
  const User = require('../models/User');
  const user = await User.findById(req.user.userId).select('name').lean();
  if (user) {
    review.userName = user.name;
    await review.save();
  }

  // Recalculate product aggregate rating
  await Review.recalcProductRating(product._id);

  res.status(201).json({ success: true, data: review });
});

// ── PUT /api/products/:productId/reviews/:id ──────────────
// Auth required. Only the review owner can edit.
const updateReview = asyncHandler(async (req, res) => {
  const { productId, id } = req.params;
  const { rating, title, body } = req.body;

  const review = await Review.findOne({ _id: id, product: productId });
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  // Only the author can update
  if (review.user.toString() !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'You can only edit your own reviews' });
  }

  if (rating !== undefined) review.rating = Number(rating);
  if (title  !== undefined) review.title  = title;
  if (body   !== undefined) review.body   = body;

  await review.save();
  await Review.recalcProductRating(review.product);

  res.json({ success: true, data: review });
});

// ── DELETE /api/products/:productId/reviews/:id ───────────
// Auth required. Owner OR admin can delete.
const deleteReview = asyncHandler(async (req, res) => {
  const { productId, id } = req.params;

  const review = await Review.findOne({ _id: id, product: productId });
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  const isOwner = review.user.toString() === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorised to delete this review' });
  }

  await review.deleteOne();
  await Review.recalcProductRating(review.product);

  res.json({ success: true, message: 'Review deleted' });
});

// ── GET /api/reviews/my ───────────────────────────────────
// Auth required — returns all reviews written by the logged-in user
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review
    .find({ user: req.user.userId })
    .populate('product', 'title image price')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: reviews });
});

// ── Admin: toggle visibility ───────────────────────────────
// PUT /api/reviews/:id/visibility  (admin only)
const toggleVisibility = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  review.isVisible = !review.isVisible;
  await review.save();
  await Review.recalcProductRating(review.product);

  res.json({
    success: true,
    data:    review,
    message: `Review ${review.isVisible ? 'shown' : 'hidden'}`,
  });
});

module.exports = {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  toggleVisibility,
};