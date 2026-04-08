/**
 * src/controllers/twoFactorController.js
 * Handles Two-Factor Authentication (2FA) setup, verification, and validation.
 */

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const speakeasy = require('speakeasy');
const { sendEmail } = require('../services/emailService');

// ── POST /api/auth/2fa/enable ──────────────────────────────
// Generate 2FA secret and send OTP via email
const enable2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const user = await User.findById(userId).select('+twoFactorSecret');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is already enabled for this account',
    });
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `ShopEase (${user.email})`,
    length: 20,
  });

  // Generate OTP token
  const token = speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32',
  });

  // Save secret temporarily (not enabled yet)
  user.twoFactorSecret = secret.base32;
  await user.save();

  // Send OTP via email
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
      qrCode: secret.otpauth_url, // Can be used to generate QR code on frontend
    },
  });
});

// ── POST /api/auth/2fa/verify ──────────────────────────────
// Verify OTP code and enable 2FA
const verify2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification code is required',
    });
  }

  const user = await User.findById(userId).select('+twoFactorSecret');

  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({
      success: false,
      message: 'Please request 2FA setup first',
    });
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2, // Allow 2 time steps before/after for clock drift
  });

  if (!verified) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code',
    });
  }

  // Enable 2FA
  user.twoFactorEnabled = true;
  await user.save();

  res.json({
    success: true,
    message: 'Two-factor authentication has been enabled successfully',
  });
});

// ── POST /api/auth/2fa/disable ─────────────────────────────
// Disable 2FA with password confirmation
const disable2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to disable 2FA',
    });
  }

  const user = await User.findById(userId).select('+password +twoFactorSecret');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Verify password
  const isPasswordCorrect = await user.matchPassword(password);
  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect password',
    });
  }

  // Disable 2FA
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Two-factor authentication has been disabled',
  });
});

// ── POST /api/auth/2fa/validate ────────────────────────────
// Validate OTP during login (called from login flow)
const validate2FA = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({
      success: false,
      message: 'User ID and verification code are required',
    });
  }

  const user = await User.findById(userId).select('+twoFactorSecret');

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
    });
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2,
  });

  if (!verified) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code',
    });
  }

  // Generate JWT token
  const generateToken = require('../utils/generateToken');
  const jwtToken = generateToken(user);

  // Sanitize user data
  const sanitiseUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    addresses: user.addresses,
    wishlist: user.wishlist,
    createdAt: user.createdAt,
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token: jwtToken,
      user: sanitiseUser(user),
    },
  });
});

module.exports = {
  enable2FA,
  verify2FA,
  disable2FA,
  validate2FA,
};
