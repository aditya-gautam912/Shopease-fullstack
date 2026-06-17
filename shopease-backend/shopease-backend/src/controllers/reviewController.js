const { Review, Product, User, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const recalcProductRating = async (productId) => {
  const result = await Review.findOne({
    where: { productId, isVisible: true },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'ratingRate'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'ratingCount'],
    ],
    raw: true,
  });
  await Product.update(
    {
      ratingRate: result ? parseFloat(result.ratingRate || 0).toFixed(1) : 0,
      ratingCount: result ? parseInt(result.ratingCount || 0, 10) : 0,
    },
    { where: { id: productId } },
  );
};

const getReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(20, parseInt(req.query.limit || '10', 10));
  const offset = (page - 1) * limit;

  const where = { productId, isVisible: true };

  const { rows: reviews, count: total } = await Review.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit,
    attributes: ['id', 'userName', 'rating', 'title', 'body', 'createdAt', 'userId'],
  });

  const [breakdown] = await sequelize.query(`
    SELECT rating, COUNT(*)::int AS count
    FROM reviews
    WHERE product_id = :productId AND is_visible = true
    GROUP BY rating
    ORDER BY rating DESC
  `, { replacements: { productId } });

  res.json({
    success: true,
    data: {
      reviews,
      breakdown,
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
});

const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, body } = req.body;

  const product = await Product.findByPk(productId);
  if (!product || !product.isActive) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const existing = await Review.findOne({ where: { productId, userId: req.user.userId } });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'You have already reviewed this product. Edit your existing review instead.',
    });
  }

  const review = await Review.create({
    productId,
    userId: req.user.userId,
    userName: req.user.email.split('@')[0],
    rating: Number(rating),
    title: title || '',
    body,
  });

  const user = await User.findByPk(req.user.userId, { attributes: ['name'], raw: true });
  if (user) {
    review.userName = user.name;
    await review.save();
  }

  await recalcProductRating(productId);

  res.status(201).json({ success: true, data: review });
});

const updateReview = asyncHandler(async (req, res) => {
  const { productId, id } = req.params;
  const { rating, title, body } = req.body;

  const review = await Review.findOne({ where: { id, productId } });
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  if (review.userId !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'You can only edit your own reviews' });
  }

  if (rating !== undefined) review.rating = Number(rating);
  if (title !== undefined) review.title = title;
  if (body !== undefined) review.body = body;

  await review.save();
  await recalcProductRating(review.productId);

  res.json({ success: true, data: review });
});

const deleteReview = asyncHandler(async (req, res) => {
  const { productId, id } = req.params;

  const review = await Review.findOne({ where: { id, productId } });
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  const isOwner = review.userId === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorised to delete this review' });
  }

  await review.destroy();
  await recalcProductRating(productId);

  res.json({ success: true, message: 'Review deleted' });
});

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.findAll({
    where: { userId: req.user.userId },
    include: [{ model: Product, attributes: ['id', 'title', 'image', 'price'] }],
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, data: reviews });
});

const toggleVisibility = asyncHandler(async (req, res) => {
  const review = await Review.findByPk(req.params.id);
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  review.isVisible = !review.isVisible;
  await review.save();
  await recalcProductRating(review.productId);

  res.json({
    success: true,
    data: review,
    message: `Review ${review.isVisible ? 'shown' : 'hidden'}`,
  });
});

module.exports = {
  getReviews, createReview, updateReview,
  deleteReview, getMyReviews, toggleVisibility,
};
