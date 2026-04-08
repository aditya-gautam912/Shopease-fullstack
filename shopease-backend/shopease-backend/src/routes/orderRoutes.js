/**
 * src/routes/orderRoutes.js
 * Routes for placing orders (auth users) and managing
 * all orders (admin). Razorpay payment integration.
 * Rate limited to prevent order spam.
 */

const express  = require('express');
const { body, param } = require('express-validator');

const {
  createOrder,
  createRazorpayOrder,
  deleteOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  createGuestOrder,
  trackGuestOrder,
  downloadInvoice,
  downloadGuestInvoice,
} = require('../controllers/orderController');

const authMiddleware  = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validate        = require('../middleware/validate');
const { orderLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ── Shared address validation ──────────────────────────────
const addressValidation = [
  body('shippingAddress.street')
    .trim()
    .notEmpty().withMessage('Street address is required')
    .isLength({ max: 200 }).withMessage('Street cannot exceed 200 characters')
    .escape(),

  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters')
    .escape(),

  body('shippingAddress.state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State cannot exceed 100 characters')
    .escape(),

  body('shippingAddress.zip')
    .trim()
    .notEmpty().withMessage('ZIP code is required')
    .isLength({ max: 20 }).withMessage('ZIP cannot exceed 20 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Invalid ZIP code format'),

  body('shippingAddress.country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters')
    .escape(),
];

// ── Shared order items validation ──────────────────────────
const itemsValidation = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),

  body('items.*.productId')
    .notEmpty().withMessage('Each item must have a productId')
    .isMongoId().withMessage('Invalid product ID'),

  body('items.*.qty')
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
];

// ── POST /api/orders/guest  (public) ──────────────────────
// Rate limit: 10 orders per hour per IP
router.post(
  '/guest',
  orderLimiter,
  [
    ...itemsValidation,

    body('guestEmail')
      .trim()
      .isEmail().withMessage('Valid email is required')
      .isLength({ max: 254 }).withMessage('Email cannot exceed 254 characters')
      .normalizeEmail(),

    body('guestName')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
      .escape(),

    body('guestPhone')
      .trim()
      .notEmpty().withMessage('Phone number is required')
      .isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters')
      .matches(/^[+\d\s()-]+$/).withMessage('Invalid phone format'),

    ...addressValidation,

    body('paymentMethod')
      .isIn(['card', 'upi', 'netbanking', 'wallet', 'cod'])
      .withMessage('Invalid payment method'),
  ],
  validate,
  createGuestOrder
);

// ── GET /api/orders/track/:token  (public) ────────────────
router.get(
  '/track/:token',
  [
    param('token')
      .trim()
      .notEmpty().withMessage('Tracking token is required')
      .isLength({ max: 100 }).withMessage('Invalid token'),
  ],
  validate,
  trackGuestOrder
);

// ── GET /api/orders/guest/:token/invoice  (public) ────────
router.get(
  '/guest/:token/invoice',
  [
    param('token')
      .trim()
      .notEmpty().withMessage('Tracking token is required')
      .isLength({ max: 100 }).withMessage('Invalid token'),
  ],
  validate,
  downloadGuestInvoice
);

// ── POST /api/orders/razorpay-order  (auth) ───────────────
// Creates a Razorpay order — frontend uses the returned
// razorpayOrderId + keyId to open the Razorpay checkout popup.
router.post('/razorpay-order', orderLimiter, createRazorpayOrder);

// ── POST /api/orders  (auth) — place a new order ──────────
// Rate limit: 10 orders per hour per IP
router.post(
  '/',
  authMiddleware,
  orderLimiter,
  [
    ...itemsValidation,
    ...addressValidation,

    body('paymentMethod')
      .isIn(['card', 'upi', 'netbanking', 'wallet', 'cod'])
      .withMessage('Invalid payment method'),
  ],
  validate,
  createOrder
);

// ── GET /api/orders/my  (auth) — current user's orders ────
// NOTE: must be defined before /:id to avoid conflicts
router.get('/my', authMiddleware, getMyOrders);

// ── GET /api/orders  (admin) — all orders ─────────────────
router.get('/', authMiddleware, adminMiddleware, getAllOrders);

// ── PUT /api/orders/:id/status  (admin) ───────────────────
router.put(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid order ID'),

    body('status')
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],
  validate,
  updateOrderStatus
);

// ── DELETE /api/orders/:id  (admin) ───────────────────────
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid order ID'),
  ],
  validate,
  deleteOrder
);

// ── GET /api/orders/:id/invoice  (auth) ───────────────────
router.get(
  '/:id/invoice',
  authMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid order ID'),
  ],
  validate,
  downloadInvoice
);

module.exports = router;
