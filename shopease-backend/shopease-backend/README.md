# ShopEase — Backend API

Node.js + Express + MongoDB REST API for the ShopEase e-commerce platform.

---

## 📁 Project Structure

```
shopease-backend/
├── server.js                        ← Entry point
├── package.json
├── .env.example                     ← Copy to .env
├── seed/
│   └── seed.js                      ← Database seeder
└── src/
    ├── config/
    │   └── db.js                    ← MongoDB connection
    ├── controllers/
    │   ├── authController.js
    │   ├── productController.js
    │   ├── orderController.js
    │   ├── userController.js
    │   ├── couponController.js
    │   └── adminController.js
    ├── middleware/
    │   ├── authMiddleware.js        ← JWT verification
    │   ├── adminMiddleware.js       ← Role guard
    │   ├── errorHandler.js         ← Global error handler
    │   └── validate.js             ← express-validator helper
    ├── models/
    │   ├── User.js
    │   ├── Product.js
    │   └── Order.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── productRoutes.js
    │   ├── orderRoutes.js
    │   ├── userRoutes.js
    │   ├── couponRoutes.js
    │   └── adminRoutes.js
    └── utils/
        ├── generateToken.js
        ├── coupons.js
        └── asyncHandler.js
```

---

## ⚡ Quick Start

### 1. Prerequisites

- **Node.js** v18 or higher → https://nodejs.org
- **MongoDB** (local or Atlas)
  - Local: https://www.mongodb.com/try/download/community
  - Atlas (cloud, free): https://www.mongodb.com/atlas
- **Git** → https://git-scm.com

Verify installations:
```bash
node --version    # v18+
npm --version     # 9+
mongod --version  # 6+ (if using local MongoDB)
```

---

### 2. Install Dependencies

```bash
cd shopease-backend
npm install
```

---

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/shopease
JWT_SECRET=replace_this_with_a_long_random_string
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> **MongoDB Atlas users:** Replace `MONGO_URI` with your Atlas connection string:
> `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/shopease`

> **JWT_SECRET tip:** Generate a strong secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

### 4. Seed the Database

```bash
npm run seed
```

Expected output:
```
🔗  Connected to MongoDB
🗑   Clearing existing collections...
✅  Collections cleared
👤  Seeding users...
✅  Created 2 users
📦  Seeding products...
✅  Created 20 products
🛒  Seeding orders...
✅  Created 5 sample orders
❤️   Added wishlist items for demo user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉  DATABASE SEEDED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋  Login Credentials:
  Admin  →  admin@shopease.com  /  admin123
  User   →  user@shopease.com   /  user123
```

---

### 5. Start the Server

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

---

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, returns JWT |

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
    "token": "eyJhbGc...",
    "user": { "_id": "...", "name": "John Doe", "email": "...", "role": "user" }
  }
}
```

---

### Product Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Public | List products (with filters) |
| GET | `/products/:id` | Public | Get single product + related |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Soft-delete product |

**GET /products query params:**
```
?search=headphones
&category=electronics
&minPrice=50
&maxPrice=500
&sort=price-asc        # default | price-asc | price-desc | rating | newest
&page=1
&limit=8
&rating=4              # minimum star rating
```

---

### Order Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | User | Place new order |
| GET | `/orders/my` | User | Get own orders |
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
  "paymentMethod": "card",
  "coupon": "SAVE10",
  "discount": 17.99
}
```

---

### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | User | Get own profile |
| PUT | `/users/me` | User | Update name/email |
| POST | `/users/me/address` | User | Add delivery address |
| DELETE | `/users/me/address/:id` | User | Remove address |
| GET | `/users/wishlist` | User | Get wishlist |
| POST | `/users/wishlist/:productId` | User | Toggle wishlist item |
| GET | `/users` | Admin | List all users |

---

### Coupon Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/coupons/validate` | User | Validate coupon code |

**Body:**
```json
{ "code": "SAVE10", "subtotal": 150.00 }
```

**Valid codes:** `SAVE10` (10%) · `SAVE20` (20%) · `SHOPEASE` (15%)

---

### Admin Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | Admin | Dashboard stats |

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

## 🌱 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shopease.com | admin123 |
| User | user@shopease.com | user123 |

---

## 🛠 Scripts

```bash
npm run dev     # Start with nodemon (development)
npm start       # Start without nodemon (production)
npm run seed    # Seed the database with demo data
```
