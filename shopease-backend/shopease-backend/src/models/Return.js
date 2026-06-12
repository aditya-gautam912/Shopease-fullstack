const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Return = sequelize.define('Return', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'orders', key: 'id' },
    field: 'order_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    field: 'user_id',
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  reason: {
    type: DataTypes.ENUM('defective', 'wrong-item', 'not-satisfied', 'other'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM('requested', 'approved', 'rejected', 'refunded'),
    defaultValue: 'requested',
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'refund_amount',
    validate: { min: 0 },
  },
  refundMethod: { type: DataTypes.STRING(50), field: 'refund_method' },
  razorpayRefundId: { type: DataTypes.STRING(255), field: 'razorpay_refund_id' },
  adminNotes: { type: DataTypes.TEXT, field: 'admin_notes', defaultValue: '' },
}, {
  tableName: 'returns',
  indexes: [
    { fields: ['user_id', 'created_at'] },
    { fields: ['status'] },
    { fields: ['order_id'] },
  ],
});

module.exports = Return;
