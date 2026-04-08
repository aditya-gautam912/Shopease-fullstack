/**
 * src/controllers/userController.js
 * Handles user profile management, delivery addresses,
 * wishlist toggling, and the admin user-list endpoint.
 */

const User         = require('../models/User');
const bcrypt       = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');

// ── Shared cart item mappers ───────────────────────────────
// ✅ FIX #10 – single source of truth for cart shape transforms
const toClientItem = ({ productId, title, price, image, category, stock, qty }) => ({
  _id: productId, title, price, image, category, stock, qty,
});

const toDbItem = (i) => ({
  productId: i._id,
  title:     i.title    || '',
  price:     Number(i.price)  || 0,
  image:     i.image    || '',
  category:  i.category || '',
  stock:     Number(i.stock)  || 99,
  qty:       Math.max(1, Number(i.qty) || 1),
});

// ── GET /api/users/me  (auth) ─────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User
    .findById(req.user.userId)
    .populate('wishlist', 'title price image category rating')
    .lean();

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // password is select:false on the schema; delete is a safety net for lean()
  delete user.password;

  res.json({ success: true, data: user });
});

// ── PUT /api/users/me  (auth) ─────────────────────────────
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone'];             // ✅ FIX #15 – added phone
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  // ✅ FIX #5 – explicit uniqueness check before update to avoid E11000
  if (updates.email) {
    const existing = await User.findOne({ email: updates.email }).lean();
    if (existing && existing._id.toString() !== req.user.userId) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  delete user.password;

  res.json({ success: true, data: user });
});

// ── POST /api/users/me/address  (auth) ────────────────────
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (user.addresses.length >= 5) {
    return res.status(400).json({
      success: false,
      message: 'Maximum of 5 addresses allowed',
    });
  }

  // ✅ FIX #8 – whitelist allowed fields; no arbitrary keys from req.body
  const { street, city, state, zip, country, isDefault } = req.body;
  const newAddress = { street, city, state, zip, country, isDefault };

  if (newAddress.isDefault) {
    user.addresses.forEach((addr) => { addr.isDefault = false; });
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({ success: true, data: user.addresses });
});

// ── DELETE /api/users/me/address/:addressId  (auth) ───────
const removeAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  const index = user.addresses.findIndex(
    (a) => a._id.toString() === req.params.addressId
  );

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }

  const [removedAddress] = user.addresses.splice(index, 1);

  // Preserve a default address when possible.
  if (removedAddress.isDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  await user.save();

  res.json({ success: true, data: user.addresses });
});

// ── PATCH /api/users/me/address/:addressId/default  (auth) ─
const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  const address = user.addresses.id(req.params.addressId);
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }

  user.addresses.forEach((addr) => {
    addr.isDefault = addr._id.toString() === req.params.addressId;
  });

  await user.save();

  res.json({ success: true, data: user.addresses });
});

// ── POST /api/users/wishlist/:productId  (auth — toggle) ──
const toggleWishlist = asyncHandler(async (req, res) => {
  const user      = await User.findById(req.user.userId);
  const productId = req.params.productId;

  const idx = user.wishlist.findIndex((id) => id.toString() === productId);
  let action;

  if (idx > -1) {
    user.wishlist.splice(idx, 1);
    action = 'removed';
  } else {
    user.wishlist.push(productId);
    action = 'added';
  }

  await user.save();

  res.json({
    success: true,
    data: { wishlist: user.wishlist, action },
  });
});

// ── GET /api/users/wishlist  (auth) ───────────────────────
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User
    .findById(req.user.userId)
    .populate('wishlist', 'title price image category rating oldPrice')
    .lean();

  res.json({ success: true, data: user.wishlist || [] });
});

// ── GET /api/users  (admin only) ──────────────────────────
// ✅ FIX #16 – req.query.search is now applied as a filter
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip     = (pageNum - 1) * limitNum;

  const filter = search
    ? {
        $or: [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    User.countDocuments(filter),
  ]);

  // password is select:false — delete is a safety net only
  users.forEach((u) => delete u.password);

  res.json({
    success: true,
    data: {
      users,
      pagination: { total, page: pageNum, limit: limitNum },
    },
  });
});

// ── GET /api/users/cart  (auth) ───────────────────────────
const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('cart').lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // ✅ FIX #10 – use shared mapper
  const items = (user.cart || []).map(toClientItem);

  res.json({ success: true, data: items });
});

// ── PUT /api/users/cart  (auth) ───────────────────────────
const syncCart = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'items must be an array' });
  }

  // ✅ FIX #10 – use shared mapper
  const cart = items.slice(0, 50).map(toDbItem);

  await User.findByIdAndUpdate(req.user.userId, { cart });

  res.json({ success: true, data: cart });
});

// ── GET /api/users/recently-viewed  (auth) ────────────────
const getRecentlyViewed = asyncHandler(async (req, res) => {
  const user = await User
    .findById(req.user.userId)
    .populate('recentlyViewed', 'title price image category rating oldPrice')
    .lean();

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // ✅ FIX #7 – non-mutating reverse
  const recentlyViewed = [...(user.recentlyViewed || [])].reverse();

  res.json({ success: true, data: recentlyViewed });
});

// ── DELETE /api/users/:id  (admin only) ───────────────────
// ✅ FIX #1 – new handler
// ✅ FIX #3 – prevents admin from deleting themselves
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Guard: cannot delete own account
  if (id === req.user.userId) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own account",
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  await user.deleteOne();

  res.json({ success: true, message: 'User deleted successfully' });
});

// ── PATCH /api/users/:id/role  (admin only) ───────────────
// ✅ FIX #1 – new handler
// ✅ FIX #3 – prevents admin from changing their own role
// ✅ FIX #4 – prevents demoting the last admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { id }   = req.params;
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be 'admin' or 'user'",
    });
  }

  // Guard: cannot change own role
  if (id === req.user.userId) {
    return res.status(400).json({
      success: false,
      message: "You cannot change your own role",
    });
  }

  // Guard: cannot demote the last admin
  if (role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot demote the last admin account",
      });
    }
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.role = role;
  await user.save();

  const updated = user.toObject();
  delete updated.password;

  res.json({ success: true, data: updated });
});

// ── PUT /api/users/me/password  (auth) ────────────────────
// ✅ Password change endpoint
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch user with password field
  const user = await User.findById(req.user.userId).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  // Prevent reusing the same password
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    return res.status(400).json({ success: false, message: 'New password must be different from current password' });
  }

  // Assign the plain password and let the model pre-save hook hash it once.
  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = {
  getMe,
  updateMe,
  addAddress,
  removeAddress,
  setDefaultAddress,
  toggleWishlist,
  getWishlist,
  getAllUsers,
  getCart,
  syncCart,
  getRecentlyViewed,
  deleteUser,
  updateUserRole,
  changePassword,   // ✅ new
};
