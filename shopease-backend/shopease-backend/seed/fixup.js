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
  {
    title: 'Oversized Teddy Fleece Hoodie',
    image: 'https://images.pexels.com/photos/702350/pexels-photo-702350.jpeg?auto=compress&w=600',
  },
  {
    title: 'Hand-Poured Soy Candle Gift Set',
    image: 'https://images.pexels.com/photos/289756/pexels-photo-289756.jpeg?auto=compress&w=600',
  },
  {
    title: 'Smart Digital Air Fryer — 5.8 Quart',
    image: 'https://images.pexels.com/photos/5237903/pexels-photo-5237903.jpeg?auto=compress&w=600',
  },
  {
    title: 'Professional Yoga Mat — 6mm Non-Slip',
    image: 'https://images.pexels.com/photos/4498513/pexels-photo-4498513.jpeg?auto=compress&w=600',
  },
  {
    title: 'Micellar Cleansing Water — 400ml',
    image: 'https://images.pexels.com/photos/8131585/pexels-photo-8131585.jpeg?auto=compress&w=600',
  },
  {
    title: 'Teeth Whitening Kit — LED Accelerator',
    image: 'https://images.pexels.com/photos/4465829/pexels-photo-4465829.jpeg?auto=compress&w=600',
  },
  {
    title: 'Konjac Facial Sponge — 6 Pack',
    image: 'https://images.pexels.com/photos/3762482/pexels-photo-3762482.jpeg?auto=compress&w=600',
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
