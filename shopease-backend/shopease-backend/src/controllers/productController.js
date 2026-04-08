/**
 * src/controllers/productController.js
 * Full CRUD for products plus a rich GET /api/products endpoint
 * that supports search, category filter, price range, sort, and pagination.
 */

const Product      = require('../models/Product');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// ── GET /api/products ──────────────────────────────────────
// Query params: search, category, minPrice, maxPrice, sort, page, limit, rating
const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    sort     = 'default',
    page     = 1,
    limit    = 8,
    rating,
  } = req.query;

  const filter = { isActive: true };

  // ── Text search ──────────────────────────────────────────
  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  // ── Category filter ──────────────────────────────────────
  if (category && category !== 'all') {
    filter.category = category.toLowerCase();
  }

  // ── Price range ──────────────────────────────────────────
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // ── Rating filter ─────────────────────────────────────────
  if (rating) {
    filter['rating.rate'] = { $gte: Number(rating) };
  }

  // ── Sort options ─────────────────────────────────────────
  const sortMap = {
    'price-asc':  { price: 1 },
    'price-desc': { price: -1 },
    'rating':     { 'rating.rate': -1 },
    'newest':     { createdAt: -1 },
    'default':    { createdAt: -1 },
  };
  const sortOption = sortMap[sort] || sortMap['default'];

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore:    pageNum * limitNum < total,
      },
    },
  });
});

// ── GET /api/products/:id ──────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

  if (!product || !product.isActive) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Track viewed product for authenticated users (non-blocking)
  if (req.user && req.user.userId) {
    User.findByIdAndUpdate(
      req.user.userId,
      {
        $addToSet: { recentlyViewed: product._id },
        $push: {
          recentlyViewed: {
            $each: [],
            $slice: -20
          }
        }
      },
      { new: true }
    ).exec().catch(err => console.error('Error updating recently viewed:', err));
  }

  // Fetch related products (same category, excluding this one)
  const related = await Product
    .find({ category: product.category, _id: { $ne: product._id }, isActive: true })
    .limit(4)
    .lean();

  res.json({ success: true, data: { product, related } });
});

// ── POST /api/products  (admin) ────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// ── PUT /api/products/:id  (admin) ────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, data: product });
});

// ── DELETE /api/products/:id  (admin) ─────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  // Soft delete — keeps data integrity for existing orders
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, message: 'Product deleted successfully' });
});

// ── GET /api/products/:id/variants ────────────────────────
const getProductVariants = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('variants').lean();

  if (!product || !product.isActive) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, data: product.variants || [] });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductVariants,
};