/**
 * src/routes/userRoutes.js
 * User profile management, delivery addresses, wishlist,
 * cart, recently viewed, and admin user-management endpoints.
 */

const express  = require('express');
const { body, param, query } = require('express-validator');

const {
  getMe,
  updateMe,
  addAddress,
  removeAddress,
  setDefaultAddress,
  toggleWishlist,
  getWishlist,
  getAllUsers,
  getCart,
  syncCart,
  getRecentlyViewed,
  deleteUser,
  updateUserRole,
  changePassword,   // ✅ new
} = require('../controllers/userController');

const authMiddleware  = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validate        = require('../middleware/validate');

const router = express.Router();

// ── All routes below require authentication ────────────────
router.use(authMiddleware);

// ── Profile ───────────────────────────────────────────────
router.get('/me', getMe);

router.put(
  '/me',
  [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
      .escape(),

    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Please enter a valid email address')
      .isLength({ max: 254 }).withMessage('Email cannot exceed 254 characters')
      .normalizeEmail(),

    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters')
      .matches(/^[+\d\s()-]*$/).withMessage('Invalid phone format'),
  ],
  validate,
  updateMe
);

// ── PUT /api/users/me/password  (auth – change password) ──
router.put(
  '/me/password',
  [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),

    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
      .isLength({ max: 128 }).withMessage('Password cannot exceed 128 characters'),

    body('confirmPassword')
      .notEmpty().withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
  validate,
  changePassword
);

// ── Addresses ─────────────────────────────────────────────
router.post(
  '/me/address',
  [
    body('street')
      .trim()
      .notEmpty().withMessage('Street is required')
      .isLength({ max: 200 }).withMessage('Street cannot exceed 200 characters')
      .escape(),

    body('city')
      .trim()
      .notEmpty().withMessage('City is required')
      .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters')
      .escape(),

    body('state')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('State cannot exceed 100 characters')
      .escape(),

    body('zip')
      .trim()
      .notEmpty().withMessage('ZIP code is required')
      .isLength({ max: 20 }).withMessage('ZIP cannot exceed 20 characters')
      .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Invalid ZIP code format'),

    body('country')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters')
      .escape(),

    body('isDefault')
      .optional()
      .isBoolean().withMessage('isDefault must be a boolean'),
  ],
  validate,
  addAddress
);

router.delete(
  '/me/address/:addressId',
  [
    param('addressId')
      .isMongoId().withMessage('Invalid address ID'),
  ],
  validate,
  removeAddress
);

router.patch(
  '/me/address/:addressId/default',
  [
    param('addressId')
      .isMongoId().withMessage('Invalid address ID'),
  ],
  validate,
  setDefaultAddress
);

// ── Wishlist ──────────────────────────────────────────────
router.get('/wishlist', getWishlist);

router.post(
  '/wishlist/:productId',
  [
    param('productId')
      .isMongoId().withMessage('Invalid product ID'),
  ],
  validate,
  toggleWishlist
);

// ── Cart ──────────────────────────────────────────────────
router.get('/cart', getCart);

router.put(
  '/cart',
  [
    body('items')
      .isArray().withMessage('Items must be an array'),

    // ✅ FIX #6/#12 – changed productId → _id to match frontend cart item shape
    body('items.*._id')
      .isMongoId().withMessage('Invalid product ID'),

    body('items.*.qty')
      .isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  ],
  validate,
  syncCart
);

// ── Recently Viewed ───────────────────────────────────────
router.get('/recently-viewed', getRecentlyViewed);

// ─────────────────────────────────────────────────────────
// ── Admin routes (adminMiddleware applied per-route) ──────
// ─────────────────────────────────────────────────────────

// ── GET /api/users  (admin only) ──────────────────────────
router.get(
  '/',
  adminMiddleware,
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),

    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search query too long')
      .escape(),
  ],
  validate,
  getAllUsers
);

// ── DELETE /api/users/:id  (admin only) ───────────────────
// ✅ FIX #11 – new route
// ✅ FIX #14 – param validator included
router.delete(
  '/:id',
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid user ID'),
  ],
  validate,
  deleteUser
);

// ── PATCH /api/users/:id/role  (admin only) ───────────────
// ✅ FIX #11 – new route
// ✅ FIX #14 – param validator included
router.patch(
  '/:id/role',
  adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid user ID'),

    body('role')
      .trim()
      .notEmpty().withMessage('Role is required')
      .isIn(['admin', 'user']).withMessage("Role must be 'admin' or 'user'"),
  ],
  validate,
  updateUserRole
);

module.exports = router;
