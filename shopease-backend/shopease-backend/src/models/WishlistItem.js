const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WishlistItem = sequelize.define('WishlistItem', {
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
}, {
  tableName: 'wishlist_items',
  indexes: [
    { unique: true, fields: ['user_id', 'product_id'] },
  ],
});

module.exports = WishlistItem;
