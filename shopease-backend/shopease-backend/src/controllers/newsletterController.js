const { Newsletter } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');

const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const existing = await Newsletter.findOne({ where: { email: email.toLowerCase() } });

  if (existing) {
    if (existing.active) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter',
      });
    }
    existing.active = true;
    existing.subscribedAt = new Date();
    await existing.save();
    return res.json({
      success: true,
      message: 'Welcome back! Your subscription has been reactivated.',
    });
  }

  const unsubscribeToken = crypto.randomBytes(32).toString('hex');

  const newsletter = await Newsletter.create({
    email: email.toLowerCase(),
    unsubscribeToken,
  });

  res.status(201).json({
    success: true,
    message: 'Successfully subscribed to newsletter!',
    data: { email: newsletter.email },
  });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const subscription = await Newsletter.findOne({ where: { unsubscribeToken: token } });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Invalid unsubscribe link',
    });
  }

  subscription.active = false;
  await subscription.save();

  res.json({
    success: true,
    message: 'Successfully unsubscribed from newsletter',
  });
});

const getAllSubscribers = asyncHandler(async (req, res) => {
  const { active, page = 1, limit = 50 } = req.query;

  const where = {};
  if (active !== undefined) {
    where.active = active === 'true';
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const { rows: subscribers, count: total } = await Newsletter.findAndCountAll({
    where,
    order: [['subscribedAt', 'DESC']],
    offset,
    limit: limitNum,
    attributes: ['email', 'active', 'subscribedAt'],
  });

  res.json({
    success: true,
    data: {
      subscribers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

module.exports = {
  subscribe,
  unsubscribe,
  getAllSubscribers,
};
