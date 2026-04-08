/**
 * src/routes/adminRoutes.js
 * Admin-only analytics and dashboard routes.
 * All routes require both authMiddleware and adminMiddleware.
 */

const express = require('express');

const { getDashboardStats, getLowStock, getOutOfStock } = require('../controllers/adminController');
const authMiddleware        = require('../middleware/authMiddleware');
const adminMiddleware       = require('../middleware/adminMiddleware');

const router = express.Router();

// Apply both guards to every route in this file
router.use(authMiddleware, adminMiddleware);

// ── GET /api/admin/stats ───────────────────────────────────
router.get('/stats', getDashboardStats);

// ── GET /api/admin/inventory/low-stock ─────────────────────
router.get('/inventory/low-stock', getLowStock);

// ── GET /api/admin/inventory/out-of-stock ──────────────────
router.get('/inventory/out-of-stock', getOutOfStock);

module.exports = router;