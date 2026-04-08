/**
 * src/controllers/newsletterController.js
 * Newsletter subscription controller
 */

const Newsletter = require('../models/Newsletter');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');

// ── POST /api/newsletter/subscribe ────────────────────────
const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // Check if email already exists
  const existing = await Newsletter.findOne({ email: email.toLowerCase() });

  if (existing) {
    if (existing.active) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter',
      });
    } else {
      // Reactivate subscription
      existing.active = true;
      existing.subscribedAt = new Date();
      await existing.save();
      return res.json({
        success: true,
        message: 'Welcome back! Your subscription has been reactivated.',
      });
    }
  }

  // Create unsubscribe token
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

// ── POST /api/newsletter/unsubscribe/:token ───────────────
const unsubscribe = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const subscription = await Newsletter.findOne({ unsubscribeToken: token });

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

// ── GET /api/newsletter/admin/subscribers  (admin) ────────
const getAllSubscribers = asyncHandler(async (req, res) => {
  const { active, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (active !== undefined) {
    filter.active = active === 'true';
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [subscribers, total] = await Promise.all([
    Newsletter.find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('email active subscribedAt')
      .lean(),
    Newsletter.countDocuments(filter),
  ]);

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
