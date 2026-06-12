'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS products_fts_idx
      ON products
      USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS products_fts_idx;
    `);
  },
};
