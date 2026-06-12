const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    set(val) { this.setDataValue('code', String(val).toUpperCase().trim()); },
    validate: { is: { args: /^[A-Z0-9_-]{2,20}$/, msg: 'Code must be 2-20 alphanumeric characters' } },
  },
  description: { type: DataTypes.STRING(255), defaultValue: '' },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage',
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0], msg: 'Discount cannot be negative' } },
  },
  minOrderValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'min_order_value',
    validate: { min: 0 },
  },
  expiresAt: { type: DataTypes.DATE, field: 'expires_at' },
  usageLimit: { type: DataTypes.INTEGER, field: 'usage_limit', validate: { min: 1 } },
  usedCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'used_count', validate: { min: 0 } },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
}, {
  tableName: 'coupons',
});

module.exports = Coupon;
