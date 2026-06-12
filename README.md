# ShopEase Full Stack

ShopEase is a full-stack e-commerce application with real user flows, admin operations, REST APIs, and payment-ready architecture.

- **Frontend**: React + Vite + Redux Toolkit + Capacitor (Android)
- **Backend**: Node.js + Express + PostgreSQL (Sequelize ORM)

## Project Structure

```
shopease-fullstack/
├── shopease-frontend/   → React + Vite web app
│   └── shopease-frontend/
└── shopease-backend/    → Express REST API
    └── shopease-backend/
        ├── server.js
        ├── seed/
        ├── migrations/
        ├── test/
        └── src/
            ├── config/
            ├── controllers/   (11 controllers)
            ├── middleware/
            ├── models/        (15 Sequelize models)
            ├── routes/
            ├── services/
            └── utils/
```

## Quick Start

```bash
# Backend
cd shopease-backend/shopease-backend
cp .env.example .env    # edit DATABASE_URL
npm install
npm run migrate
npm run seed
npm run dev             # → http://localhost:5000

# Frontend
cd shopease-frontend/shopease-frontend
cp .env.example .env
npm install
npm run dev             # → http://localhost:5173
```

## Key Tech

| Layer | Stack |
|-------|-------|
| Database | PostgreSQL 14+ with GIN full-text search |
| ORM | Sequelize 6 with pg driver |
| Auth | JWT access + refresh tokens, TOTP 2FA, Google OAuth |
| Payments | Razorpay (test mode) |
| Frontend | React 19, Vite 8, Redux Toolkit, Tailwind CSS |
| Mobile | Capacitor 7 (Android APK) |

## API

Base URL: `http://localhost:5000/api`

All endpoints return `{ success: true, data: {...} }` or `{ success: false, message: "..." }`.

See `shopease-backend/shopease-backend/README.md` for the full API reference.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shopease.com | admin123 |

## Scripts

```bash
npm run dev           # nodemon (backend) / Vite dev (frontend)
npm run seed          # seed database
npm run migrate       # run pending Sequelize migrations
npm test              # 58 tests (42 unit + 16 integration)
```
