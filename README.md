# ShopEase Monorepo

ShopEase is a full-stack e-commerce application with:

- `shopease-frontend/shopease-frontend`: React 18 + Vite + Redux Toolkit web app, plus a Capacitor Android wrapper.
- `shopease-backend/shopease-backend`: Node.js + Express + MongoDB API.

This repository should be treated as a two-app workspace. The nested backend copy that previously lived inside the frontend tree is not part of the supported runtime layout.

## Folder Layout

```text
Full App/
├── README.md
├── shopease-backend/
│   └── shopease-backend/
└── shopease-frontend/
    └── shopease-frontend/
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB 6+ running locally or a MongoDB Atlas connection string

## Environment Variables

Backend file: `shopease-backend/shopease-backend/.env`

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/shopease
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
CLIENT_URL=http://localhost:5173

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM=noreply@example.com

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

Frontend file: `shopease-frontend/shopease-frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Install

Backend:

```powershell
cd "C:\Users\ag950\Full App\shopease-backend\shopease-backend"
npm install
```

Frontend:

```powershell
cd "C:\Users\ag950\Full App\shopease-frontend\shopease-frontend"
npm install
```

## Run Locally

Start the backend first:

```powershell
cd "C:\Users\ag950\Full App\shopease-backend\shopease-backend"
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd "C:\Users\ag950\Full App\shopease-frontend\shopease-frontend"
npm run dev
```

Application URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Health check: `http://localhost:5000/api/health`

## Quality Checks

Frontend:

```powershell
cd "C:\Users\ag950\Full App\shopease-frontend\shopease-frontend"
npm run lint
npm run test
npm run build
```

Backend:

```powershell
cd "C:\Users\ag950\Full App\shopease-backend\shopease-backend"
npm run lint
npm run test
```

## Payments

The supported Razorpay integration lives in:

- `shopease-backend/shopease-backend/src/controllers/orderController.js`
- `shopease-backend/shopease-backend/src/routes/orderRoutes.js`

Order creation for Razorpay is exposed at `POST /api/orders/razorpay-order`. Do not reintroduce a separate payment controller unless it replaces the order-based flow everywhere.

## Deployment Notes

- Set `CLIENT_URL` to the deployed frontend origin.
- Set `VITE_API_BASE_URL` to the deployed backend API URL.
- Use strong, distinct values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Enable Razorpay only when both payment keys are present.
- MongoDB Atlas is recommended for cloud deployment.
