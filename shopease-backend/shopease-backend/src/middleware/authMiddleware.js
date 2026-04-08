/**
 * src/middleware/authMiddleware.js
 * Verifies the JWT sent in the Authorization header.
 * Attaches the decoded payload to req.user for downstream handlers.
 * Used on all routes that require a logged-in user.
 */

const jwt = require('jsonwebtoken');
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Expect: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — no token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach a lightweight user object — avoids a DB hit on every request
    req.user = {
      userId: decoded.userId,
      email:  decoded.email,
      role:   decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — token is invalid or expired',
    });
  }
};

module.exports = authMiddleware;
