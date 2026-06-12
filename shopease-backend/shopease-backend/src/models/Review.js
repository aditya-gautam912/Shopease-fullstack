const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    field: 'product_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    field: 'user_id',
  },
  userName: { type: DataTypes.STRING(100), allowNull: false, field: 'user_name' },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: { args: [1], msg: 'Rating must be at least 1' }, max: { args: [5], msg: 'Rating cannot exceed 5' } },
  },
  title: {
    type: DataTypes.STRING(120),
    defaultValue: '',
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_visible',
  },
}, {
  tableName: 'reviews',
  indexes: [
    { unique: true, fields: ['product_id', 'user_id'] },
    { fields: ['product_id', 'created_at'] },
  ],
});

module.exports = Review;
