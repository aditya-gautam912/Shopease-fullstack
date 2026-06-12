const { Order, Product, ProductVariant, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');
const { sendOrderConfirmation, sendShippingUpdate, sendPaymentReceipt } = require('../services/emailService');
const { validateStock, decrementStock, restoreStock } = require('../services/inventoryService');
const { generateInvoice } = require('../services/invoiceService');

const Razorpay = (() => {
  try { return require('razorpay'); } catch { return null; }
})();

const razorpay = (Razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

const SHIPPING_THRESHOLD = 8400;
const SHIPPING_COST = 849;

const createOrder = asyncHandler(async (req, res) => {
  const {
    items, shippingAddress, paymentMethod,
    coupon = null, discount = 0,
    razorpayOrderId = null, razorpayPaymentId = null, razorpaySignature = null,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  if (paymentMethod !== 'cod' && razorpayOrderId && razorpayPaymentId) {
    if (process.env.RAZORPAY_KEY_SECRET && razorpaySignature) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expected !== razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
    }
  }

  const stockValidation = await validateStock(items);
  if (!stockValidation.valid) {
    return res.status(400).json({
      success: false,
      message: stockValidation.errors[0],
      errors: stockValidation.errors,
    });
  }

  const orderItems = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
    }

    let itemPrice = product.price;
    let variantDetails = null;

    if (item.variantId) {
      const variant = await ProductVariant.findOne({ where: { id: item.variantId, productId: product.id } });
      if (variant) {
        itemPrice = variant.price;
        variantDetails = { variantId: variant.id, sku: variant.sku, size: variant.size, color: variant.color };
      }
    }

    orderItems.push({
      productId: product.id,
      title: product.title,
      image: product.image,
      price: itemPrice,
      qty: item.qty,
      ...(variantDetails && variantDetails),
    });
  }

  const subtotal = orderItems.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);
  const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
  const shipping = subtotal - discountAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = parseFloat((subtotal - discountAmount + shipping).toFixed(2));

  const paymentStatus = (paymentMethod === 'cod') ? 'pending' : 'paid';

  const stockDecrement = await decrementStock(items);
  if (!stockDecrement.success) {
    return res.status(400).json({
      success: false,
      message: 'Failed to reserve inventory. Please try again.',
      errors: stockDecrement.errors,
    });
  }

  let order;
  try {
    order = await Order.create({
      userId: req.user.userId,
      items: orderItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: discountAmount,
      shipping,
      total,
      coupon,
      paymentMethod,
      paymentStatus,
      shippingAddress,
      razorpayOrderId,
      razorpayPaymentId,
    });
  } catch (err) {
    await restoreStock(items);
    throw err;
  }

  const orderForEmail = {
    ...order.toJSON(),
    items: order.items.map((item) => ({
      product: { title: item.title },
      qty: item.qty,
      price: item.price,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shippingCost: order.shipping,
    totalAmount: order.total,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    _id: order.id,
  };

  const user = { name: req.user.name || 'Customer', email: req.user.email };

  sendOrderConfirmation(orderForEmail, user).catch((err) => {
    console.error('Failed to send order confirmation email:', err);
  });

  if (paymentMethod !== 'cod' && paymentStatus === 'paid') {
    const paymentDetails = { transactionId: razorpayOrderId, paymentId: razorpayPaymentId };
    sendPaymentReceipt(orderForEmail, user, paymentDetails).catch((err) => {
      console.error('Failed to send payment receipt email:', err);
    });
  }

  res.status(201).json({ success: true, data: order });
});

const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({
      success: false,
      message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
    });
  }

  const { items, discount = 0 } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const productDocs = await Promise.all(
    items.map((i) => Product.findByPk(i.productId)),
  );

  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    const product = productDocs[i];
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'A product is no longer available' });
    }
    subtotal += parseFloat(product.price) * items[i].qty;
  }

  const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
  const shipping = subtotal - discountAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = parseFloat((subtotal - discountAmount + shipping).toFixed(2));
  const amountPaise = Math.round(total * 100);

  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { userId: req.user?.userId || 'guest' },
  });

  res.json({
    success: true,
    data: {
      razorpayOrderId: rzpOrder.id,
      amount: total,
      amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  });
});

const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.status !== 'cancelled') {
    const stockRestore = await restoreStock(order.items);
    if (!stockRestore.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to restore stock for this order',
        errors: stockRestore.errors,
      });
    }
  }

  await order.destroy();
  res.json({ success: true, message: 'Order deleted successfully' });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.userId },
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, data: orders });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const { rows: orders, count: total } = await Order.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit: limitNum,
    include: [{ model: User, attributes: ['name', 'email'] }],
  });

  res.json({
    success: true,
    data: { orders, pagination: { total, page: pageNum, limit: limitNum } },
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  const currentOrder = await Order.findByPk(req.params.id);
  if (!currentOrder) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const previousStatus = currentOrder.status;

  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    const stockRestore = await restoreStock(currentOrder.items);
    if (!stockRestore.success) {
      console.error('Failed to restore stock on cancellation:', stockRestore.errors);
    }
  }

  const updateData = { status };
  if (trackingNumber) {
    updateData.trackingNumber = trackingNumber;
  }

  await Order.update(updateData, { where: { id: req.params.id } });
  const order = await Order.findByPk(req.params.id, {
    include: [{ model: User, attributes: ['name', 'email'] }],
  });

  if (status === 'shipped' || status === 'delivered') {
    const user = {
      name: order.User?.name || 'Customer',
      email: order.User?.email || order.guestEmail,
    };
    if (user.email) {
      const orderForEmail = { ...order.toJSON(), _id: order.id };
      sendShippingUpdate(orderForEmail, user, trackingNumber).catch((err) => {
        console.error('Failed to send shipping update email:', err);
      });
    }
  }

  res.json({
    success: true,
    data: order,
    stockRestored: status === 'cancelled' && previousStatus !== 'cancelled',
  });
});

