const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductVariant = sequelize.define('ProductVariant', {
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
  sku: { type: DataTypes.STRING(100), allowNull: false },
  size: { type: DataTypes.STRING(50), defaultValue: '' },
  color: { type: DataTypes.STRING(50), defaultValue: '' },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0], msg: 'Price cannot be negative' } },
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: { args: [0], msg: 'Stock cannot be negative' } },
  },
  image: { type: DataTypes.STRING(500), defaultValue: '' },
}, {
  tableName: 'product_variants',
});

module.exports = ProductVariant;
