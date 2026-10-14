/**
 * src/config/db.js
 * Initialises and exports a Sequelize instance connected to PostgreSQL.
 */

const { Sequelize } = require('sequelize');

const isProd = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  // Render Postgres requires SSL in production.
  dialectOptions: isProd ? { ssl: { require: true, rejectUnauthorized: false } } : {},
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log(`✅  PostgreSQL connected: ${sequelize.options.host}`);
      return;
    } catch (error) {
      console.error(`❌  PostgreSQL connection error (attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt === retries) {
        console.error('❌  Giving up on DB connection.');
        process.exit(1);
      }
      // Linear backoff so transient DB blips / cold starts recover instead of crash-looping.
      await sleep(3000 * attempt);
    }
  }
};

module.exports = { sequelize, connectDB };
