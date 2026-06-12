const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');

const { connectDB, sequelize } = require('./src/config/db');
require('./src/models'); // register model associations
const errorHandler = require('./src/middleware/errorHandler');
const { sanitize } = require('./src/middleware/sanitize');
const { generalLimiter, apiAbuseLimiter } = require('./src/middleware/rateLimiter');
const { csrfProtection, csrfErrorHandler, getCsrfToken } = require('./src/middleware/csrf');

const authRoutes    = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes   = require('./src/routes/orderRoutes');
const userRoutes    = require('./src/routes/userRoutes');
const couponRoutes  = require('./src/routes/couponRoutes');
const adminRoutes   = require('./src/routes/adminRoutes');
const newsletterRoutes = require('./src/routes/newsletterRoutes');
const bannerRoutes    = require('./src/routes/bannerRoutes');
const { productReviewRouter, standaloneRouter: reviewRouter } = require('./src/routes/reviewRoutes');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost',
  'capacitor://localhost',
];

const corsOrigins = new Set([...allowedOrigins, ...defaultDevOrigins]);

app.set('trust proxy', 1);

app.use('/uploads', express.static(require('path').join(__dirname, 'public/uploads')));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use('/api', apiAbuseLimiter);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(sanitize);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ShopEase API is running 🚀' });
});

app.get('/api/csrf-token', getCsrfToken);

app.use('/api', csrfProtection);

app.use('/api/auth',     authRoutes);
app.use('/api/products', generalLimiter, productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/users',    generalLimiter, userRoutes);
app.use('/api/coupons',  generalLimiter, couponRoutes);
app.use('/api/admin',    generalLimiter, adminRoutes);
app.use('/api/newsletter', generalLimiter, newsletterRoutes);
app.use('/api/banners',    generalLimiter, bannerRoutes);
app.use('/api/products/:productId/reviews', productReviewRouter);
app.use('/api/reviews',  generalLimiter, reviewRouter);

app.use(csrfErrorHandler);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.DATABASE_URL) {
    console.error(`❌  Missing DATABASE_URL. Create ${path.resolve(__dirname, '.env')} from .env.example and restart the server.`);
    process.exit(1);
  }

  await connectDB();

  // Sync tables in development (safe CREATE TABLE IF NOT EXISTS).
  // Production should use migrations: npm run migrate
  if (process.env.NODE_ENV === 'development') {
    await sequelize.sync();
  }

  app.listen(PORT, () => {
    console.log(`\n🚀  ShopEase API running on http://localhost:${PORT}`);
    console.log(`📦  Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer().catch((error) => {
  console.error(`❌  Server startup failed: ${error.message}`);
  process.exit(1);
});
