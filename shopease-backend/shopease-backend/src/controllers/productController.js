const { Op } = require('sequelize');
const { Product, ProductVariant, RecentlyViewed } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sequelize } = require('../config/db');

const ALLOWED_FIELDS = ['title', 'description', 'price', 'oldPrice', 'category', 'image',
  'images', 'ratingRate', 'ratingCount', 'stock', 'isActive'];

const pick = (obj, keys) => keys.reduce((acc, k) => (k in obj ? (acc[k] = obj[k]) : acc), {});

const getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, sort = 'default', page = 1, limit = 8, rating } = req.query;
  const where = { isActive: true };

  if (search && search.trim()) {
    const term = search.trim().replace(/'/g, "''");
    where[Op.and] = sequelize.literal(
      `to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", '')) @@ plainto_tsquery('english', '${term}')`,
    );
  }

  if (category && category !== 'all') {
    where.category = category.toLowerCase();
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = Number(minPrice);
    if (maxPrice) where.price[Op.lte] = Number(maxPrice);
  }

  if (rating) {
    where.ratingRate = { [Op.gte]: Number(rating) };
  }

  const sortMap = {
    'price-asc': [['price', 'ASC']],
    'price-desc': [['price', 'DESC']],
    'rating': [['ratingRate', 'DESC']],
    'newest': [['createdAt', 'DESC']],
    'default': [['createdAt', 'DESC']],
  };
  const order = sortMap[sort] || sortMap.default;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const { rows: products, count: total } = await Product.findAndCountAll({
    where,
    order,
    offset,
    limit: limitNum,
    raw: true,
  });

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
      },
    },
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [{ model: ProductVariant, as: 'variants' }],
  });

  if (!product || !product.isActive) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const productJson = product.toJSON();

  if (req.user && req.user.userId) {
    try {
      const rv = await RecentlyViewed.findOne({
        where: { userId: req.user.userId, productId: productJson.id },
      });
      if (!rv) {
        await RecentlyViewed.create({ userId: req.user.userId, productId: productJson.id });
      } else {
        await rv.touch();
      }

      const count = await RecentlyViewed.count({ where: { userId: req.user.userId } });
      if (count > 20) {
        const oldest = await RecentlyViewed.findAll({
          where: { userId: req.user.userId },
          order: [['updatedAt', 'ASC']],
          limit: count - 20,
        });
        await RecentlyViewed.destroy({ where: { id: oldest.map(o => o.id) } });
      }
    } catch (err) {
      console.error('Failed to track recently viewed:', err.message, err.stack);
    }
  }

  const related = await Product.findAll({
    where: { category: productJson.category, id: { [Op.ne]: productJson.id }, isActive: true },
    limit: 4,
  });

  res.json({
    success: true,
    data: {
      product: productJson,
      related: related.map((p) => p.toJSON()),
    },
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const data = pick(req.body, ALLOWED_FIELDS);
  const product = await Product.create(data);
  res.status(201).json({ success: true, data: product.toJSON() });
});

const updateProduct = asyncHandler(async (req, res) => {
  const data = pick(req.body, ALLOWED_FIELDS);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields to update' });
  }
  const [affected] = await Product.update(data, { where: { id: req.params.id } });
  if (!affected) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const product = await Product.findByPk(req.params.id);
  res.json({ success: true, data: product.toJSON() });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const [affected] = await Product.update({ isActive: false }, { where: { id: req.params.id } });
  if (!affected) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, message: 'Product deleted successfully' });
});

const getProductVariants = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    attributes: ['id', 'isActive'],
    include: [{ model: ProductVariant, as: 'variants' }],
  });

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
