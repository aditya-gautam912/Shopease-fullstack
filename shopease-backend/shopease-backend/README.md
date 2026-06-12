# ShopEase — Backend API

Node.js + Express + PostgreSQL (Sequelize) REST API for the ShopEase e-commerce platform.
Migrated from MongoDB/Mongoose.

---

## 📁 Project Structure

```
shopease-backend/
├── server.js                          ← Entry point
├── package.json
├── .sequelizerc                       ← Sequelize CLI config
├── .env.example                       ← Copy to .env
├── seed/
│   ├── seed.js                        ← Database seeder
│   └── seed-data.js                   ← Seed data (70 products, coupons)
├── migrations/                        ← Sequelize migration files
│   ├── 20260612000000-initial-schema.js
│   ├── 20260612000001-add-product-fts-index.js
│   └── 20260612000002-fix-images-to-jsonb.js
├── test/
│   ├── coupons.test.js                ← Unit tests
│   ├── generateToken.test.js
│   ├── asyncHandler.test.js
│   ├── authMiddleware.test.js
│   ├── errorHandler.test.js
│   └── integration.test.js            ← 16 API integration tests
└── src/
    ├── config/
    │   ├── db.js                      ← Sequelize + pg connection
    │   └── config.js                  ← Sequelize CLI env config
    ├── controllers/
    │   ├── authController.js          ← Register, login, OAuth, 2FA, refresh
    │   ├── productController.js       ← CRUD, pagination, full-text search
    │   ├── orderController.js         ← Razorpay, invoices, guest orders
    │   ├── userController.js          ← Profile, addresses, wishlist, cart
    │   ├── couponController.js        ← CRUD, validate
    │   ├── bannerController.js        ← Banner CRUD
    │   ├── reviewController.js        ← Reviews with aggregation
    │   ├── returnController.js        ← Returns with Razorpay refunds
    │   ├── adminController.js         ← Dashboard analytics
    │   ├── newsletterController.js    ← Subscribe / unsubscribe
    │   └── twoFactorController.js     ← TOTP + email OTP
    ├── middleware/
    │   ├── authMiddleware.js          ← JWT verification
    │   ├── adminMiddleware.js         ← Role guard
    │   ├── errorHandler.js           ← Sequelize-aware error handler
    │   ├── validate.js               ← express-validator helper
    │   ├── rateLimiter.js
    │   ├── csrf.js
    │   ├── sanitize.js
    │   └── upload.js
    ├── models/
    │   ├── index.js                   ← Model loader + associations
    │   ├── User.js
    │   ├── Product.js
    │   ├── Order.js
    │   ├── Review.js
    │   ├── Coupon.js
    │   ├── Banner.js
    │   ├── Return.js
    │   ├── Ticket.js
    │   ├── Newsletter.js
    │   ├── Address.js
    │   ├── CartItem.js
    │   ├── WishlistItem.js
    │   ├── RecentlyViewed.js
    │   ├── RefreshToken.js
    │   └── ProductVariant.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── productRoutes.js
    │   ├── orderRoutes.js
    │   ├── userRoutes.js
    │   ├── couponRoutes.js
    │   ├── bannerRoutes.js
    │   ├── reviewRoutes.js
    │   ├── adminRoutes.js
    │   └── newsletterRoutes.js
    ├── services/
    │   ├── inventoryService.js        ← Atomic stock decrement
    │   ├── invoiceService.js          ← PDF invoice generation
    │   └── emailService.js            ← Transactional emails
    └── utils/
        ├── generateToken.js
        ├── coupons.js
        └── asyncHandler.js
```

---

## ⚡ Quick Start

### 1. Prerequisites

- **Node.js** v18 or higher → https://nodejs.org
- **PostgreSQL 14+** (local or cloud)
  - Local (Windows): https://www.postgresql.org/download/windows
  - Cloud (free): https://neon.tech or https://supabase.com
- **Git** → https://git-scm.com

Verify installations:
```bash
node --version    # v18+
npm --version     # 9+
psql --version    # 14+
```

---

### 2. Create the Database

```bash
psql -U postgres -c "CREATE DATABASE shopease;"
```

---

### 3. Install Dependencies

```bash
cd shopease-backend
npm install
```

