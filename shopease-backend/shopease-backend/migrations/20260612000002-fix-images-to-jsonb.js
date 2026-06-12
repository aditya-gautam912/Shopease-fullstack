'use strict';

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE products ALTER COLUMN images DROP DEFAULT',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE products ALTER COLUMN images TYPE JSONB USING images::text::jsonb',
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE products ALTER COLUMN images SET DEFAULT '[]'::jsonb",
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE returns ALTER COLUMN images DROP DEFAULT',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE returns ALTER COLUMN images TYPE JSONB USING images::text::jsonb',
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE returns ALTER COLUMN images SET DEFAULT '[]'::jsonb",
    );
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE products ALTER COLUMN images DROP DEFAULT',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE products ALTER COLUMN images TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(images))',
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE products ALTER COLUMN images SET DEFAULT '{}'",
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE returns ALTER COLUMN images DROP DEFAULT',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE returns ALTER COLUMN images TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(images))',
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE returns ALTER COLUMN images SET DEFAULT '{}'",
    );
  },
};
