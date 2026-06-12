const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  link: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'start_date',
  },
  endDate: {
    type: DataTypes.DATE,
    field: 'end_date',
  },
  position: {
    type: DataTypes.ENUM('hero', 'top-bar', 'sidebar', 'category'),
    defaultValue: 'hero',
  },
}, {
  tableName: 'banners',
  indexes: [
    { fields: ['active', 'start_date', 'end_date'] },
  ],
});

module.exports = Banner;
