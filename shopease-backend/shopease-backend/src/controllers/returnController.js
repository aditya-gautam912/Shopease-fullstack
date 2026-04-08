/**
 * src/controllers/returnController.js
 * Handles product returns and refunds with Razorpay integration.
 */

const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/returns  (auth) ─────────────────────────────
// Create a return request
const createReturn = asyncHandler(async (req, res) => {
  const { orderId, items, reason, description, images } = req.body;

  // Validate order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.userId && order.userId.toString() !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Not authorized to return this order' });
  }

  // Check if order is eligible for return (delivered status)
  if (order.status !== 'delivered') {
    return res.status(400).json({
      success: false,
      message: 'Only delivered orders can be returned',
    });
  }

  // Validate items exist in the order
  for (const item of items) {
    const orderItem = order.items.find(
      (i) => i.productId.toString() === item.productId
    );
    if (!orderItem) {
      return res.status(400).json({
        success: false,
        message: `Product ${item.productId} not found in order`,
      });
    }
    if (item.qty > orderItem.qty) {
      return res.status(400).json({
        success: false,
        message: `Return quantity exceeds order quantity for product ${item.productId}`,
      });
    }
  }

  // Calculate refund amount
  let refundAmount = 0;
  for (const item of items) {
    const orderItem = order.items.find(
      (i) => i.productId.toString() === item.productId
    );
    refundAmount += orderItem.price * item.qty;
  }

  // Create return
  const returnRequest = await Return.create({
    orderId,
    userId: req.user.userId,
    items,
    reason,
    description,
    images: images || [],
    refundAmount,
  });

  await returnRequest.populate('orderId', 'total items');

  res.status(201).json({
    success: true,
    data: returnRequest,
    message: 'Return request created successfully',
  });
});

// ── GET /api/returns/my  (auth) ───────────────────────────
// Get user's return requests
const getMyReturns = asyncHandler(async (req, res) => {
  const returns = await Return.find({ userId: req.user.userId })
    .populate('orderId', 'total items createdAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: returns });
});

// ── GET /api/admin/returns  (admin) ───────────────────────
// Get all return requests with filtering
const getAllReturns = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status) filter.status = status;

  const [returns, total] = await Promise.all([
    Return.find(filter)
      .populate('userId', 'name email')
      .populate('orderId', 'total items createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Return.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      returns,
      pagination: { total, page: pageNum, limit: limitNum },
    },
  });
});

// ── PUT /api/admin/returns/:id/approve  (admin) ───────────
// Approve a return request
const approveReturn = asyncHandler(async (req, res) => {
  const { adminNotes } = req.body;

  const returnRequest = await Return.findById(req.params.id);
  if (!returnRequest) {
    return res.status(404).json({ success: false, message: 'Return request not found' });
  }

  if (returnRequest.status !== 'requested') {
    return res.status(400).json({
      success: false,
      message: 'Only requested returns can be approved',
    });
  }

  returnRequest.status = 'approved';
  returnRequest.adminNotes = adminNotes || '';
  await returnRequest.save();

  // Restock products
  await Order.findById(returnRequest.orderId);
  for (const item of returnRequest.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.qty },
    });
  }

  await returnRequest.populate('orderId', 'total items');

  res.json({
    success: true,
    data: returnRequest,
    message: 'Return approved successfully. Product restocked.',
  });
});

// ── PUT /api/admin/returns/:id/reject  (admin) ────────────
// Reject a return request
const rejectReturn = asyncHandler(async (req, res) => {
  const { adminNotes } = req.body;

  const returnRequest = await Return.findById(req.params.id);
  if (!returnRequest) {
    return res.status(404).json({ success: false, message: 'Return request not found' });
  }

  if (returnRequest.status !== 'requested') {
    return res.status(400).json({
      success: false,
      message: 'Only requested returns can be rejected',
    });
  }

  returnRequest.status = 'rejected';
  returnRequest.adminNotes = adminNotes || '';
  await returnRequest.save();

  await returnRequest.populate('orderId', 'total items');

  res.json({
    success: true,
    data: returnRequest,
    message: 'Return rejected',
  });
});

// ── PUT /api/admin/returns/:id/refund  (admin) ────────────
// Process refund via Razorpay
const processRefund = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findById(req.params.id).populate('orderId');
  
  if (!returnRequest) {
    return res.status(404).json({ success: false, message: 'Return request not found' });
  }

  if (returnRequest.status !== 'approved') {
    return res.status(400).json({
      success: false,
      message: 'Only approved returns can be refunded',
    });
  }

  const order = returnRequest.orderId;

  // Check if order was paid via Razorpay
  if (!order.razorpayPaymentId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot refund: Order was not paid via Razorpay',
    });
  }

  try {
    // Process refund via Razorpay
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(returnRequest.refundAmount * 100), // Convert to paise
      speed: 'normal',
      notes: {
        returnId: returnRequest._id.toString(),
        orderId: order._id.toString(),
      },
    });

    // Update return with refund details
    returnRequest.status = 'refunded';
    returnRequest.razorpayRefundId = refund.id;
    returnRequest.refundMethod = 'razorpay';
    await returnRequest.save();

    // Update order payment status if full refund
    if (returnRequest.refundAmount >= order.total) {
      order.paymentStatus = 'refunded';
      await order.save();
    }

    res.json({
      success: true,
      data: returnRequest,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Razorpay refund error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process refund: ' + error.message,
    });
  }
});

module.exports = {
  createReturn,
  getMyReturns,
  getAllReturns,
  approveReturn,
  rejectReturn,
  processRefund,
};
