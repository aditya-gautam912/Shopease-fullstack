const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const errorHandler = require('../src/middleware/errorHandler');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

const buildRes = () => {
  const state = { statusCode: 200, body: null };
  return {
    status: (code) => {
      state.statusCode = code;
      return { json: (body) => { state.body = body; } };
    },
    _state: state,
  };
};

test('errorHandler returns 500 for generic error', () => {
  const res = buildRes();
  errorHandler(new Error('Something broke'), {}, res, () => {});
  assert.equal(res._state.statusCode, 500);
  assert.equal(res._state.body.success, false);
  assert.equal(res._state.body.message, 'Something broke');
});

test('errorHandler handles Sequelize UniqueConstraintError', () => {
  const res = buildRes();
  const err = new UniqueConstraintError({ fields: { email: 'test@test.com' } });
  errorHandler(err, {}, res, () => {});
  assert.equal(res._state.statusCode, 409);
  assert.match(res._state.body.message, /email/);
});

test('errorHandler handles Sequelize ValidationError', () => {
  const res = buildRes();
  const err = new ValidationError('Validation failed', [
    { message: 'Name is required' },
    { message: 'Email is invalid' },
  ]);
  errorHandler(err, {}, res, () => {});
  assert.equal(res._state.statusCode, 422);
  assert.ok(res._state.body.message.includes('Name is required'));
  assert.ok(res._state.body.message.includes('Email is invalid'));
});

test('errorHandler handles ForeignKeyConstraintError', () => {
  const res = buildRes();
  const err = new ForeignKeyConstraintError({});
  errorHandler(err, {}, res, () => {});
  assert.equal(res._state.statusCode, 404);
  assert.equal(res._state.body.message, 'Referenced resource not found');
});

test('errorHandler handles JsonWebTokenError', () => {
  const res = buildRes();
  const err = new Error('jwt malformed');
  err.name = 'JsonWebTokenError';
  errorHandler(err, {}, res, () => {});
  assert.equal(res._state.statusCode, 401);
  assert.equal(res._state.body.message, 'Invalid token');
});

test('errorHandler handles TokenExpiredError', () => {
  const res = buildRes();
  const err = new Error('jwt expired');
  err.name = 'TokenExpiredError';
  errorHandler(err, {}, res, () => {});
  assert.equal(res._state.statusCode, 401);
  assert.equal(res._state.body.message, 'Token has expired, please log in again');
});

test('errorHandler respects custom statusCode on error', () => {
  const res = buildRes();
  const err = new Error('Rate limited');
  err.statusCode = 429;
  errorHandler(err, {}, res, () => {});
  assert.equal(res._state.statusCode, 429);
  assert.equal(res._state.body.message, 'Rate limited');
});

test('errorHandler does not include stack in non-development mode', () => {
  const res = buildRes();
  errorHandler(new Error('secret'), {}, res, () => {});
  assert.equal(res._state.body.stack, undefined);
});
