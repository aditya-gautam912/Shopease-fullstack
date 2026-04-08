/**
 * src/middleware/sanitize.js
 * Input sanitization middleware for XSS and NoSQL injection protection.
 *
 * Features:
 *  - NoSQL injection prevention (removes $ and . from keys)
 *  - XSS sanitization (escapes HTML in string values)
 *  - Recursive sanitization of nested objects/arrays
 */

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// ── XSS Options ────────────────────────────────────────────
// Allow basic formatting but strip dangerous tags/attributes
const xssOptions = {
  whiteList: {},           // No HTML tags allowed by default
  stripIgnoreTag: true,    // Remove tags not in whitelist
  stripIgnoreTagBody: ['script', 'style'], // Remove these entirely
};

/**
 * Recursively sanitizes strings in an object/array against XSS.
 * @param {any} data - Input data to sanitize
 * @returns {any} - Sanitized data
 */
const sanitizeXSS = (data) => {
  if (typeof data === 'string') {
    return xss(data, xssOptions);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeXSS);
  }

  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const key of Object.keys(data)) {
      sanitized[key] = sanitizeXSS(data[key]);
    }
    return sanitized;
  }

  return data; // numbers, booleans, null, undefined
};

/**
 * XSS sanitization middleware.
 * Sanitizes req.body, req.query, and req.params.
 */
const xssSanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeXSS(req.body);
  }
  if (req.query) {
    req.query = sanitizeXSS(req.query);
  }
  if (req.params) {
    req.params = sanitizeXSS(req.params);
  }
  next();
};

/**
 * NoSQL injection sanitization middleware.
 * Uses express-mongo-sanitize to remove $ and . from keys.
 */
const noSqlSanitize = mongoSanitize({
  replaceWith: '_',        // Replace prohibited chars with underscore
  allowDots: false,        // Don't allow dots in keys
  onSanitize: ({ key }) => {
    console.warn(`[Security] Sanitized NoSQL injection attempt in ${key}`);
  },
});

/**
 * Combined sanitization middleware.
 * Apply both NoSQL and XSS sanitization.
 */
const sanitize = [noSqlSanitize, xssSanitize];

module.exports = {
  sanitize,
  noSqlSanitize,
  xssSanitize,
  sanitizeXSS,
};
