/**
 * src/controllers/bannerController.js
 * Controllers for promotional banner management.
 * Handles public banner retrieval and admin CRUD operations.
 */

const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');

// ── GET /api/banners ───────────────────────────────────────
// Get active banners filtered by current date (public)
const getActiveBanners = asyncHandler(async (req, res) => {
  const { position } = req.query;
  const now = new Date();

  const filter = {
    active: true,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  };

  if (position) {
    filter.position = position;
  }

  const banners = await Banner.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: banners,
  });
});

// ── GET /api/admin/banners ─────────────────────────────────
// Get all banners (admin only)
const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find()
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: banners,
  });
});

// ── POST /api/admin/banners ────────────────────────────────
// Create new banner (admin only)
const createBanner = asyncHandler(async (req, res) => {
  const { title, description, image, link, active, startDate, endDate, position } = req.body;

  const banner = await Banner.create({
    title,
    description,
    image,
    link,
    active,
    startDate,
    endDate,
    position,
  });

  res.status(201).json({
    success: true,
    data: banner,
    message: 'Banner created successfully',
  });
});

// ── PUT /api/admin/banners/:id ─────────────────────────────
// Update banner (admin only)
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, image, link, active, startDate, endDate, position } = req.body;

  const banner = await Banner.findById(id);
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found',
    });
  }

  if (title !== undefined) banner.title = title;
  if (description !== undefined) banner.description = description;
  if (image !== undefined) banner.image = image;
  if (link !== undefined) banner.link = link;
  if (active !== undefined) banner.active = active;
  if (startDate !== undefined) banner.startDate = startDate;
  if (endDate !== undefined) banner.endDate = endDate;
  if (position !== undefined) banner.position = position;

  await banner.save();

  res.json({
    success: true,
    data: banner,
    message: 'Banner updated successfully',
  });
});

// ── DELETE /api/admin/banners/:id ──────────────────────────
// Delete banner (admin only)
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const banner = await Banner.findById(id);
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found',
    });
  }

  await banner.deleteOne();

  res.json({
    success: true,
    message: 'Banner deleted successfully',
  });
});

module.exports = {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
