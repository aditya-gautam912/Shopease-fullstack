const express = require('express');

const {
  getActiveBanners, getAllBanners, createBanner,
  updateBanner, deleteBanner,
} = require('../controllers/bannerController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', getActiveBanners);
router.get('/all', authMiddleware, adminMiddleware, getAllBanners);
router.post('/', authMiddleware, adminMiddleware, createBanner);
router.put('/:id', authMiddleware, adminMiddleware, updateBanner);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBanner);

module.exports = router;
