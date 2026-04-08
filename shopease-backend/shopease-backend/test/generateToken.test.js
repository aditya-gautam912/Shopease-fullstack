const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
} = require('../src/utils/generateToken');

const user = {
  _id: '507f1f77bcf86cd799439011',
  email: 'admin@shopease.com',
  role: 'admin',
};

test('generateAccessToken encodes user claims', () => {
  const token = generateAccessToken(user);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  assert.equal(decoded.userId, user._id);
  assert.equal(decoded.email, user.email);
  assert.equal(decoded.role, user.role);
});

test('generateRefreshToken signs with the refresh secret', () => {
  const token = generateRefreshToken(user);
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  assert.equal(decoded.userId, user._id);
  assert.ok(decoded.tokenId);
});

test('generateTokens returns both tokens', () => {
  const tokens = generateTokens(user);

  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);
});
