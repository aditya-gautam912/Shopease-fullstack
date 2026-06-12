const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { sendEmail } = require('../services/emailService');

const enable2FA = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await User.scope(null).findByPk(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ success: false, message: '2FA is already enabled for this account' });
  }

  const secret = speakeasy.generateSecret({
    name: `ShopEase (${user.email})`,
    length: 20,
  });

  const token = speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32',
  });

  user.twoFactorSecret = secret.base32;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'ShopEase - Enable Two-Factor Authentication',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Enable Two-Factor Authentication</h2>
        <p>Hello ${user.name},</p>
        <p>You've requested to enable two-factor authentication for your ShopEase account.</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${token}
        </div>
        <p>This code will expire in 30 seconds. Please enter it in the app to complete setup.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The ShopEase Team</p>
      </div>
    `,
  });

  res.json({
    success: true,
    message: 'A verification code has been sent to your email',
    data: {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    },
  });
});

const verify2FA = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification code is required' });
  }

  const user = await User.scope(null).findByPk(userId);
  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({ success: false, message: 'Please request 2FA setup first' });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
  }

  user.twoFactorEnabled = true;
  await user.save();

  res.json({ success: true, message: 'Two-factor authentication has been enabled successfully' });
});

const disable2FA = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required to disable 2FA' });
  }

  const user = await User.scope(null).findByPk(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  await user.save();

  res.json({ success: true, message: 'Two-factor authentication has been disabled' });
});

const validate2FA = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ success: false, message: 'User ID and verification code are required' });
  }

  const user = await User.scope(null).findByPk(userId);
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
  }

  const generateToken = require('../utils/generateToken');
  const jwtToken = generateToken(user);

  const sanitiseUser = (u) => ({
    _id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    addresses: [],
    wishlist: [],
    createdAt: u.createdAt,
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: { token: jwtToken, user: sanitiseUser(user) },
  });
});

module.exports = {
  enable2FA,
  verify2FA,
  disable2FA,
  validate2FA,
};
