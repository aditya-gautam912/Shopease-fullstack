/**
 * src/routes/productRoutes.js
 * Public endpoints for browsing products.
 * Write operations (create, update, delete) are admin-only.
 */

const express  = require('express');
const { body, param, query } = require('express-validator');

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const { getLowStockProducts, LOW_STOCK_THRESHOLD } = require('../services/inventoryService');

const authMiddleware  = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validate        = require('../middleware/validate');
const upload          = require('../middleware/upload');

const router = express.Router();

// ── Validation chain for create / update ──────────────────
const productValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Product title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters')
    .escape(),

  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required')
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('price')
    .isFloat({ min: 0, max: 10000000 }).withMessage('Price must be between 0 and 10,000,000'),

  body('oldPrice')
    .optional()
    .isFloat({ min: 0, max: 10000000 }).withMessage('Old price must be between 0 and 10,000,000'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(['electronics', 'fashion', 'home', 'sports', 'beauty'])
    .withMessage('Invalid category'),

  body('image')
    .trim()
    .notEmpty().withMessage('Image URL is required')
    .isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Invalid image URL')
    .custom((value) => {
      // Allow local uploads
      if (value.startsWith('/uploads/')) return true;
      return true;
    }),

  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('Maximum 10 images allowed'),

  body('images.*')
    .optional()
    .isURL().withMessage('Each image must be a valid URL'),

  body('stock')
    .optional()
    .isInt({ min: 0, max: 99999 }).withMessage('Stock must be between 0 and 99,999'),

  body('tags')
    .optional()
    .isArray({ max: 20 }).withMessage('Maximum 20 tags allowed'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Each tag cannot exceed 50 characters')
    .escape(),
];

// ── Image upload (admin only) ────────────────────────────────
// POST /api/products/upload-image  multipart/form-data field: image
router.post(
  '/upload-image',
  authMiddleware, adminMiddleware,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: { url: imageUrl }
    });
  }
);

// ── Public routes ──────────────────────────────────────────
router.get(
  '/',
  [
    query('category')
      .optional()
      .isIn(['electronics', 'fashion', 'home', 'sports', 'beauty', ''])
      .withMessage('Invalid category'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Invalid minimum price'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Invalid maximum price'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search query too long')
      .escape(),
  ],
  validate,
  getProducts
);

router.get(
  '/:id',
  [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
  ],
  validate,
  optionalAuthMiddleware,
  getProductById
);

// ── Admin-only routes ──────────────────────────────────────

// GET /api/products/inventory/low-stock - Get products with low stock
router.get(
  '/inventory/low-stock',
  authMiddleware, adminMiddleware,
  async (req, res, next) => {
    try {
      const threshold = parseInt(req.query.threshold) || LOW_STOCK_THRESHOLD;
      const result = await getLowStockProducts(threshold);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  authMiddleware, adminMiddleware,
  productValidation, validate,
  createProduct
);

router.put(
  '/:id',
  authMiddleware, adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
  ],
  productValidation.map((v) => v.optional()), // all fields optional on update
  validate,
  updateProduct
);

router.delete(
  '/:id',
  authMiddleware, adminMiddleware,
  [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
  ],
  validate,
  deleteProduct
);

module.exports = router;