const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  generateToken,
} = require('../src/utils/generateToken');

const user = {
  id: '507f1f77bcf86cd799439011',
  email: 'admin@shopease.com',
  role: 'admin',
};

test('generateAccessToken encodes user claims', () => {
  const token = generateAccessToken(user);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  assert.equal(decoded.userId, user.id);
  assert.equal(decoded.email, user.email);
  assert.equal(decoded.role, user.role);
});

test('generateAccessToken expires in 15 minutes', () => {
  const token = generateAccessToken(user);
  const decoded = jwt.decode(token);

  const now = Math.floor(Date.now() / 1000);
  const expectedExp = now + 15 * 60;
  // Allow 2-second tolerance for test execution
  assert.ok(Math.abs(decoded.exp - expectedExp) <= 2, `Expected exp ~${expectedExp}, got ${decoded.exp}`);
});

test('generateRefreshToken signs with the refresh secret', () => {
  const token = generateRefreshToken(user);
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  assert.equal(decoded.userId, user.id);
  assert.ok(decoded.tokenId);
});

test('generateRefreshToken includes a unique tokenId', () => {
  const token1 = generateRefreshToken(user);
  const token2 = generateRefreshToken(user);
  const decoded1 = jwt.verify(token1, process.env.JWT_REFRESH_SECRET);
  const decoded2 = jwt.verify(token2, process.env.JWT_REFRESH_SECRET);

  assert.notEqual(decoded1.tokenId, decoded2.tokenId);
});

test('generateRefreshToken expires in 7 days', () => {
  const token = generateRefreshToken(user);
  const decoded = jwt.decode(token);

  const now = Math.floor(Date.now() / 1000);
  const expectedExp = now + 7 * 24 * 60 * 60;
  assert.ok(Math.abs(decoded.exp - expectedExp) <= 5, `Expected exp ~${expectedExp}, got ${decoded.exp}`);
});

test('generateRefreshToken does not include email or role in payload', () => {
  const token = generateRefreshToken(user);
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  assert.equal(decoded.email, undefined);
  assert.equal(decoded.role, undefined);
});

test('generateTokens returns both tokens', () => {
  const tokens = generateTokens(user);

  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);
  assert.notEqual(tokens.accessToken, tokens.refreshToken);
});

test('generateTokens returns valid access token', () => {
  const tokens = generateTokens(user);
  const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);

  assert.equal(decoded.userId, user.id);
});

test('generateTokens returns valid refresh token', () => {
  const tokens = generateTokens(user);
  const decoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);

  assert.equal(decoded.userId, user.id);
});

test('generateToken (legacy) matches generateAccessToken', () => {
  const legacyToken = generateToken(user);
  const accessToken = generateAccessToken(user);

  const decodedLegacy = jwt.verify(legacyToken, process.env.JWT_SECRET);
  const decodedAccess = jwt.verify(accessToken, process.env.JWT_SECRET);

  assert.equal(decodedLegacy.userId, decodedAccess.userId);
  assert.equal(decodedLegacy.email, decodedAccess.email);
});

test('rejects token verified with wrong secret', () => {
  const token = generateAccessToken(user);

  assert.throws(() => {
    jwt.verify(token, 'wrong-secret');
  }, /invalid signature/);
});
