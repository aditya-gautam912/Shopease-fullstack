const { Banner } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');

const getActiveBanners = asyncHandler(async (req, res) => {
  const { position } = req.query;
  const now = new Date();

  const where = {
    active: true,
    startDate: { [Op.lte]: now },
    [Op.or]: [
      { endDate: null },
      { endDate: { [Op.gte]: now } },
    ],
  };

  if (position) {
    where.position = position;
  }

  const banners = await Banner.findAll({
    where,
    order: [['createdAt', 'DESC']],
    raw: true,
  });

  res.json({ success: true, data: banners });
});

const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.findAll({
    order: [['createdAt', 'DESC']],
    raw: true,
  });

  res.json({ success: true, data: banners });
});

const createBanner = asyncHandler(async (req, res) => {
  const { title, description, image, link, active, startDate, endDate, position } = req.body;

  const banner = await Banner.create({
    title, description, image, link, active,
    startDate, endDate, position,
  });

  res.status(201).json({
    success: true, data: banner,
    message: 'Banner created successfully',
  });
});

const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {};
  ['title', 'description', 'image', 'link', 'active', 'startDate', 'endDate', 'position']
    .forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const [affected] = await Banner.update(updates, { where: { id } });
  if (affected === 0) {
    return res.status(404).json({ success: false, message: 'Banner not found' });
  }

  const banner = await Banner.findByPk(id);
  res.json({ success: true, data: banner, message: 'Banner updated successfully' });
});

const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findByPk(id);
  if (!banner) {
    return res.status(404).json({ success: false, message: 'Banner not found' });
  }

  await banner.destroy();
  res.json({ success: true, message: 'Banner deleted successfully' });
});

module.exports = {
  getActiveBanners, getAllBanners, createBanner,
  updateBanner, deleteBanner,
};
