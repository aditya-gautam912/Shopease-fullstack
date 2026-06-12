const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError, ConnectionError } = require('sequelize');

const errorHandler = (err, req, res, _next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Sequelize: unique constraint violation (e.g. duplicate email) ──
  if (err instanceof UniqueConstraintError) {
    const field = Object.keys(err.fields || {})[0] || 'field';
    message = `An account with that ${field} already exists`;
    statusCode = 409;
  } else if (err instanceof ForeignKeyConstraintError) {
    message = 'Referenced resource not found';
    statusCode = 404;
  } else if (err instanceof ValidationError) {
    message = err.errors.map((e) => e.message).join(', ');
    statusCode = 422;
  } else if (err instanceof DatabaseError || err instanceof ConnectionError) {
    message = 'Database error occurred';
    statusCode = 500;
  }

  // ── JWT errors ──
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token has expired, please log in again';
    statusCode = 401;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
