const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    field: 'user_id',
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    field: 'product_id',
  },
  title: { type: DataTypes.STRING(255), allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  image: { type: DataTypes.STRING(500), allowNull: false },
  category: { type: DataTypes.STRING(100), defaultValue: '' },
  stock: { type: DataTypes.INTEGER, defaultValue: 99 },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
}, {
  tableName: 'cart_items',
});

module.exports = CartItem;