const createGuestOrder = asyncHandler(async (req, res) => {
  const {
    items, shippingAddress, paymentMethod,
    coupon = null, discount = 0,
    razorpayOrderId = null, razorpayPaymentId = null, razorpaySignature = null,
    guestEmail, guestName, guestPhone,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  if (!guestEmail || !guestName || !guestPhone) {
    return res.status(400).json({
      success: false,
      message: 'Guest email, name, and phone are required',
    });
  }

  if (paymentMethod !== 'cod' && razorpayOrderId && razorpayPaymentId) {
    if (process.env.RAZORPAY_KEY_SECRET && razorpaySignature) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expected !== razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
    }
  }

  const stockValidation = await validateStock(items);
  if (!stockValidation.valid) {
    return res.status(400).json({
      success: false,
      message: stockValidation.errors[0],
      errors: stockValidation.errors,
    });
  }

  const orderItems = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
    }
    orderItems.push({
      productId: product.id,
      title: product.title,
      image: product.image,
      price: product.price,
      qty: item.qty,
    });
  }

  const subtotal = orderItems.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);
  const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
  const shipping = subtotal - discountAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = parseFloat((subtotal - discountAmount + shipping).toFixed(2));

  const paymentStatus = (paymentMethod === 'cod') ? 'pending' : 'paid';

  const stockDecrement = await decrementStock(items);
  if (!stockDecrement.success) {
    return res.status(400).json({
      success: false,
      message: 'Failed to reserve inventory. Please try again.',
      errors: stockDecrement.errors,
    });
  }

  const trackingToken = crypto.randomBytes(32).toString('hex');

  let order;
  try {
    order = await Order.create({
      guestEmail, guestName, guestPhone,
      trackingToken,
      items: orderItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: discountAmount,
      shipping,
      total,
      coupon,
      paymentMethod,
      paymentStatus,
      shippingAddress,
      razorpayOrderId,
      razorpayPaymentId,
    });
  } catch (err) {
    await restoreStock(items);
    throw err;
  }

  try {
    const emailService = require('../services/emailService');
    const itemsList = orderItems
      .map((item) => `<li>${item.title} x ${item.qty} - ₹${(item.price * item.qty).toFixed(2)}</li>`)
      .join('');

    await emailService.sendEmail({
      to: guestEmail,
      subject: `Order Confirmation - #${order.id.slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Confirmation</h2>
          <p>Dear ${guestName},</p>
          <p>Thank you for your order! Your order has been confirmed.</p>
          <h3>Order Details</h3>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <h3>Items</h3>
          <ul>${itemsList}</ul>
          <p><strong>Subtotal:</strong> ₹${subtotal.toFixed(2)}</p>
          ${discountAmount > 0 ? `<p><strong>Discount:</strong> -₹${discountAmount.toFixed(2)}</p>` : ''}
          <p><strong>Shipping:</strong> ${shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</p>
          <p><strong>Total:</strong> ₹${total.toFixed(2)}</p>
          <h3>Shipping Address</h3>
          <p>${shippingAddress.street}<br>${shippingAddress.city}, ${shippingAddress.state || ''} ${shippingAddress.zip}<br>${shippingAddress.country || 'US'}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
          <p>Track your order using this link: <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/track-order/${trackingToken}">Track Order</a></p>
          <p>Or enter your email on the tracking page.</p>
          <p>Thank you for shopping with ShopEase!</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError);
  }

  res.status(201).json({ success: true, data: order, trackingToken });
});

const trackGuestOrder = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const order = await Order.findOne({ where: { trackingToken: token } });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  res.json({ success: true, data: order });
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByPk(id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const isOwner = order.userId && order.userId === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  let user = null;
  if (order.userId) {
    user = await User.findByPk(order.userId, { attributes: ['name', 'email'] });
  }

  const pdfBuffer = await generateInvoice(order, user);

  const invoiceNumber = order.id.slice(-8).toUpperCase();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="ShopEase-Invoice-${invoiceNumber}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
});

const downloadGuestInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ where: { trackingToken: req.params.token } });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const pdfBuffer = await generateInvoice(order, null);

  const invoiceNumber = order.id.slice(-8).toUpperCase();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="ShopEase-Invoice-${invoiceNumber}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
});

module.exports = {
  createOrder, createRazorpayOrder, deleteOrder,
  getMyOrders, getAllOrders, updateOrderStatus,
  createGuestOrder, trackGuestOrder,
  downloadInvoice, downloadGuestInvoice,
};
