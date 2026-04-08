# ShopEase — Frontend

React 18 + Vite + Redux Toolkit + Tailwind CSS e-commerce frontend.

---

## 📁 Project Structure

```
shopease-frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── App.jsx                      ← Routes & guards
    ├── main.jsx                     ← Entry point
    ├── index.css                    ← Tailwind + global styles
    ├── redux/
    │   ├── store.js
    │   └── slices/
    │       ├── authSlice.js         ← JWT auth state
    │       ├── cartSlice.js         ← Cart (localStorage backed)
    │       └── uiSlice.js           ← Dark mode, mobile menu
    ├── services/
    │   ├── api.js                   ← Axios instance + interceptors
    │   ├── authService.js
    │   ├── productService.js
    │   └── index.js                 ← order/user/coupon/admin
    ├── hooks/index.js               ← useDebounce, useFetch, etc.
    ├── utils/helpers.js             ← fmtPrice, getInitials, etc.
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.jsx           ← Sticky nav + mobile drawer
    │   │   └── Footer.jsx
    │   ├── common/
    │   │   ├── Modal.jsx
    │   │   ├── EmptyState.jsx
    │   │   ├── PageSpinner.jsx
    │   │   └── SkeletonCard.jsx
    │   └── product/
    │       ├── ProductCard.jsx
    │       └── ProductGrid.jsx      ← Filters + grid + load more
    └── pages/
        ├── HomePage.jsx
        ├── ProductsPage.jsx
        ├── ProductDetailPage.jsx
        ├── CartPage.jsx
        ├── CheckoutPage.jsx
        ├── OrdersPage.jsx
        ├── WishlistPage.jsx
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── ProfilePage.jsx
        ├── NotFoundPage.jsx
        └── admin/
            ├── AdminLayout.jsx      ← Sidebar + nested routes
            ├── AdminDashboard.jsx
            ├── AdminProducts.jsx    ← Full CRUD with modal
            ├── AdminOrders.jsx      ← Status update
            └── AdminUsers.jsx
```

---

## ⚡ Quick Start

### 1. Prerequisites

- **Node.js** v18+
- Backend running at `http://localhost:5000` (see shopease-backend README)

### 2. Install Dependencies

```bash
cd shopease-frontend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

`.env` contents:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Start Development Server

```bash
npm run dev
```

App runs at: **http://localhost:5173**

### 5. Build for Production

```bash
npm run build
npm run preview   # preview the built app locally
```

---

## 🔑 Demo Credentials

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| User  | user@shopease.com      | user123   |
| Admin | admin@shopease.com     | admin123  |

Or use the **Quick Login** buttons on the login page.

---

## 🗺️ Routes

| Path              | Access      | Description              |
|-------------------|-------------|--------------------------|
| `/`               | Public      | Home + hero + products   |
| `/products`       | Public      | Full product listing      |
| `/products/:id`   | Public      | Product detail + related |
| `/cart`           | Public      | Shopping cart            |
| `/wishlist`       | Public*     | Saved items              |
| `/login`          | Guest only  | Login form               |
| `/register`       | Guest only  | Registration form        |
| `/checkout`       | Auth        | Multi-step checkout      |
| `/orders`         | Auth        | Order history            |
| `/profile`        | Auth        | Account settings         |
| `/admin`          | Admin only  | Dashboard                |
| `/admin/products` | Admin only  | Product CRUD             |
| `/admin/orders`   | Admin only  | Order management         |
| `/admin/users`    | Admin only  | User list                |

\* Wishlist data requires sign-in to load from API

---

## 🎨 Tech Decisions

- **Redux Toolkit** — auth token, cart, and UI state
- **React Hook Form** — validation fires on submit, clears on keystroke
- **Framer Motion** — page transitions, card hover, modal scale-in
- **React Hot Toast** — consistent success/error/info notifications
- **Axios interceptors** — auto-attach Bearer token, auto-logout on 401
- **localStorage** — cart and auth token persist across page refresh
- **Lazy loading** — all pages are code-split via React.lazy + Suspense
- **Debounced search** — 300ms debounce, queries backend not client

---

## 🛠 Scripts

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # Production build to /dist
npm run preview  # Serve the production build locally
npm run lint     # ESLint
```
