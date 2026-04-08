/**
 * src/routes/authRoutes.js
 * Public routes for user registration, login, and token refresh.
 * Uses express-validator chains + the validate middleware.
 * Rate limited to prevent brute force attacks.
 */

const express  = require('express');
const { body } = require('express-validator');

const { 
  register, 
  login, 
  refreshAccessToken, 
  logoutUser, 
  logoutAllDevices,
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const validate            = require('../middleware/validate');
const authMiddleware      = require('../middleware/authMiddleware');
const { 
  authLimiter, 
  registrationLimiter, 
  passwordResetLimiter 
} = require('../middleware/rateLimiter');

const router = express.Router();

// ── POST /api/auth/register ────────────────────────────────
// Rate limit: 3 registrations per hour per IP
router.post(
  '/register',
  registrationLimiter,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
      .escape(),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .isLength({ max: 254 }).withMessage('Email cannot exceed 254 characters')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  ],
  validate,
  register
);

// ── POST /api/auth/login ───────────────────────────────────
// Rate limit: 5 attempts per 15 minutes per IP
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// ── POST /api/auth/refresh ─────────────────────────────────
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required')
      .isJWT().withMessage('Invalid token format'),
  ],
  validate,
  refreshAccessToken
);

// ── POST /api/auth/logout ──────────────────────────────────
router.post('/logout', logoutUser);

// ── POST /api/auth/logout-all (requires auth) ──────────────
router.post('/logout-all', authMiddleware, logoutAllDevices);

// ── POST /api/auth/forgot-password ────────────────────────
// Rate limit: 3 requests per hour per IP
router.post(
  '/forgot-password',
  passwordResetLimiter,
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .normalizeEmail(),
  ],
  validate,
  forgotPassword
);

// ── POST /api/auth/reset-password/:token ──────────────────
// Rate limit: 3 requests per hour per IP
router.post(
  '/reset-password/:token',
  passwordResetLimiter,
  [
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  ],
  validate,
  resetPassword
);

// ── GET /api/auth/verify-email/:token ─────────────────────
router.get('/verify-email/:token', verifyEmail);

// ── POST /api/auth/resend-verification (requires auth) ────
router.post('/resend-verification', authMiddleware, resendVerification);

module.exports = router;