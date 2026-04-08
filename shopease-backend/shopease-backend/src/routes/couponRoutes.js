/**
 * src/routes/couponRoutes.js
 * User: POST /api/coupons/validate
 * Admin: GET/POST /api/coupons  and  PUT/DELETE/PATCH /api/coupons/:id
 */

const express  = require('express');
const { body, param } = require('express-validator');

const {
  validateCouponCode,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
} = require('../controllers/couponController');

const authMiddleware  = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validate        = require('../middleware/validate');

const router = express.Router();

// ── POST /api/coupons/validate  (auth users) ─────────────
router.post(
  '/validate',
  authMiddleware,
  [
    body('code')
      .trim()
      .notEmpty().withMessage('Coupon code is required')
      .isLength({ max: 20 }).withMessage('Code cannot exceed 20 characters')
      .matches(/^[A-Z0-9_-]+$/i).withMessage('Invalid coupon code format')
      .toUpperCase(),

    body('subtotal')
      .isFloat({ min: 0.01, max: 10000000 }).withMessage('Valid subtotal is required'),
  ],
  validate,
  validateCouponCode
);

// ── Admin coupon validation ────────────────────────────────
const couponValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Code is required')
    .matches(/^[A-Z0-9_-]{2,20}$/i).withMessage('Code must be 2-20 alphanumeric characters')
    .toUpperCase(),

  body('type')
    .isIn(['percentage', 'fixed']).withMessage('Type must be percentage or fixed'),

  body('discount')
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters')
    .escape(),

  body('minOrderValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum order value must be positive'),

  body('maxUses')
    .optional()
    .isInt({ min: 1, max: 100000 }).withMessage('Max uses must be between 1 and 100,000'),

  body('expiresAt')
    .optional()
    .isISO8601().withMessage('Invalid expiration date format'),
];

// ── GET /api/coupons  (admin) ─────────────────────────────
router.get('/', authMiddleware, adminMiddleware, getAllCoupons);

// ── POST /api/coupons  (admin) ────────────────────────────
router.post('/', authMiddleware, adminMiddleware, couponValidation, validate, createCoupon);

// ── PUT /api/coupons/:id  (admin) ─────────────────────────
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid coupon ID'),
    ...couponValidation.map(v => v.optional()),
  ],
  validate,
  updateCoupon
);

// ── DELETE /api/coupons/:id  (admin) ──────────────────────
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid coupon ID'),
  ],
  validate,
  deleteCoupon
);

// ── PATCH /api/coupons/:id/toggle  (admin) ────────────────
router.patch(
  '/:id/toggle',
  authMiddleware,
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid coupon ID'),
  ],
  validate,
  toggleCoupon
);

module.exports = router;