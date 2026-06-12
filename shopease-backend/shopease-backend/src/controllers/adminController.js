const { Op, fn, col, literal } = require('sequelize');
const { User, Product, Order } = require('../models');
const { sequelize } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { getLowStockProducts, LOW_STOCK_THRESHOLD } = require('../services/inventoryService');

const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const day0 = new Date(now);
  day0.setDate(now.getDate() - 6);
  day0.setHours(0, 0, 0, 0);

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
    User.count(),
    Product.count({ where: { isActive: true } }),
    Order.count(),

    Order.findOne({ attributes: [[fn('COALESCE', fn('SUM', col('total')), 0), 'total']], raw: true }),

    Order.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      raw: true,
    }),

    Product.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      where: { isActive: true },
      group: ['category'],
      order: [[literal('count'), 'DESC']],
      raw: true,
    }),

    Order.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),

    sequelize.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(total), 0) AS revenue,
             COUNT(*) AS orders
      FROM orders
      WHERE created_at >= :day0
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date
    `, { replacements: { day0 }, type: sequelize.QueryTypes.SELECT }),

    sequelize.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM orders
      WHERE created_at >= :day0
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date
    `, { replacements: { day0 }, type: sequelize.QueryTypes.SELECT }),

    sequelize.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM users
      WHERE created_at >= :day0
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date
    `, { replacements: { day0 }, type: sequelize.QueryTypes.SELECT }),

    sequelize.query(`
      SELECT items->>'productId' AS product_id,
             MAX(items->>'title') AS title,
             MAX(items->>'image') AS image,
             SUM((items->>'qty')::int) AS qty,
             SUM((items->>'price')::numeric * (items->>'qty')::int) AS revenue
      FROM orders,
           jsonb_array_elements(orders.items) AS items
      GROUP BY items->>'productId'
      ORDER BY qty DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT }),

    Product.count({ where: { isActive: true, stock: { [Op.lte]: LOW_STOCK_THRESHOLD, [Op.gt]: 0 } } }),

    Product.count({ where: { isActive: true, stock: 0 } }),
  ]);

  const totalRevenue = parseFloat(revenueResult?.total || '0');

  const buildDayMap = (arr, valueKey) => {
    const map = {};
    arr.forEach(d => { map[d.date] = d[valueKey]; });
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
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
        totalRevenue,
        lowStockCount,
        outOfStockCount,
      },
      recentOrders,
      categoryBreakdown,
      orderStatusBreakdown,
      charts: {
        revenueByDay: buildDayMap(revenueByDay, 'revenue'),
        ordersByDay: buildDayMap(ordersByDay, 'count'),
        usersByDay: buildDayMap(usersByDay, 'count'),
        topProducts,
      },
    },
  });
});

const getLowStock = asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || LOW_STOCK_THRESHOLD;
  const lowStock = await getLowStockProducts(threshold);
  res.json({ success: true, data: lowStock });
});

const getOutOfStock = asyncHandler(async (req, res) => {
  const outOfStock = await Product.findAll({
    attributes: ['id', 'title', 'category', 'image', 'price'],
    where: { isActive: true, stock: 0 },
    raw: true,
  });
  res.json({ success: true, data: { count: outOfStock.length, products: outOfStock } });
});

module.exports = { getDashboardStats, getLowStock, getOutOfStock };
