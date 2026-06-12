const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RecentlyViewed = sequelize.define('RecentlyViewed', {
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
  tableName: 'recently_viewed',
  indexes: [
    { fields: ['user_id', 'updated_at'] },
  ],
});

module.exports = RecentlyViewed;
