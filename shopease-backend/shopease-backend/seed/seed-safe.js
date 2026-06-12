const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('../src/config/db');
const { User, Product, Coupon } = require('../src/models');
const { USERS, PRODUCTS, COUPONS } = require('./seed-data');

const seedSafe = async () => {
  try {
    await sequelize.authenticate();
    console.log('\n🔗  Connected to PostgreSQL');

    // Only create admin if missing
    const adminCount = await User.count();
    if (adminCount === 0) {
      console.log('👤  Creating admin user...');
      await User.bulkCreate(USERS, { individualHooks: true });
      console.log('✅  Admin user created');
    } else {
      console.log('⏭️  Users table not empty — skipping');
    }

    // Only insert products if table is empty
    const productCount = await Product.count();
    if (productCount === 0) {
      console.log('📦  Seeding products...');
      const productRecords = PRODUCTS.map(p => ({
        title: p.title, description: p.description, price: p.price / 100,
        oldPrice: p.oldPrice ? p.oldPrice / 100 : null, category: p.category,
        image: p.image, images: p.images || [p.image],
        ratingRate: p.rating?.rate || 0, ratingCount: p.rating?.count || 0,
        stock: p.stock || 100, isActive: true,
      }));
      await Product.bulkCreate(productRecords);
      console.log(`✅  Created ${productRecords.length} products`);
    } else {
      console.log('⏭️  Products table not empty — skipping');
    }

    // Upsert default coupons
    console.log('🎟️  Upserting coupons...');
    for (const coupon of COUPONS) {
      await Coupon.findOrCreate({ where: { code: coupon.code }, defaults: coupon });
    }
    console.log('✅  Coupons synced');

    console.log('\n🎉  Seed completed successfully');
  } catch (error) {
    console.error('\n❌  Seed failed:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

seedSafe();
