const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: { msg: 'Product title is required' } },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0], msg: 'Price cannot be negative' } },
  },
  oldPrice: {
    type: DataTypes.DECIMAL(10, 2),
    validate: { min: { args: [0], msg: 'Old price cannot be negative' } },
  },
  category: {
    type: DataTypes.ENUM('electronics', 'fashion', 'home', 'sports', 'beauty'),
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  ratingRate: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0,
    field: 'rating_rate',
    validate: { min: 0, max: 5 },
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'rating_count',
    validate: { min: 0 },
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: { min: { args: [0], msg: 'Stock cannot be negative' } },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'products',
  indexes: [
    { fields: ['category'] },
    { fields: ['price'] },
    { fields: ['is_active'] },
    { fields: ['is_active', 'category', 'price'] },
  ],
});

module.exports = Product;
