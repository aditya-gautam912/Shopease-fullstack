/**
 * src/middleware/adminMiddleware.js
 * Role guard that must be used AFTER authMiddleware.
 * Rejects any request where req.user.role is not 'admin'.
 */

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden — admin access required',
    });
  }
  next();
};

module.exports = adminMiddleware;