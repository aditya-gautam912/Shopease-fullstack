/**
 * src/middleware/errorHandler.js
 * Global Express error-handling middleware.
 * Catches any error passed via next(err) throughout the app.
 * Always returns a consistent { success, message } JSON shape.
 */

const errorHandler = (err, req, res, _next) => {
  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // ── Mongoose: duplicate key (e.g. unique email) ───────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with that ${field} already exists`;
    statusCode = 409;
  }

  // ── Mongoose: validation error ─────────────────────────────
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    statusCode = 422;
  }

  // ── JWT errors ─────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token has expired, please log in again';
    statusCode = 401;
  }

  // ── Mongoose: bad ObjectId ─────────────────────────────────
  if (err.name === 'CastError') {
    message = `Resource not found`;
    statusCode = 404;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
