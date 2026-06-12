const { Return, Order, Product, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createReturn = asyncHandler(async (req, res) => {
  const { orderId, items, reason, description, images } = req.body;

  const order = await Order.findByPk(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.userId && order.userId !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Not authorized to return this order' });
  }

  if (order.status !== 'delivered') {
    return res.status(400).json({
      success: false,
      message: 'Only delivered orders can be returned',
    });
  }

  for (const item of items) {
    const orderItem = order.items.find((i) => i.productId === item.productId);
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

  let refundAmount = 0;
  for (const item of items) {
    const orderItem = order.items.find((i) => i.productId === item.productId);
    refundAmount += orderItem.price * item.qty;
  }

  const returnRequest = await Return.create({
    orderId,
    userId: req.user.userId,
    items,
    reason,
    description,
    images: images || [],
    refundAmount,
  });

  const populated = await Return.findByPk(returnRequest.id, {
    include: [{ model: Order, attributes: ['total', 'items'] }],
  });

  res.status(201).json({
    success: true,
    data: populated,
    message: 'Return request created successfully',
  });
});

const getMyReturns = asyncHandler(async (req, res) => {
  const returns = await Return.findAll({
    where: { userId: req.user.userId },
    include: [{ model: Order, attributes: ['total', 'items', 'createdAt'] }],
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, data: returns });
});

const getAllReturns = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) where.status = status;

  const { rows: returns, count: total } = await Return.findAndCountAll({
    where,
    include: [
      { model: User, attributes: ['name', 'email'] },
      { model: Order, attributes: ['total', 'items', 'createdAt'] },
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: limitNum,
  });

  res.json({
    success: true,
    data: { returns, pagination: { total, page: pageNum, limit: limitNum } },
  });
});

const approveReturn = asyncHandler(async (req, res) => {
  const { adminNotes } = req.body;

  const returnRequest = await Return.findByPk(req.params.id);
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

  for (const item of returnRequest.items) {
    await Product.increment('stock', { by: item.qty, where: { id: item.productId } });
  }

  const populated = await Return.findByPk(returnRequest.id, {
    include: [{ model: Order, attributes: ['total', 'items'] }],
  });

  res.json({
    success: true,
    data: populated,
    message: 'Return approved successfully. Product restocked.',
  });
});

const rejectReturn = asyncHandler(async (req, res) => {
  const { adminNotes } = req.body;

  const returnRequest = await Return.findByPk(req.params.id);
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

  const populated = await Return.findByPk(returnRequest.id, {
    include: [{ model: Order, attributes: ['total', 'items'] }],
  });

  res.json({ success: true, data: populated, message: 'Return rejected' });
});

const processRefund = asyncHandler(async (req, res) => {
  const returnRequest = await Return.findByPk(req.params.id, {
    include: [{ model: Order }],
  });

  if (!returnRequest) {
    return res.status(404).json({ success: false, message: 'Return request not found' });
  }

  if (returnRequest.status !== 'approved') {
    return res.status(400).json({
      success: false,
      message: 'Only approved returns can be refunded',
    });
  }

  const order = returnRequest.Order;

  if (!order.razorpayPaymentId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot refund: Order was not paid via Razorpay',
    });
  }

  try {
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(returnRequest.refundAmount * 100),
      speed: 'normal',
      notes: {
        returnId: returnRequest.id,
        orderId: order.id,
      },
    });

    returnRequest.status = 'refunded';
    returnRequest.razorpayRefundId = refund.id;
    returnRequest.refundMethod = 'razorpay';
    await returnRequest.save();

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
  createReturn, getMyReturns, getAllReturns,
  approveReturn, rejectReturn, processRefund,
};
