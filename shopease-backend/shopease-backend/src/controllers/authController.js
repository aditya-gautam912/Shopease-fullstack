const { Op } = require('sequelize');
const { User, RefreshToken } = require('../models');
const { generateTokens } = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendPasswordReset, sendWelcomeEmail, sendVerificationEmail } = require('../services/emailService');

const sanitiseUser = (user) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: true,
  addresses: user.addresses || [],
  wishlist: user.wishlist || [],
  createdAt: user.createdAt,
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const cleanExpiredTokens = async (userId, keepCount) => {
  const tokens = await RefreshToken.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
  const valid = tokens.filter(t => t.expiresAt > new Date());
  if (valid.length > (keepCount || 5)) {
    const toRemove = valid.slice(0, valid.length - keepCount);
    await RefreshToken.destroy({ where: { id: toRemove.map(t => t.id) } });
  }
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with that email already exists' });
  }

  const user = await User.create({ name, email: email.toLowerCase(), password, isEmailVerified: true });
  const { accessToken, refreshToken } = generateTokens(user);

  const hashed = hashToken(refreshToken);
  await RefreshToken.create({
    userId: user.id,
    token: hashed,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  sendWelcomeEmail(user).catch(err => console.error('Failed to send welcome email:', err));

  res.status(201).json({
    success: true,
    data: { accessToken, refreshToken, user: sanitiseUser(user) },
    message: 'Registration successful!',
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    attributes: { include: ['password'] },
  });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save();
  }

  const { accessToken, refreshToken } = generateTokens(user);
  const hashed = hashToken(refreshToken);
  await cleanExpiredTokens(user.id, 4);
  await RefreshToken.create({
    userId: user.id,
    token: hashed,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.json({ success: true, data: { accessToken, refreshToken, user: sanitiseUser(user) } });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token is required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findByPk(decoded.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  const hashedToken = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({
    where: { userId: user.id, token: hashedToken, expiresAt: { [Op.gt]: new Date() } },
  });

  if (!storedToken) {
    await RefreshToken.destroy({ where: { userId: user.id } });
    return res.status(401).json({ success: false, message: 'Invalid refresh token. Please log in again.' });
  }

  await storedToken.destroy();

  const tokens = generateTokens(user);
  const newHashed = hashToken(tokens.refreshToken);
  await cleanExpiredTokens(user.id, 4);
  await RefreshToken.create({
    userId: user.id,
    token: newHashed,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.json({ success: true, data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
});

const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
      const hashedToken = hashToken(refreshToken);
      await RefreshToken.destroy({ where: { userId: decoded.userId, token: hashedToken } });
    } catch {
      // ignore
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  await RefreshToken.destroy({ where: { userId: req.user.userId } });
  res.json({ success: true, message: 'Logged out from all devices' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'No account found with that email address' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = new Date(Date.now() + 3600000);
  await user.save();

  await sendPasswordReset(user, resetToken);
  res.json({ success: true, message: 'Password reset email sent. Please check your inbox.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: { resetPasswordToken: hashedToken, resetPasswordExpire: { [Op.gt]: new Date() } },
    attributes: { include: ['resetPasswordToken', 'resetPasswordExpire', 'password'] },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  await user.save();

  await RefreshToken.destroy({ where: { userId: user.id } });

  const tokens = generateTokens(user);
  const hashedRT = hashToken(tokens.refreshToken);
  await RefreshToken.create({
    userId: user.id,
    token: hashedRT,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.json({
    success: true,
    message: 'Password reset successful',
    data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: sanitiseUser(user) },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: { emailVerificationToken: hashedToken, emailVerificationExpire: { [Op.gt]: new Date() } },
    attributes: { include: ['emailVerificationToken', 'emailVerificationExpire'] },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpire = null;
  await user.save();

  sendWelcomeEmail(user).catch(err => console.error('Failed to send welcome email:', err));

  res.json({ success: true, message: 'Email verified successfully! Welcome to ShopEase.', data: { user: sanitiseUser(user) } });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ success: false, message: 'Email is already verified' });
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendVerificationEmail(user, verificationToken);
  res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
