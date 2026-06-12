const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    references: { model: 'users', key: 'id' },
    field: 'user_id',
  },
  guestEmail: { type: DataTypes.STRING(255) },
  guestName: { type: DataTypes.STRING(100) },
  guestPhone: { type: DataTypes.STRING(20) },
  trackingToken: { type: DataTypes.STRING(255) },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 },
  },
  shipping: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 },
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  coupon: { type: DataTypes.STRING(50) },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'upi', 'netbanking', 'wallet', 'cod'),
    allowNull: false,
    field: 'payment_method',
  },
  paymentStatus: {
    type: DataTypes.ENUM('paid', 'pending'),
    defaultValue: 'pending',
    field: 'payment_status',
  },
  razorpayOrderId: { type: DataTypes.STRING(255), field: 'razorpay_order_id' },
  razorpayPaymentId: { type: DataTypes.STRING(255), field: 'razorpay_payment_id' },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  },
  trackingNumber: { type: DataTypes.STRING(255), field: 'tracking_number' },
  shippingAddress: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'shipping_address',
  },
}, {
  tableName: 'orders',
  indexes: [
    { fields: ['user_id', 'created_at'] },
    { fields: ['status'] },
    { fields: ['tracking_token'] },
  ],
});

module.exports = Order;
