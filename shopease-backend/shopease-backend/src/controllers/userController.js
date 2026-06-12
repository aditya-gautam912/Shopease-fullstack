const { User, Address, CartItem, WishlistItem, RecentlyViewed, Product } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');

const toClientItem = ({ productId, title, price, image, category, stock, qty }) => ({
  _id: productId, title, price, image, category, stock, qty,
});

const toDbItem = (i) => ({
  productId: i._id,
  title: i.title || '',
  price: Number(i.price) || 0,
  image: i.image || '',
  category: i.category || '',
  stock: Number(i.stock) || 99,
  qty: Math.max(1, Number(i.qty) || 1),
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId, {
    include: [
      { model: Address, as: 'addresses', separate: true },
      {
        model: WishlistItem, as: 'wishlist', separate: true,
        include: [{ model: Product, attributes: ['id', 'title', 'price', 'image', 'category', 'ratingRate', 'ratingCount'] }],
      },
    ],
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, data: user });
});

const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (updates.email) {
    const existing = await User.findOne({ where: { email: updates.email }, paranoid: false });
    if (existing && existing.id !== req.user.userId) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  }

  await User.update(updates, { where: { id: req.user.userId }, individualHooks: true });
  const user = await User.findByPk(req.user.userId);

  res.json({ success: true, data: user });
});

const addAddress = asyncHandler(async (req, res) => {
  const addressCount = await Address.count({ where: { userId: req.user.userId } });

  if (addressCount >= 5) {
    return res.status(400).json({
      success: false,
      message: 'Maximum of 5 addresses allowed',
    });
  }

  const { street, city, state, zip, country, isDefault } = req.body;

  if (isDefault) {
    await Address.update({ isDefault: false }, { where: { userId: req.user.userId } });
  }

  await Address.create({
    userId: req.user.userId,
    street, city, state, zip, country,
    isDefault: isDefault || addressCount === 0,
  });

  const addresses = await Address.findAll({ where: { userId: req.user.userId } });

  res.status(201).json({ success: true, data: addresses });
});

const removeAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.addressId, userId: req.user.userId } });
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }

  const wasDefault = address.isDefault;
  await address.destroy();

  if (wasDefault) {
    const remaining = await Address.findOne({ where: { userId: req.user.userId }, order: [['createdAt', 'ASC']] });
    if (remaining) {
      remaining.isDefault = true;
      await remaining.save();
    }
  }

  const addresses = await Address.findAll({ where: { userId: req.user.userId } });
  res.json({ success: true, data: addresses });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.addressId, userId: req.user.userId } });
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }

  await Address.update({ isDefault: false }, { where: { userId: req.user.userId } });
  address.isDefault = true;
  await address.save();

  const addresses = await Address.findAll({ where: { userId: req.user.userId } });
  res.json({ success: true, data: addresses });
});

const toggleWishlist = asyncHandler(async (req, res) => {
  const productId = req.params.productId;

  const existing = await WishlistItem.findOne({ where: { userId: req.user.userId, productId } });

  if (existing) {
    await existing.destroy();
    const wishlist = await WishlistItem.findAll({ where: { userId: req.user.userId } });
    return res.json({ success: true, data: { wishlist, action: 'removed' } });
  }

  await WishlistItem.create({ userId: req.user.userId, productId });
  const wishlist = await WishlistItem.findAll({ where: { userId: req.user.userId } });
  res.json({ success: true, data: { wishlist, action: 'added' } });
});

const getWishlist = asyncHandler(async (req, res) => {
  const items = await WishlistItem.findAll({
    where: { userId: req.user.userId },
    include: [{ model: Product, attributes: ['id', 'title', 'price', 'image', 'category', 'ratingRate', 'oldPrice'] }],
  });

  res.json({ success: true, data: items || [] });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const where = search
    ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } }] }
    : {};

  const { rows: users, count: total } = await User.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit: limitNum,
  });

  res.json({
    success: true,
    data: { users, pagination: { total, page: pageNum, limit: limitNum } },
  });
});

const getCart = asyncHandler(async (req, res) => {
  const cartItems = await CartItem.findAll({
    where: { userId: req.user.userId },
    include: [{ model: Product, attributes: ['id'] }],
  });

  const items = cartItems.map(toClientItem);
  res.json({ success: true, data: items });
});

const syncCart = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'items must be an array' });
  }

  const cartItems = items.slice(0, 50).map(toDbItem);

  await CartItem.destroy({ where: { userId: req.user.userId } });
  await CartItem.bulkCreate(
    cartItems.map(i => ({ ...i, userId: req.user.userId })),
  );

  res.json({ success: true, data: cartItems });
});

const getRecentlyViewed = asyncHandler(async (req, res) => {
  const items = await RecentlyViewed.findAll({
    where: { userId: req.user.userId },
    include: [{ model: Product, attributes: ['id', 'title', 'price', 'image', 'category', 'ratingRate', 'oldPrice'] }],
    order: [['updatedAt', 'DESC']],
  });

  res.json({ success: true, data: items || [] });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account',
    });
  }

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  await user.destroy();
  res.json({ success: true, message: 'User deleted successfully' });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be 'admin' or 'user'",
    });
  }

  if (id === req.user.userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot change your own role',
    });
  }

  if (role === 'user') {
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot demote the last admin account',
      });
    }
  }

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.role = role;
  await user.save();

  const updated = user.toJSON();
  delete updated.password;

  res.json({ success: true, data: updated });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.scope(null).findByPk(req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    return res.status(400).json({ success: false, message: 'New password must be different from current password' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = {
  getMe, updateMe, addAddress, removeAddress,
  setDefaultAddress, toggleWishlist, getWishlist,
  getAllUsers, getCart, syncCart, getRecentlyViewed,
  deleteUser, updateUserRole, changePassword,
};
