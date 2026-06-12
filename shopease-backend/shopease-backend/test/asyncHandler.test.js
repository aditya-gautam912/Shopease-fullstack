const test = require('node:test');
const assert = require('node:assert/strict');

const asyncHandler = require('../src/utils/asyncHandler');

test('asyncHandler passes successful response through', async () => {
  const handler = asyncHandler(async (_req, res) => {
    res.json({ success: true });
  });

  let called = false;
  const req = {};
  const res = { json: (data) => { called = true; assert.deepEqual(data, { success: true }); } };
  const next = (err) => { throw new Error('next should not be called: ' + err); };

  await handler(req, res, next);
  assert.equal(called, true);
});

test('asyncHandler catches thrown error and forwards to next', async () => {
  const handler = asyncHandler(async () => {
    throw new Error('test error');
  });

  let nextCalled = false;
  const req = {};
  const res = {};
  const next = (err) => {
    nextCalled = true;
    assert.equal(err.message, 'test error');
  };

  await handler(req, res, next);
  assert.equal(nextCalled, true);
});

test('asyncHandler catches rejected promise and forwards to next', async () => {
  const handler = asyncHandler(() => {
    return Promise.reject(new Error('async error'));
  });

  let nextCalled = false;
  const req = {};
  const res = {};
  const next = (err) => {
    nextCalled = true;
    assert.equal(err.message, 'async error');
  };

  handler(req, res, next);
  // Wait a microtask for .catch() to fire
  await Promise.resolve();
  assert.equal(nextCalled, true);
});

test('asyncHandler passes non-Error thrown values through next', async () => {
  const handler = asyncHandler(async () => {
    throw 'string error'; // eslint-disable-line no-throw-literal
  });

  let nextCalled = false;
  const req = {};
  const res = {};
  const next = (err) => {
    nextCalled = true;
    assert.equal(err, 'string error');
  };

  await handler(req, res, next);
  assert.equal(nextCalled, true);
});
