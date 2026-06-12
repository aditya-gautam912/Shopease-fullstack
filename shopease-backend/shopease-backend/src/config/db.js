/**
 * src/config/db.js
 * Initialises and exports a Sequelize instance connected to PostgreSQL.
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅  PostgreSQL connected: ${sequelize.options.host}`);
  } catch (error) {
    console.error(`❌  PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
