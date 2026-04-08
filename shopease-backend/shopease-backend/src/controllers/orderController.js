/**
 * src/controllers/orderController.js
 * Handles order creation and management.
 * Payment gateway: Razorpay (India-friendly — UPI, Cards, NetBanking, Wallets).
 */

const Order        = require('../models/Order');
const Product      = require('../models/Product');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const crypto       = require('crypto');
const { sendOrderConfirmation, sendShippingUpdate, sendPaymentReceipt } = require('../services/emailService');
const { validateStock, decrementStock, restoreStock } = require('../services/inventoryService');
const { generateInvoice } = require('../services/invoiceService');

// Razorpay is optional — only initialise if keys are set
const Razorpay = (() => {
  try { return require('razorpay'); } catch { return null; }
})();

const razorpay = (Razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// Prices are stored natively in INR
const SHIPPING_THRESHOLD = 8400;  // free shipping above ₹8,400 (≈ $100)
const SHIPPING_COST      = 849;   // ₹849 shipping fee (≈ $9.99)

// ── POST /api/orders  (auth) ───────────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    coupon               = null,
    discount             = 0,
    razorpayOrderId      = null,
    razorpayPaymentId    = null,
    razorpaySignature    = null,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  // ── Verify Razorpay signature for online payments ────────
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

  // ── Validate stock availability ──────────────────────────
  const stockValidation = await validateStock(items);
  if (!stockValidation.valid) {
    return res.status(400).json({
      success: false,
      message: stockValidation.errors[0],
      errors: stockValidation.errors,
    });
  }

  // ── Build order items with server-side prices ────────────
  const orderItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    let itemPrice = product.price;
    let variantDetails = null;

    // Check if variant is selected
    if (item.variantId && product.variants && product.variants.length > 0) {
      const variant = product.variants.id(item.variantId);
      if (variant) {
        itemPrice = variant.price;
        variantDetails = {
          variantId: variant._id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
        };
      }
    }

    orderItems.push({
      productId: product._id,
      title:     product.title,
      image:     product.image,
      price:     itemPrice,
      qty:       item.qty,
      ...(variantDetails && variantDetails),
    });
  }

  // ── Calculate totals server-side ─────────────────────────
  const subtotal       = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
  const shipping       = subtotal - discountAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total          = parseFloat((subtotal - discountAmount + shipping).toFixed(2));

  const paymentStatus = (paymentMethod === 'cod') ? 'pending' : 'paid';

  // ── Atomically decrement stock ───────────────────────────
  const stockDecrement = await decrementStock(items);
  if (!stockDecrement.success) {
    return res.status(400).json({
      success: false,
      message: 'Failed to reserve inventory. Please try again.',
      errors: stockDecrement.errors,
    });
  }

  // ── Create order ─────────────────────────────────────────
  let order;
  try {
    order = await Order.create({
      userId:            req.user.userId,
      items:             orderItems,
      subtotal:          parseFloat(subtotal.toFixed(2)),
      discount:          discountAmount,
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
    // If order creation fails, restore the stock
    await restoreStock(items);
    throw err;
  }

  // ── Send order confirmation email ────────────────────────
  const populatedOrder = await Order.findById(order._id).populate('items.productId', 'title').lean();
  const orderWithProducts = {
    ...populatedOrder,
    items: populatedOrder.items.map((item) => ({
      product: { title: item.title },
      qty: item.qty,
      price: item.price,
    })),
    subtotal: populatedOrder.subtotal,
    discount: populatedOrder.discount,
    shippingCost: populatedOrder.shipping,
    totalAmount: populatedOrder.total,
    shippingAddress: populatedOrder.shippingAddress,
    paymentMethod: populatedOrder.paymentMethod,
    createdAt: populatedOrder.createdAt,
    _id: populatedOrder._id,
  };

  const user = {
    name: req.user.name || 'Customer',
    email: req.user.email,
  };

  sendOrderConfirmation(orderWithProducts, user).catch((err) => {
    console.error('Failed to send order confirmation email:', err);
  });

  // ── Send payment receipt for online payments ─────────────
  if (paymentMethod !== 'cod' && paymentStatus === 'paid') {
    const paymentDetails = {
      transactionId: razorpayOrderId,
      paymentId: razorpayPaymentId,
    };
    sendPaymentReceipt(orderWithProducts, user, paymentDetails).catch((err) => {
      console.error('Failed to send payment receipt email:', err);
    });
  }

  res.status(201).json({ success: true, data: order });
});

// ── POST /api/orders/create-razorpay-order  (auth) ────────
// Creates a Razorpay order and returns the order ID + key to frontend.
// The frontend uses these to open the Razorpay checkout popup.
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

  // Calculate amount server-side
  const productDocs = await Promise.all(
    items.map((i) => Product.findById(i.productId))
  );

  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    const product = productDocs[i];
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'A product is no longer available' });
    }
    subtotal += product.price * items[i].qty;
  }

  const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
  const shipping       = subtotal - discountAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total          = parseFloat((subtotal - discountAmount + shipping).toFixed(2));

  // Razorpay amounts are in paise (INR × 100)
  // Prices are stored natively in INR so this is exact — no USD conversion needed
  const amountPaise = Math.round(total * 100);

  const rzpOrder = await razorpay.orders.create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  `rcpt_${Date.now()}`,
    notes:    { userId: req.user?.userId || 'guest' },
  });

  res.json({
    success: true,
    data: {
      razorpayOrderId: rzpOrder.id,
      amount:          total,
      amountPaise,
      currency:        'INR',
      keyId:           process.env.RAZORPAY_KEY_ID,
    },
  });
});