---

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopease
JWT_SECRET=replace_this_with_a_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
CSRF_SECRET=a_csrf_secret_string
CLIENT_URL=http://localhost:5173
NODE_ENV=development

RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

> **JWT_SECRET tip:** Generate a strong secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

### 5. Run Migrations

```bash
npm run migrate
```

This creates all tables, indexes, and full-text search infrastructure.

---

### 6. Seed the Database

```bash
npm run seed
```

Expected output:
```
🔗  Connected to PostgreSQL
🗑   Clearing existing data...
✅  Tables cleared
👤  Seeding users...
✅  Created 1 user(s)
📦  Seeding products...
✅  Created 70 products
🎟️  Seeding coupons...
✅  Created 4 coupons

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉  DATABASE SEEDED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋  Login Credentials:
  Admin  →  admin@shopease.com  /  admin123

📊  Seeded:
  👤 1 user(s)
  📦 70 products (16 electronics · 14 fashion · 14 home · 13 sports · 13 beauty)
```

---

### 7. Run Tests (optional)

```bash
npm test
```

Expected output:
```
 PASS  test/coupons.test.js
 PASS  test/generateToken.test.js
 PASS  test/authMiddleware.test.js
 PASS  test/asyncHandler.test.js
 PASS  test/errorHandler.test.js
 PASS  test/integration.test.js

Tests:       58 passed (42 unit + 16 integration)
```

---

### 8. Start the Server

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Server starts at: **http://localhost:5000**

Health check: **http://localhost:5000/api/health**

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <your_jwt_token>
```

All UUID-based IDs are returned as both `id` and `_id` for backward compatibility.

---

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, returns JWT + refresh token |
| POST | `/auth/google` | Public | Google OAuth login |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | User | Invalidate refresh token |

**Register body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "mypassword"
}
```

**Login body:**
```json
{
  "email": "john@example.com",
  "password": "mypassword"
}
```

**Success response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "dGhpcyBpcyBh...",
    "user": { "_id": "...", "id": "...", "name": "John Doe", "email": "...", "role": "user" }
  }
}
```

---

### 2FA Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/2fa/setup` | User | Generate TOTP secret + QR code |
| POST | `/auth/2fa/verify` | User | Verify and enable 2FA |
| POST | `/auth/2fa/disable` | User | Disable 2FA |

---

### Product Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Public | List products (with filters + full-text search) |
| GET | `/products/:id` | Public | Get single product + related + reviews |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Soft-delete product |
| GET | `/products/inventory/low-stock` | Admin | Low-stock / out-of-stock products |

**GET /products query params:**
```
?search=headphones          # full-text search (GIN-indexed)
&category=electronics
&minPrice=50
&maxPrice=500
&sort=price-asc             # default | price-asc | price-desc | rating | newest
&page=1
&limit=8
&rating=4                   # minimum star rating
```

**Product response fields:** `id`, `title`, `description`, `price`, `oldPrice`, `category`, `image`, `images`, `ratingRate`, `ratingCount`, `stock`, `isActive`

---

### Order Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | User/Guest | Place new order (Razorpay) |
| GET | `/orders/my` | User | Get own orders |
| GET | `/orders/track/:token` | Public | Track guest order |
| GET | `/orders/:id/invoice` | User/Admin | Download PDF invoice |
| GET | `/orders` | Admin | Get all orders |
| PUT | `/orders/:id/status` | Admin | Update order status |

**POST /orders body:**
```json
{
  "items": [
    { "productId": "abc123", "qty": 2 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "paymentMethod": "razorpay",
  "razorpayPaymentId": "pay_xxx",
  "razorpayOrderId": "order_xxx",
  "coupon": "SAVE10"
}
```

---

### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | User | Get own profile (including 2FA status) |
| PUT | `/users/me` | User | Update name/email/password |
| POST | `/users/me/address` | User | Add delivery address |
| PUT | `/users/me/address/:id` | User | Update address |
| DELETE | `/users/me/address/:id` | User | Remove address |
| GET | `/users/wishlist` | User | Get wishlist (with product details) |
| POST | `/users/wishlist/:productId` | User | Toggle wishlist item |
| GET | `/users/cart` | User | Get cart (with product details) |
| PUT | `/users/cart` | User | Replace entire cart |
| POST | `/users/recently-viewed` | User | Track recently viewed product |
| GET | `/users/recently-viewed` | User | Get recently viewed |
| GET | `/users` | Admin | List all users |

