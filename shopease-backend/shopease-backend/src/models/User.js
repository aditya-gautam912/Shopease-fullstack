const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'Name is required' } },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: { msg: 'Please enter a valid email' } },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { len: { args: [6, 128], msg: 'Password must be at least 6 characters' } },
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  emailVerificationToken: { type: DataTypes.STRING(255) },
  emailVerificationExpire: { type: DataTypes.DATE },
  resetPasswordToken: { type: DataTypes.STRING(255) },
  resetPasswordExpire: { type: DataTypes.DATE },
  twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  twoFactorSecret: { type: DataTypes.STRING(255) },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  defaultScope: { attributes: { exclude: ['password', 'emailVerificationToken', 'emailVerificationExpire', 'resetPasswordToken', 'resetPasswordExpire', 'twoFactorSecret'] } },
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

User.prototype.matchPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = User;
