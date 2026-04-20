/**
 * src/middleware/optionalAuthMiddleware.js
 * Similar to authMiddleware, but doesn't block if no token is provided.
 * Useful for routes accessible to both guest and authenticated users.
 */

const jwt = require('jsonwebtoken');

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email:  decoded.email,
      role:   decoded.role,
    };
  } catch {
    // Token is invalid, but we don't block — just proceed without req.user
  }

  next();
};

module.exports = optionalAuthMiddleware;
