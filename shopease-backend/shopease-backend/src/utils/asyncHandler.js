/**
 * src/utils/asyncHandler.js
 * Wraps an async Express route handler so any thrown error
 * is automatically forwarded to the global errorHandler middleware.
 * Eliminates the need for try/catch in every controller function.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;