---

### Review Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reviews` | User | Create review |
| PUT | `/reviews/:id` | User | Update own review |
| DELETE | `/reviews/:id` | User | Delete own review |
| GET | `/reviews/product/:productId` | Public | Get product reviews (paginated, with stats) |
| GET | `/reviews` | Admin | Get all reviews |
| PUT | `/reviews/:id/visibility` | Admin | Approve / hide review |

---

### Coupon Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/coupons/validate` | Public | Validate coupon code |
| GET | `/coupons` | Admin | List all coupons |
| POST | `/coupons` | Admin | Create coupon |
| PUT | `/coupons/:id` | Admin | Update coupon |
| DELETE | `/coupons/:id` | Admin | Delete coupon |
| PUT | `/coupons/:id/toggle` | Admin | Toggle active status |

**POST /coupons/validate body:**
```json
{ "code": "SAVE10", "subtotal": 150.00 }
```

**Valid codes:** `SAVE10` (10%) · `SAVE20` (20%) · `SHOPEASE` (15%)

---

### Banner Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/banners` | Public | Get active banners |
| GET | `/banners/all` | Admin | Get all banners |
| POST | `/banners` | Admin | Create banner |
| PUT | `/banners/:id` | Admin | Update banner |
| DELETE | `/banners/:id` | Admin | Delete banner |

---

### Return Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/returns` | User | Request return (Razorpay refund) |
| GET | `/returns/my` | User | Get own returns |
| GET | `/returns` | Admin | Get all returns |
| PUT | `/returns/:id/status` | Admin | Approve / reject return |

---

### Ticket / Support Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tickets` | User | Create support ticket |
| GET | `/tickets/my` | User | Get own tickets |
| GET | `/tickets` | Admin | Get all tickets |
| PUT | `/tickets/:id/status` | Admin | Update ticket status |

---

### Newsletter Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/newsletter/subscribe` | Public | Subscribe email |
| GET | `/newsletter/unsubscribe/:token` | Public | Unsubscribe |
| GET | `/newsletter` | Admin | List all subscribers |
| DELETE | `/newsletter/:id` | Admin | Remove subscriber |

---

### Admin Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | Admin | Dashboard stats (revenue, orders, users, charts) |

---

## 🔒 Response Format

All endpoints return consistent JSON:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "message": "Human-readable error message" }
```

**Validation error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "email": "Please enter a valid email address" }
}
```

---

## 🔑 Key Design Decisions

| Topic | Approach |
|-------|----------|
| **Database** | PostgreSQL 14+ with Sequelize ORM (v6) |
| **ORM** | Sequelize with `pg` driver, raw SQL for aggregations |
| **IDs** | UUID v4 primary keys; `_id` virtual field added to all models for backward compat |
| **Stock** | Atomic `UPDATE products SET stock = stock - N WHERE id = X AND stock >= N` inside a transaction |
| **Search** | GIN index on `to_tsvector('english', title || ' ' || description)` + `plainto_tsquery` |
| **Images** | Stored as JSONB (not PostgreSQL ARRAY) to avoid serialization issues |
| **Cart / Wishlist** | Normalized separate tables (CartItem, WishlistItem) instead of embedded arrays |
| **Snapshots** | Order items, shipping address stored as JSONB for audit trails |
| **Enums** | PostgreSQL ENUM types for constrained strings (category, order status, etc.) |
| **Error handling** | Sequelize class hierarchy (UniqueConstraint → ForeignKey → Validation → Database) |
| **Auth** | JWT access + refresh tokens, TOTP 2FA (speakeasy), Google OAuth |

---

## 🌱 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shopease.com | admin123 |

---

## 🛠 Scripts

```bash
npm run dev       # Start with nodemon (development, hot-reload)
npm start         # Start without nodemon (production)
npm run seed      # Seed the database with demo data
npm run migrate   # Run pending migrations
npm run migrate:undo  # Rollback last migration
npm test          # Run all tests (58 total)
npm run lint      # Lint with ESLint
```
