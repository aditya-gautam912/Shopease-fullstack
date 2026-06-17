const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('../src/config/db');
const { User, Product, Coupon, Order, Banner, Review, ProductVariant } = require('../src/models');

// Load product data from the existing seed file and reuse it
const { USERS, PRODUCTS, COUPONS, BANNERS, REVIEW_DATA } = require('./seed-data');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('\n🔗  Connected to PostgreSQL');

    console.log('🗑   Clearing existing data...');
    await sequelize.query('TRUNCATE TABLE users, products, coupons, orders, product_variants, addresses, refresh_tokens, cart_items, wishlist_items, recently_viewed, reviews, returns, tickets, newsletters, banners RESTART IDENTITY CASCADE');

    console.log('👤  Seeding users...');
    const createdUsers = await User.bulkCreate(USERS, { individualHooks: true });
    console.log(`✅  Created ${createdUsers.length} user(s)`);

    console.log('📦  Seeding products...');
    const productRecords = PRODUCTS.map(p => ({
      title: p.title,
      description: p.description,
      price: p.price,
      oldPrice: p.oldPrice || null,
      category: p.category,
      image: p.image,
      images: p.images || [p.image],
      ratingRate: p.rating?.rate || 0,
      ratingCount: p.rating?.count || 0,
      stock: p.stock || 100,
      isActive: true,
    }));
    await Product.bulkCreate(productRecords);
    console.log(`✅  Created ${productRecords.length} products`);

    console.log('🎟️  Seeding coupons...');
    await Coupon.bulkCreate(COUPONS);
    console.log('✅  Created 4 coupons');

    console.log('🖼️  Seeding banners...');
    await Banner.bulkCreate(BANNERS);
    console.log(`✅  Created ${BANNERS.length} banners`);

    // Dynamically assign reviews to the first few products
    console.log('⭐  Seeding reviews...');
    const createdProducts = await Product.findAll({ limit: REVIEW_DATA.length, order: [['createdAt', 'ASC']] });
    const reviews = REVIEW_DATA.map((r, i) => ({
      productId: createdProducts[i % createdProducts.length].id,
      userId: createdUsers[0].id,
      userName: r.userName,
      rating: r.rating,
      title: r.title,
      body: r.body,
    }));
    await Review.bulkCreate(reviews);
    console.log(`✅  Created ${reviews.length} reviews`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉  DATABASE SEEDED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋  Login Credentials:');
    console.log('  Admin  →  admin@shopease.com  /  admin123');
    console.log('\n📊  Seeded:');
    console.log(`  👤 ${createdUsers.length} user(s)`);
    console.log(`  📦 ${productRecords.length} products (16 electronics · 14 fashion · 14 home · 13 sports · 13 beauty)`);
    console.log(`  🖼️  ${BANNERS.length} banners`);
    console.log(`  ⭐ ${reviews.length} reviews`);
    console.log('\n🚀  You can now start the server: npm run dev\n');

  } catch (error) {
    console.error('\n❌  Seed failed:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach((e) => console.error('  →', e.message));
    }
  } finally {
    await sequelize.close();
    console.log('🔌  Disconnected from PostgreSQL');
    process.exit(0);
  }
};

if (require.main === module) {
  seed();
}

module.exports = { USERS, PRODUCTS, COUPONS, BANNERS, REVIEW_DATA };
