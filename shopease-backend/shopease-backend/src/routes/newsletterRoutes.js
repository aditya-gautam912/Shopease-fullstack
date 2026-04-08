/**
 * src/routes/newsletterRoutes.js
 * Newsletter routes
 */

const express = require('express');
const router = express.Router();
const { subscribe, unsubscribe, getAllSubscribers } = require('../controllers/newsletterController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.post('/subscribe', subscribe);
router.post('/unsubscribe/:token', unsubscribe);

// Admin routes
router.get('/admin/subscribers', authMiddleware, adminMiddleware, getAllSubscribers);

module.exports = router;