// ── DELETE /api/orders/:id  (admin) ────────────────────────
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

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

  await order.deleteOne();

  res.json({ success: true, message: 'Order deleted successfully' });
});

// ── GET /api/orders/my  (auth) ────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order
    .find({ userId: req.user.userId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: orders });
});

// ── GET /api/orders  (admin) ──────────────────────────────
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip     = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: { total, page: pageNum, limit: limitNum },
    },
  });
});

// ── PUT /api/orders/:id/status  (admin) ───────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  // Get current order to check previous status
  const currentOrder = await Order.findById(req.params.id);
  if (!currentOrder) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const previousStatus = currentOrder.status;

  // ── Restore stock if cancelling a non-cancelled order ────
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    const stockRestore = await restoreStock(currentOrder.items);
    if (!stockRestore.success) {
      console.error('Failed to restore stock on cancellation:', stockRestore.errors);
      // Continue with cancellation even if stock restore fails
      // Log for manual intervention
    }
  }

  const updateData = { status };
  if (trackingNumber) {
    updateData.trackingNumber = trackingNumber;
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  ).populate('userId', 'name email');

  // ── Send shipping update email for shipped/delivered ─────
  if (status === 'shipped' || status === 'delivered') {
    const user = {
      name: order.userId?.name || 'Customer',
      email: order.userId?.email || order.guestEmail,
    };
    if (user.email) {
      sendShippingUpdate(order, user, trackingNumber).catch((err) => {
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

// ── POST /api/orders/guest  (public) ──────────────────────
const createGuestOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    coupon               = null,
    discount             = 0,
    razorpayOrderId      = null,
    razorpayPaymentId    = null,
    razorpaySignature    = null,
    guestEmail,
    guestName,
    guestPhone,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  if (!guestEmail || !guestName || !guestPhone) {
    return res.status(400).json({ 
      success: false, 
      message: 'Guest email, name, and phone are required' 
    });
  }

  // ── Verify Razorpay signature for online payments ────────
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

  // ── Validate stock availability ──────────────────────────
  const stockValidation = await validateStock(items);
  if (!stockValidation.valid) {
    return res.status(400).json({
      success: false,
      message: stockValidation.errors[0],
      errors: stockValidation.errors,
    });
  }

  // ── Build order items with server-side prices ────────────
  const orderItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    orderItems.push({
      productId: product._id,
      title:     product.title,
      image:     product.image,
      price:     product.price,
      qty:       item.qty,
    });
  }

  // ── Calculate totals server-side ─────────────────────────
  const subtotal       = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.min(parseFloat(discount) || 0, subtotal);
  const shipping       = subtotal - discountAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total          = parseFloat((subtotal - discountAmount + shipping).toFixed(2));

  const paymentStatus = (paymentMethod === 'cod') ? 'pending' : 'paid';

  // ── Atomically decrement stock ───────────────────────────
  const stockDecrement = await decrementStock(items);
  if (!stockDecrement.success) {
    return res.status(400).json({
      success: false,
      message: 'Failed to reserve inventory. Please try again.',
      errors: stockDecrement.errors,
    });
  }

  // Generate tracking token for guest orders
  const trackingToken = crypto.randomBytes(32).toString('hex');

  let order;
  try {
    order = await Order.create({
      guestEmail,
      guestName,
      guestPhone,
      trackingToken,
      items:             orderItems,
      subtotal:          parseFloat(subtotal.toFixed(2)),
      discount:          discountAmount,
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
    // If order creation fails, restore the stock
    await restoreStock(items);
    throw err;
  }

  // ── Send order confirmation email ─────────────────────────
  try {
    const emailService = require('../services/emailService');
    const itemsList = orderItems
      .map((item) => `<li>${item.title} x ${item.qty} - ₹${(item.price * item.qty).toFixed(2)}</li>`)
      .join('');

    await emailService.sendEmail({
      to: guestEmail,
      subject: `Order Confirmation - #${order._id.toString().slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Confirmation</h2>
          <p>Dear ${guestName},</p>
          <p>Thank you for your order! Your order has been confirmed.</p>
          <h3>Order Details</h3>
          <p><strong>Order ID:</strong> ${order._id}</p>
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

// ── GET /api/orders/track/:token  (public) ────────────────
const trackGuestOrder = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const order = await Order
    .findOne({ trackingToken: token })
    .select('+trackingToken')
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  res.json({ success: true, data: order });
});

// ── GET /api/orders/:id/invoice  (auth) ───────────────────
const downloadInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the order
  const order = await Order.findById(id).lean();

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Verify user owns this order (or is admin)
  const isOwner = order.userId && order.userId.toString() === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // Get user info if available
  let user = null;
  if (order.userId) {
    user = await User.findById(order.userId).select('name email').lean();
  }

  // Generate PDF
  const pdfBuffer = await generateInvoice(order, user);

  // Set response headers for PDF download
  const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="ShopEase-Invoice-${invoiceNumber}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
});

// ── GET /api/orders/guest/:token/invoice  (public) ────────
const downloadGuestInvoice = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const order = await Order
    .findOne({ trackingToken: token })
    .select('+trackingToken')
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Generate PDF
  const pdfBuffer = await generateInvoice(order, null);

  // Set response headers for PDF download
  const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="ShopEase-Invoice-${invoiceNumber}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
});

module.exports = { 
  createOrder, 
  createRazorpayOrder, 
  deleteOrder,
  getMyOrders, 
  getAllOrders, 
  updateOrderStatus,
  createGuestOrder,
  trackGuestOrder,
  downloadInvoice,
  downloadGuestInvoice,
};
