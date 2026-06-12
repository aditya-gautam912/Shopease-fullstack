const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const crypto = require('crypto');

const Newsletter = sequelize.define('Newsletter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: { msg: 'Please provide a valid email' } },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  unsubscribeToken: {
    type: DataTypes.STRING(255),
    unique: true,
    field: 'unsubscribe_token',
    defaultValue: () => crypto.randomBytes(32).toString('hex'),
  },
  subscribedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'subscribed_at',
  },
}, {
  tableName: 'newsletters',
});

module.exports = Newsletter;
