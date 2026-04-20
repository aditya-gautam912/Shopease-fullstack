# ShopEase Full Stack

ShopEase is a full-stack e-commerce application built as a two-app workspace:

- `shopease-frontend/shopease-frontend`: React + Vite + Redux Toolkit web app with a Capacitor Android wrapper
- `shopease-backend/shopease-backend`: Node.js + Express + MongoDB REST API

Live Demo: https://shopease-fullstack.vercel.app

## Overview

This project was built to practice complete e-commerce workflows across frontend development, backend APIs, authentication, state management, payments, and deployment.

It is designed as a practical portfolio project rather than a static UI clone. The repository includes both the client application and the supporting backend services needed for a functional shopping platform.

## Features

- User authentication and account flows
- Product listing and product detail pages
- Cart and wishlist management
- Checkout and order handling
- Order tracking and profile management
- Admin dashboard for products, users, orders, and coupons
- Newsletter, review, and coupon support
- Razorpay payment integration

## Key Highlights

- Full-stack monorepo with separate frontend and backend applications
- Real API integration between the React client and Express server
- Admin area for managing store data
- Payment workflow support with Razorpay
- Email and order-related backend flows
- Mobile-ready frontend wrapper with Capacitor

## Tech Stack

### Frontend

- React 18
- Vite
- Redux Toolkit
- React Router
- Tailwind CSS
- Capacitor

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Nodemailer
- Razorpay

## What This Project Demonstrates

- Building a complete React frontend with routing and state management
- Designing REST APIs with Express and MongoDB
- Managing authentication and protected routes
- Connecting payments, user flows, and admin workflows in one system
- Organizing a larger project across multiple apps and environments

## Project Structure

```text
shopease-fullstack/
├── README.md
├── shopease-backend/
│   └── shopease-backend/
└── shopease-frontend/
    └── shopease-frontend/
```

## Local Setup

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB local instance or MongoDB Atlas connection string

### Environment Variables

Backend file: `shopease-backend/shopease-backend/.env`

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/shopease
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
CLIENT_URL=http://localhost:5173
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM=noreply@example.com
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

Frontend file: `shopease-frontend/shopease-frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Install Dependencies

Backend:

```powershell
cd .\shopease-backend\shopease-backend
npm install
```

Frontend:

```powershell
cd .\shopease-frontend\shopease-frontend
npm install
```

## Run the Project

Start the backend:

```powershell
cd .\shopease-backend\shopease-backend
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd .\shopease-frontend\shopease-frontend
npm run dev
```

Application URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Health check: `http://localhost:5000/api/health`

## Core Modules

Frontend modules include:

- authentication
- product browsing
- cart and wishlist
- checkout and orders
- profile and order tracking
- admin dashboard

Backend modules include:

- auth routes
- product and review APIs
- order and coupon APIs
- newsletter support
- admin management endpoints

## Available Scripts

Frontend:

```powershell
npm run dev
npm run build
npm run lint
npm run test
```

Backend:

```powershell
npm run dev
npm run start
npm run lint
npm run test
npm run seed
npm run seed:safe
```

## Notes

- Set `CLIENT_URL` to the deployed frontend origin in production
- Set `VITE_API_BASE_URL` to the deployed backend API URL
- Use strong, different values for `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Enable Razorpay only when the payment keys are configured

## Repository Purpose

This repository showcases practical full-stack development skills through a project that combines UI development, backend architecture, authentication, payments, and deployment-oriented setup.
