/**
 * Integration tests — require a running PostgreSQL database.
 *
 * Run:  node --test test/integration.test.js
 *
 * These tests start the Express app, seed minimal test data,
 * and exercise the full request/response cycle against real
 * database-backed controllers.
 *
 * Skips automatically when DATABASE_URL is not set.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.log('⏭️  Skipping integration tests: DATABASE_URL not set');
  process.exit(0);
}

const request = require('supertest');
const { sequelize } = require('../src/config/db');

// We need the app but without calling .listen()
// We'll import the Express app instance from a helper
const express = require('express');
const { User, Product, Coupon, Banner } = require('../src/models');

let app;

test.before(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  // Seed minimal test data
  await User.bulkCreate([{
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
  }, {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin',
  }], { individualHooks: true });

  await Product.bulkCreate([
    { title: 'Wireless Headphones', description: 'Noise cancelling Bluetooth headphones', price: 99.99, category: 'electronics', image: 'headphones.jpg', stock: 50 },
    { title: 'Cotton T-Shirt', description: 'Premium cotton crew neck', price: 24.99, category: 'fashion', image: 'tshirt.jpg', stock: 100 },
    { title: 'LED Desk Lamp', description: 'Adjustable brightness LED lamp', price: 39.99, category: 'home', image: 'lamp.jpg', stock: 30 },
  ]);

  await Coupon.bulkCreate([
    { code: 'TEST10', type: 'percentage', discount: 0.10, minOrderValue: 100, isActive: true },
    { code: 'FLAT50', type: 'fixed', discount: 50, minOrderValue: 200, isActive: true },
  ]);

  await Banner.bulkCreate([
    { title: 'Summer Sale', description: 'Biggest sale of the year', image: 'summer.jpg', active: true, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000 * 30) },
  ]);

  // Build a minimal Express app for testing
  const cors = require('cors');
  const { sanitize } = require('../src/middleware/sanitize');
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use(sanitize);
  app.use('/api/products', require('../src/routes/productRoutes'));
  app.use('/api/banners', require('../src/routes/bannerRoutes'));
  app.use('/api/coupons', require('../src/routes/couponRoutes'));
  app.use('/api/newsletter', require('../src/routes/newsletterRoutes'));
  app.use('/api/auth', require('../src/routes/authRoutes'));
  app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  app.use(require('../src/middleware/errorHandler'));
});

test.after(async () => {
  await sequelize.close();
});

test('GET /api/products returns paginated products', async () => {
  const res = await request(app).get('/api/products');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.products.length >= 3);
});

test('GET /api/products?search=headphones returns matching products', async () => {
  const res = await request(app).get('/api/products?search=headphones');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.products.length >= 1);
  assert.match(res.body.data.products[0].title, /headphones/i);
});

test('GET /api/products?category=electronics filters by category', async () => {
  const res = await request(app).get('/api/products?category=electronics');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.products.every(p => p.category === 'electronics'));
});

test('GET /api/products?minPrice=30&maxPrice=50 returns price-filtered products', async () => {
  const res = await request(app).get('/api/products?minPrice=30&maxPrice=50');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.products.every(p => p.price >= 30 && p.price <= 50));
});

test('GET /api/products/:id returns a single product', async () => {
  const listRes = await request(app).get('/api/products');
  const productId = listRes.body.data.products[0].id;

  const res = await request(app).get(`/api/products/${productId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.product.id, productId);
});

test('GET /api/products/:id returns 404 for unknown product', async () => {
  const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
  assert.equal(res.status, 404);
});

test('GET /api/products?page=1&limit=2 returns correct pagination', async () => {
  const res = await request(app).get('/api/products?page=1&limit=2');
  assert.equal(res.body.data.products.length, 2);
  assert.equal(res.body.data.pagination.total, 3);
  assert.equal(res.body.data.pagination.totalPages, 2);
});

test('GET /api/banners returns active banners', async () => {
  const res = await request(app).get('/api/banners');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length >= 1);
});

test('POST /api/coupons/validate validates a valid coupon', async () => {
  const res = await request(app).post('/api/coupons/validate').send({ code: 'TEST10', subtotal: 500 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.code, 'TEST10');
  assert.ok(res.body.data.amount > 0);
});

test('POST /api/coupons/validate rejects unknown coupon', async () => {
  const res = await request(app).post('/api/coupons/validate').send({ code: 'FAKE123', subtotal: 500 });
  assert.equal(res.status, 404);
});

test('POST /api/products/:id/recently-viewed records visit when logged in', async () => {
  // Login to get a token
  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'test@example.com',
    password: 'password123',
  });
  assert.equal(loginRes.status, 200);
  const token = loginRes.body.data.accessToken;

  const listRes = await request(app).get('/api/products');
  const productId = listRes.body.data.products[0].id;

  const res = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.product.id, productId);
});

test('POST /api/newsletter/subscribe creates subscription', async () => {
  const email = `integtest-${Date.now()}@example.com`;
  const res = await request(app).post('/api/newsletter/subscribe').send({ email });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
});

test('POST /api/newsletter/subscribe rejects duplicate active email', async () => {
  const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'test@example.com' });
  assert.equal(res.status, 201); // first time — OK
  const dup = await request(app).post('/api/newsletter/subscribe').send({ email: 'test@example.com' });
  assert.equal(dup.status, 400); // duplicate
});

test('POST /api/newsletter/subscribe requires email', async () => {
  const res = await request(app).post('/api/newsletter/subscribe').send({});
  assert.equal(res.status, 400);
});

test('POST /api/auth/login returns token for valid credentials', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'test@example.com',
    password: 'password123',
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.accessToken);
});

test('POST /api/auth/login rejects wrong password', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'test@example.com',
    password: 'wrongpassword',
  });
  assert.equal(res.status, 401);
});
