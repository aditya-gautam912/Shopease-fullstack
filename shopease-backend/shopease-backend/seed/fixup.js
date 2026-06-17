const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('../src/config/db');

const fixup = async () => {
  try {
    await sequelize.authenticate();

    const image = 'https://images.pexels.com/photos/16690455/pexels-photo-16690455.jpeg?auto=compress&w=600';
    const [updated] = await sequelize.query(
      `UPDATE products SET image = :image, images = :images::jsonb WHERE title = 'Genuine Leather Crossbody Bag' AND image != :image`,
      { replacements: { image, images: JSON.stringify([image]) } },
    );

    if (updated.rowCount > 0) {
      console.log(`✅  Fixed ${updated.rowCount} product image(s)`);
    }
  } catch (err) {
    console.error('❌  Fixup failed:', err.message);
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  fixup();
}
