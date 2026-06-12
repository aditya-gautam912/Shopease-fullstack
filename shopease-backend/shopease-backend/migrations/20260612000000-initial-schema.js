'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // ── users ────────────────────────────────────────────────
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('user', 'admin'), defaultValue: 'user' },
      is_email_verified: { type: Sequelize.BOOLEAN, defaultValue: true, field: 'is_email_verified' },
      email_verification_token: { type: Sequelize.STRING(255) },
      email_verification_expire: { type: Sequelize.DATE },
      reset_password_token: { type: Sequelize.STRING(255) },
      reset_password_expire: { type: Sequelize.DATE },
      two_factor_enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      two_factor_secret: { type: Sequelize.STRING(255) },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── addresses ────────────────────────────────────────────
    await queryInterface.createTable('addresses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      street: { type: Sequelize.STRING(255), allowNull: false },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), defaultValue: '' },
      zip: { type: Sequelize.STRING(20), allowNull: false },
      country: { type: Sequelize.STRING(100), defaultValue: 'US' },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── refresh_tokens ───────────────────────────────────────
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      token: { type: Sequelize.STRING(500), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── products ─────────────────────────────────────────────
    await queryInterface.createTable('products', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      old_price: { type: Sequelize.DECIMAL(10, 2) },
      category: { type: Sequelize.ENUM('electronics', 'fashion', 'home', 'sports', 'beauty'), allowNull: false },
      image: { type: Sequelize.STRING(500), allowNull: false },
      images: { type: Sequelize.ARRAY(Sequelize.STRING(500)), defaultValue: [] },
      rating_rate: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0 },
      rating_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      stock: { type: Sequelize.INTEGER, defaultValue: 100 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── product_variants ─────────────────────────────────────
    await queryInterface.createTable('product_variants', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      product_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      sku: { type: Sequelize.STRING(100), allowNull: false },
      size: { type: Sequelize.STRING(50), defaultValue: '' },
      color: { type: Sequelize.STRING(50), defaultValue: '' },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      stock: { type: Sequelize.INTEGER, allowNull: false },
      image: { type: Sequelize.STRING(500), defaultValue: '' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── cart_items ───────────────────────────────────────────
    await queryInterface.createTable('cart_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: Sequelize.STRING(255), allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      image: { type: Sequelize.STRING(500), allowNull: false },
      category: { type: Sequelize.STRING(100), defaultValue: '' },
      stock: { type: Sequelize.INTEGER, defaultValue: 99 },
      qty: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── wishlist_items ───────────────────────────────────────
    await queryInterface.createTable('wishlist_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── recently_viewed ──────────────────────────────────────
    await queryInterface.createTable('recently_viewed', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── orders ───────────────────────────────────────────────
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      guest_email: { type: Sequelize.STRING(255) },
      guest_name: { type: Sequelize.STRING(100) },
      guest_phone: { type: Sequelize.STRING(20) },
      tracking_token: { type: Sequelize.STRING(255) },
      items: { type: Sequelize.JSONB, allowNull: false },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      discount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      shipping: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      coupon: { type: Sequelize.STRING(50) },
      payment_method: { type: Sequelize.ENUM('card', 'upi', 'netbanking', 'wallet', 'cod'), allowNull: false },
      payment_status: { type: Sequelize.ENUM('paid', 'pending'), defaultValue: 'pending' },
      razorpay_order_id: { type: Sequelize.STRING(255) },
      razorpay_payment_id: { type: Sequelize.STRING(255) },
      status: { type: Sequelize.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'), defaultValue: 'pending' },
      tracking_number: { type: Sequelize.STRING(255) },
      shipping_address: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── reviews ──────────────────────────────────────────────
    await queryInterface.createTable('reviews', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      product_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      user_name: { type: Sequelize.STRING(100), allowNull: false },
      rating: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING(120), defaultValue: '' },
      body: { type: Sequelize.TEXT, allowNull: false },
      is_visible: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── coupons ──────────────────────────────────────────────
    await queryInterface.createTable('coupons', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255) },
      type: { type: Sequelize.ENUM('percentage', 'fixed'), allowNull: false },
      discount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      min_order_value: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      expires_at: { type: Sequelize.DATE },
      usage_limit: { type: Sequelize.INTEGER },
      used_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── banners ──────────────────────────────────────────────
    await queryInterface.createTable('banners', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT },
      image: { type: Sequelize.STRING(500), allowNull: false },
      link: { type: Sequelize.STRING(500) },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      start_date: { type: Sequelize.DATE },
      end_date: { type: Sequelize.DATE },
      position: { type: Sequelize.STRING(50) },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── returns ──────────────────────────────────────────────
    await queryInterface.createTable('returns', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      order_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      items: { type: Sequelize.JSONB, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT },
      images: { type: Sequelize.ARRAY(Sequelize.STRING(500)), defaultValue: [] },
      status: { type: Sequelize.ENUM('requested', 'approved', 'rejected', 'refunded'), defaultValue: 'requested' },
      refund_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      refund_method: { type: Sequelize.STRING(50) },
      razorpay_refund_id: { type: Sequelize.STRING(255) },
      admin_notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── tickets ──────────────────────────────────────────────
    await queryInterface.createTable('tickets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      subject: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.ENUM('open', 'in-progress', 'resolved', 'closed'), defaultValue: 'open' },
      priority: { type: Sequelize.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
      responses: { type: Sequelize.JSONB, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── newsletters ──────────────────────────────────────────
    await queryInterface.createTable('newsletters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      unsubscribe_token: { type: Sequelize.STRING(255), allowNull: false },
      subscribed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── Indexes ──────────────────────────────────────────────
    await queryInterface.addIndex('reviews', ['product_id', 'user_id'], { unique: true });
    await queryInterface.addIndex('reviews', ['product_id', 'created_at']);
    await queryInterface.addIndex('orders', ['user_id', 'created_at']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['tracking_token']);
    await queryInterface.addIndex('wishlist_items', ['user_id', 'product_id'], { unique: true });
    await queryInterface.addIndex('recently_viewed', ['user_id', 'updated_at']);
    await queryInterface.addIndex('newsletters', ['email'], { unique: true });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('newsletters');
    await queryInterface.dropTable('tickets');
    await queryInterface.dropTable('returns');
    await queryInterface.dropTable('banners');
    await queryInterface.dropTable('coupons');
    await queryInterface.dropTable('reviews');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('recently_viewed');
    await queryInterface.dropTable('wishlist_items');
    await queryInterface.dropTable('cart_items');
    await queryInterface.dropTable('product_variants');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('addresses');
    await queryInterface.dropTable('users');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_category"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_payment_method"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_payment_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coupons_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_returns_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_priority"');
  },
};
