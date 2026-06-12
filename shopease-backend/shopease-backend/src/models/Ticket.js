const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    references: { model: 'users', key: 'id' },
    field: 'user_id',
  },
  guestEmail: {
    type: DataTypes.STRING(255),
    validate: { isEmail: { msg: 'Please enter a valid email' } },
    field: 'guest_email',
  },
  guestName: { type: DataTypes.STRING(100), field: 'guest_name' },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'in-progress', 'resolved'),
    defaultValue: 'open',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  responses: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
}, {
  tableName: 'tickets',
  indexes: [
    { fields: ['user_id', 'status'] },
    { fields: ['status', 'priority', 'created_at'] },
  ],
});

module.exports = Ticket;
