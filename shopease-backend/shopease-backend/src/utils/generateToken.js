/**
 * src/utils/generateToken.js
 * Creates signed JWTs for authentication.
 * Access token: short-lived (15 min) for API requests.
 * Refresh token: long-lived (7 days) for obtaining new access tokens.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a short-lived access token
 * @param {Object} user - Mongoose User document
 * @returns {string} Signed JWT string (15 min expiry)
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email:  user.email,
      role:   user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate a long-lived refresh token
 * @param {Object} user - Mongoose User document
 * @returns {string} Signed JWT string (7 days expiry)
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      tokenId: crypto.randomBytes(16).toString('hex'), // unique per token
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - Mongoose User document
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokens = (user) => {
  return {
    accessToken:  generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

// Legacy export for backward compatibility
const generateToken = generateAccessToken;

module.exports = { generateToken, generateAccessToken, generateRefreshToken, generateTokens };