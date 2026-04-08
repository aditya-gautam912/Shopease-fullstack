/**
 * src/middleware/validate.js
 * Reads the results of express-validator checks and short-circuits
 * the request with a 422 response if any field failed validation.
 * Always place this after the validationChain array in a route.
 */

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the first error per field for a clean UI experience
    const formatted = {};
    errors.array({ onlyFirstError: true }).forEach((err) => {
      formatted[err.path] = err.msg;
    });
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: formatted,
    });
  }
  next();
};

module.exports = validate;