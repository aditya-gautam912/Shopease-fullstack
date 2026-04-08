/**
 * src/middleware/rateLimiter.js
 * Rate limiting middleware to protect against brute force and DDoS attacks.
 * 
 * Different limits for different route types:
 * - Auth routes (login, register): Stricter limits
 * - API routes: Standard limits
 * - General: Lenient limits
 */

const rateLimit = require('express-rate-limit');

// ── Helper to create consistent error response ─────────────
const createLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    message,
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
  });
};

// ── General API Rate Limiter ────────────────────────────────
// 100 requests per minute for general API access
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,  // Disable X-RateLimit-* headers
  handler: createLimitHandler('Too many requests. Please try again in a minute.'),
});

// ── Auth Rate Limiter (Login/Register) ──────────────────────
// 5 attempts per 15 minutes - strict to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many login attempts' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: createLimitHandler('Too many login attempts. Please try again in 15 minutes.'),
});

// ── Password Reset Limiter ──────────────────────────────────
// 3 requests per hour - very strict to prevent email bombing
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: 'Too many password reset requests' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many password reset requests. Please try again in an hour.'),
});

// ── Account Creation Limiter ────────────────────────────────
// 3 accounts per hour per IP
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: 'Too many accounts created' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many accounts created from this IP. Please try again later.'),
});

// ── Order Creation Limiter ──────────────────────────────────
// 10 orders per hour per IP (prevents order spam)
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many orders placed' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Order limit reached. Please try again later.'),
});

// ── Review Creation Limiter ─────────────────────────────────
// 10 reviews per hour per IP
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many reviews submitted' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Review limit reached. Please try again later.'),
});

// ── Strict Limiter for Sensitive Operations ─────────────────
// 3 requests per 10 minutes (for things like email change, etc.)
const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { success: false, message: 'Too many requests for this action' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many requests. Please wait before trying again.'),
});

// ── API Abuse Prevention ────────────────────────────────────
// 1000 requests per hour - catches aggressive scrapers
const apiAbuseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: { success: false, message: 'API rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('API rate limit exceeded. Please slow down your requests.'),
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  orderLimiter,
  reviewLimiter,
  strictLimiter,
  apiAbuseLimiter,
};
