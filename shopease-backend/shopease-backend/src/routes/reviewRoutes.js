/**
 * src/routes/reviewRoutes.js
 * Routes for product reviews.
 * Rate limited to prevent review spam.
 *
 * Nested under /api/products/:productId/reviews  (per-product CRUD)
 * Plus standalone:
 *   GET  /api/reviews/my              — logged-in user's own reviews
 *   PUT  /api/reviews/:id/visibility  — admin toggle
 */

const express  = require('express');
const { body, param } = require('express-validator');

const {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  toggleVisibility,
} = require('../controllers/reviewController');

const authMiddleware  = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validate        = require('../middleware/validate');
const { reviewLimiter } = require('../middleware/rateLimiter');

// ── Per-product router (merged params so :productId is available) ──
const productReviewRouter = express.Router({ mergeParams: true });

productReviewRouter.get('/', getReviews);

// Rate limit: 10 reviews per hour per IP
productReviewRouter.post(
  '/',
  authMiddleware,
  reviewLimiter,
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
    body('body')
      .trim()
      .notEmpty().withMessage('Review text is required')
      .isLength({ max: 2000 }).withMessage('Review cannot exceed 2000 characters')
      .customSanitizer(val => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 120 }).withMessage('Title cannot exceed 120 characters')
      .escape(),
  ],
  validate,
  createReview
);

productReviewRouter.put(
  '/:id',
  authMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid review ID'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('body')
      .optional()
      .trim()
      .notEmpty().withMessage('Review text cannot be empty')
      .isLength({ max: 2000 }).withMessage('Review cannot exceed 2000 characters')
      .customSanitizer(val => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 120 }).withMessage('Title cannot exceed 120 characters')
      .escape(),
  ],
  validate,
  updateReview
);

productReviewRouter.delete(
  '/:id',
  authMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid review ID'),
  ],
  validate,
  deleteReview
);

// ── Standalone router ──────────────────────────────────────
const standaloneRouter = express.Router();

// Current user's reviews
standaloneRouter.get('/my', authMiddleware, getMyReviews);

// Admin: toggle a review's visibility
standaloneRouter.put(
  '/:id/visibility',
  authMiddleware,
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid review ID'),
  ],
  validate,
  toggleVisibility
);

module.exports = { productReviewRouter, standaloneRouter };