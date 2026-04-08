/**
 * src/controllers/adminController.js
 * Provides aggregated analytics data for the admin dashboard.
 * All endpoints require both authMiddleware and adminMiddleware.
 */

const User         = require('../models/User');
const Product      = require('../models/Product');
const Order        = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { getLowStockProducts, LOW_STOCK_THRESHOLD } = require('../services/inventoryService');

// ── GET /api/admin/stats ───────────────────────────────────
const getDashboardStats = asyncHandler(async (req, res) => {
  // Build last-7-days date range
  const now   = new Date();
  const day0  = new Date(now);
  day0.setDate(now.getDate() - 6);
  day0.setHours(0, 0, 0, 0);

  // Run all aggregation queries in parallel for performance
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    revenueResult,
    recentOrders,
    categoryBreakdown,
    orderStatusBreakdown,
    revenueByDay,
    ordersByDay,
    usersByDay,
    topProducts,
    lowStockCount,
    outOfStockCount,
  ] = await Promise.all([
    // Total registered users
    User.countDocuments(),

    // Active products only
    Product.countDocuments({ isActive: true }),

    // All orders
    Order.countDocuments(),

    // Sum of all order totals
    Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),

    // 5 most recent orders with customer info
    Order
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .lean(),

    // Product count per category
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Order count per status
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Revenue per day — last 7 days
    Order.aggregate([
      { $match: { createdAt: { $gte: day0 } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$total' },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Orders per day — last 7 days (same pipeline, kept separate for clarity)
    Order.aggregate([
      { $match: { createdAt: { $gte: day0 } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // New users per day — last 7 days
    User.aggregate([
      { $match: { createdAt: { $gte: day0 } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Top 5 best-selling products by total qty sold
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id:   '$items.productId',
          title: { $first: '$items.title' },
          image: { $first: '$items.image' },
          qty:   { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),

    // Low stock products count
    Product.countDocuments({
      isActive: true,
      stock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 },
    }),

    // Out of stock products count
    Product.countDocuments({
      isActive: true,
      stock: 0,
    }),
  ]);

  const totalRevenue = revenueResult[0]?.total ?? 0;

  // ── Fill in missing days with zero so charts always show 7 bars ──
  const buildDayMap = (arr, valueKey) => {
    const map = {};
    arr.forEach((d) => { map[d._id] = d[valueKey]; });
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      result.push({ date: key, label, value: map[key] || 0 });
    }
    return result;
  };

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        lowStockCount,
        outOfStockCount,
      },
      recentOrders,
      categoryBreakdown,
      orderStatusBreakdown,
      charts: {
        revenueByDay: buildDayMap(revenueByDay, 'revenue'),
        ordersByDay:  buildDayMap(ordersByDay,  'count'),
        usersByDay:   buildDayMap(usersByDay,    'count'),
        topProducts,
      },
    },
  });
});

// ── GET /api/admin/inventory/low-stock ─────────────────────
const getLowStock = asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || LOW_STOCK_THRESHOLD;
  const lowStock = await getLowStockProducts(threshold);
  
  res.json({
    success: true,
    data: lowStock,
  });
});

// ── GET /api/admin/inventory/out-of-stock ──────────────────
const getOutOfStock = asyncHandler(async (req, res) => {
  const outOfStock = await Product.find({
    isActive: true,
    stock: 0,
  }).select('title category image price').lean();
  
  res.json({
    success: true,
    data: {
      count: outOfStock.length,
      products: outOfStock,
    },
  });
});

module.exports = { getDashboardStats, getLowStock, getOutOfStock };