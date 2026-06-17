const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('../src/config/db');

const FIXES = [
  {
    title: 'Genuine Leather Crossbody Bag',
    image: 'https://images.pexels.com/photos/16690455/pexels-photo-16690455.jpeg?auto=compress&w=600',
  },
  {
    title: 'Smart Watch Series X — Health & Fitness',
    image: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&w=600',
  },
  {
    title: 'Electric Spin Scrubber — Cordless 3-Speed',
    image: 'https://isorepublic.com/wp-content/uploads/2018/11/cleaning-brush-1100x733.jpg',
  },
];

const fixup = async () => {
  try {
    await sequelize.authenticate();

    let totalFixed = 0;
    for (const { title, image } of FIXES) {
      const [result] = await sequelize.query(
        `UPDATE products SET image = :image, images = :images::jsonb WHERE title = :title AND image != :image`,
        { replacements: { title, image, images: JSON.stringify([image]) } },
      );
      totalFixed += result.rowCount;
    }

    if (totalFixed > 0) {
      console.log(`✅  Fixed ${totalFixed} product image(s)`);
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
