/**
 * src/middleware/sanitize.js
 * Input sanitization middleware for XSS and NoSQL injection protection.
 *
 * Features:
 *  - NoSQL injection prevention (removes $ and . from keys)
 *  - XSS sanitization (escapes HTML in string values)
 *  - Recursive sanitization of nested objects/arrays
 */

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
 * Recursively removes MongoDB operator characters from object keys.
 * Express 5 exposes req.query through a getter, so we sanitize values
 * and then mutate the existing object instead of reassigning req.query.
 * @param {any} data - Input data to sanitize
 * @param {string} context - Request section for logging
 * @returns {any} - Sanitized data
 */
const sanitizeNoSqlKeys = (data, context = 'payload') => {
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeNoSqlKeys(item, context));
  }

  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [rawKey, value] of Object.entries(data)) {
      const safeKey = rawKey.replace(/\$/g, '_').replace(/\./g, '_');
      if (safeKey !== rawKey) {
        console.warn(`[Security] Sanitized NoSQL injection attempt in ${context}.${rawKey}`);
      }
      sanitized[safeKey] = sanitizeNoSqlKeys(value, context);
    }
    return sanitized;
  }

  return data;
};

/**
 * Mutates an existing request section in place so Express 5 getter-backed
 * objects such as req.query remain writable for downstream middleware.
 * @param {object} target - Existing request object section
 * @param {any} sanitizedValue - Sanitized replacement value
 */
const applySanitizedValue = (target, sanitizedValue) => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  if (sanitizedValue && typeof sanitizedValue === 'object' && !Array.isArray(sanitizedValue)) {
    Object.assign(target, sanitizedValue);
  }
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
    applySanitizedValue(req.query, sanitizeXSS(req.query));
  }
  if (req.params) {
    applySanitizedValue(req.params, sanitizeXSS(req.params));
  }
  next();
};

/**
 * NoSQL injection sanitization middleware.
 * Removes $ and . from keys without reassigning getter-backed request objects.
 */
const noSqlSanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeNoSqlKeys(req.body, 'body');
  }
  if (req.query) {
    applySanitizedValue(req.query, sanitizeNoSqlKeys(req.query, 'query'));
  }
  if (req.params) {
    applySanitizedValue(req.params, sanitizeNoSqlKeys(req.params, 'params'));
  }
  next();
};

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
  sanitizeNoSqlKeys,
};
