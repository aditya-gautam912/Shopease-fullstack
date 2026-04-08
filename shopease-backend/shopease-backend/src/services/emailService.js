const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Load email template
const loadTemplate = async (templateName) => {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return null;
  }
};

// Replace placeholders in template
const replacePlaceholders = (template, data) => {
  let result = template;
  Object.keys(data).forEach((key) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, data[key] || '');
  });
  return result;
};

// Send email
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const transporter = createTransporter();

    let htmlContent = html;
    if (template) {
      const templateContent = await loadTemplate(template);
      if (templateContent) {
        htmlContent = replacePlaceholders(templateContent, data || {});
      }
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ShopEase" <noreply@shopease.com>',
      to,
      subject,
      html: htmlContent,
      text: text || '',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send order confirmation email
const sendOrderConfirmation = async (order, user) => {
  const itemsList = order.items
    .map(
      (item) =>
        `<li>${item.product.title} x ${item.qty} - ₹${(item.price * item.qty).toFixed(2)}</li>`
    )
    .join('');

  const data = {
    userName: user.name,
    orderNumber: order._id,
    orderDate: new Date(order.createdAt).toLocaleDateString(),
    itemsList,
    subtotal: order.subtotal.toFixed(2),
    discount: order.discount ? order.discount.toFixed(2) : '0.00',
    shippingCost: order.shippingCost.toFixed(2),
    totalAmount: order.totalAmount.toFixed(2),
    shippingAddress: `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}, ${order.shippingAddress.country}`,
    paymentMethod: order.paymentMethod,
    trackingUrl: `${process.env.CLIENT_URL}/orders`,
  };

  return sendEmail({
    to: user.email,
    subject: `Order Confirmation - #${order._id.toString().slice(-8)}`,
    template: 'orderConfirmation',
    data,
  });
};

// Send shipping update email
const sendShippingUpdate = async (order, user, trackingNumber) => {
  const data = {
    userName: user.name,
    orderNumber: order._id,
    status: order.status,
    trackingNumber: trackingNumber || 'N/A',
    trackingUrl: `${process.env.CLIENT_URL}/orders`,
  };

  return sendEmail({
    to: user.email,
    subject: `Order ${order.status.charAt(0).toUpperCase() + order.status.slice(1)} - #${order._id.toString().slice(-8)}`,
    template: 'shippingUpdate',
    data,
  });
};

// Send password reset email
const sendPasswordReset = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const data = {
    userName: user.name,
    resetUrl,
    expiryTime: '1 hour',
  };

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request - ShopEase',
    template: 'passwordReset',
    data,
  });
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const data = {
    userName: user.name,
    loginUrl: `${process.env.CLIENT_URL}/login`,
    shopUrl: `${process.env.CLIENT_URL}/products`,
  };

  return sendEmail({
    to: user.email,
    subject: 'Welcome to ShopEase!',
    template: 'welcomeEmail',
    data,
  });
};

// Send email verification email
const sendVerificationEmail = async (user, verificationToken) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🛍️ ShopEase</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Verify Your Email Address</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hi ${user.name}! 👋</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Thanks for signing up for ShopEase! Please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ✓ Verify Email Address
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          This link will expire in <strong>24 hours</strong>. If you didn't create an account with ShopEase, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} ShopEase. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Verify Your Email - ShopEase',
    html,
    text: `Hi ${user.name}, Please verify your email by visiting: ${verifyUrl}. This link expires in 24 hours.`,
  });
};

// Send payment receipt
const sendPaymentReceipt = async (order, user, paymentDetails) => {
  const itemsList = order.items
    .map(
      (item) =>
        `<li>${item.product.title} x ${item.qty} - ₹${(item.price * item.qty).toFixed(2)}</li>`
    )
    .join('');

  const data = {
    userName: user.name,
    orderNumber: order._id,
    paymentDate: new Date().toLocaleDateString(),
    paymentMethod: order.paymentMethod,
    transactionId: paymentDetails.transactionId || 'N/A',
    paymentId: paymentDetails.paymentId || 'N/A',
    itemsList,
    subtotal: order.subtotal.toFixed(2),
    discount: order.discount ? order.discount.toFixed(2) : '0.00',
    shippingCost: order.shippingCost.toFixed(2),
    totalAmount: order.totalAmount.toFixed(2),
  };

  return sendEmail({
    to: user.email,
    subject: `Payment Receipt - #${order._id.toString().slice(-8)}`,
    template: 'paymentReceipt',
    data,
  });
};

// Send low stock alert to admin
const sendLowStockAlert = async (product, variantId, currentStock) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) {
    console.warn('No admin email configured for low stock alerts');
    return { success: false, error: 'No admin email configured' };
  }

  let productInfo = `<strong>${product.title}</strong>`;
  if (variantId) {
    const variant = product.variants?.id(variantId);
    if (variant) {
      productInfo += ` (${variant.size || ''} ${variant.color || ''} - SKU: ${variant.sku})`;
    }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f44336; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">⚠️ Low Stock Alert</h2>
      </div>
      <div style="padding: 20px; background: #fff; border: 1px solid #ddd;">
        <p>The following product is running low on stock:</p>
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0 0 10px 0;">${productInfo}</p>
          <p style="margin: 0; font-size: 24px; color: #dc3545;"><strong>Current Stock: ${currentStock}</strong></p>
        </div>
        <p>Category: <strong>${product.category}</strong></p>
        <p style="color: #666;">Please restock this item soon to avoid stockouts.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/products" 
           style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Manage Inventory
        </a>
      </div>
      <div style="padding: 15px; background: #f5f5f5; text-align: center; font-size: 12px; color: #666;">
        This is an automated alert from ShopEase Inventory System
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🚨 Low Stock Alert: ${product.title} (${currentStock} remaining)`,
    html,
  });
};

// Send out of stock notification
const sendOutOfStockAlert = async (product, variantId) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return { success: false, error: 'No admin email configured' };

  let productInfo = `<strong>${product.title}</strong>`;
  if (variantId) {
    const variant = product.variants?.id(variantId);
    if (variant) {
      productInfo += ` (${variant.size || ''} ${variant.color || ''} - SKU: ${variant.sku})`;
    }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">🚫 OUT OF STOCK</h2>
      </div>
      <div style="padding: 20px; background: #fff; border: 1px solid #ddd;">
        <p>The following product is now <strong>OUT OF STOCK</strong>:</p>
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;">${productInfo}</p>
        </div>
        <p>Category: <strong>${product.category}</strong></p>
        <p style="color: #dc3545;"><strong>Immediate action required!</strong></p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/products" 
           style="display: inline-block; background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Restock Now
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🚫 OUT OF STOCK: ${product.title}`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendShippingUpdate,
  sendPasswordReset,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPaymentReceipt,
  sendLowStockAlert,
  sendOutOfStockAlert,
};
