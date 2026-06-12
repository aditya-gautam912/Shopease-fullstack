const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-auth-middleware-secret';

const authMiddleware = require('../src/middleware/authMiddleware');

const buildRes = () => {
  const state = { statusCode: null, body: null };
  return {
    status: (code) => {
      state.statusCode = code;
      return { json: (body) => { state.body = body; } };
    },
    _state: state,
  };
};

test('authMiddleware passes valid token and attaches user', async () => {
  const token = jwt.sign(
    { userId: '507f1f77bcf86cd799439011', email: 'user@test.com', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = buildRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await authMiddleware(req, res, next);

  assert.equal(nextCalled, true);
  assert.equal(req.user.userId, '507f1f77bcf86cd799439011');
  assert.equal(req.user.email, 'user@test.com');
  assert.equal(req.user.role, 'user');
});

test('authMiddleware rejects missing Authorization header', async () => {
  const req = { headers: {} };
  const res = buildRes();

  await authMiddleware(req, res, () => { assert.fail('next should not be called'); });

  assert.equal(res._state.statusCode, 401);
  assert.match(res._state.body.message, /no token/);
});

test('authMiddleware rejects malformed Authorization header', async () => {
  const req = { headers: { authorization: 'NotBearer token123' } };
  const res = buildRes();

  await authMiddleware(req, res, () => { assert.fail('next should not be called'); });

  assert.equal(res._state.statusCode, 401);
});

test('authMiddleware rejects invalid token', async () => {
  const req = { headers: { authorization: 'Bearer invalid-token-here' } };
  const res = buildRes();

  await authMiddleware(req, res, () => { assert.fail('next should not be called'); });

  assert.equal(res._state.statusCode, 401);
  assert.match(res._state.body.message, /invalid/);
});

test('authMiddleware rejects expired token', async () => {
  const token = jwt.sign(
    { userId: '507f1f77bcf86cd799439011', email: 'user@test.com', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '0s' },
  );

  // Wait for token to expire
  await new Promise(r => setTimeout(r, 100));

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = buildRes();

  await authMiddleware(req, res, () => { assert.fail('next should not be called'); });

  assert.equal(res._state.statusCode, 401);
});

test('authMiddleware rejects token signed with wrong secret', async () => {
  const token = jwt.sign(
    { userId: '507f1f77bcf86cd799439011' },
    'wrong-secret',
    { expiresIn: '15m' },
  );

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = buildRes();

  await authMiddleware(req, res, () => { assert.fail('next should not be called'); });

  assert.equal(res._state.statusCode, 401);
});
