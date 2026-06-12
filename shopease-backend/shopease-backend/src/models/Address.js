const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  street: { type: DataTypes.STRING(255), allowNull: false },
  city: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100), defaultValue: '' },
  zip: { type: DataTypes.STRING(20), allowNull: false },
  country: { type: DataTypes.STRING(100), defaultValue: 'US' },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'addresses',
});

module.exports = Address;
