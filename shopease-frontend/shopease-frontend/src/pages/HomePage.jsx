/**
 * src/pages/HomePage.jsx
 * Landing page with hero section, featured categories, and product grid.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useScrollTop } from '../hooks';
import ProductGrid from '../components/product/ProductGrid';

const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: '⚡', color: 'from-blue-500 to-cyan-400',   img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=70' },
  { id: 'fashion',     label: 'Fashion',     icon: '👗', color: 'from-pink-500 to-rose-400',   img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=70' },
  { id: 'home',        label: 'Home',        icon: '🏠', color: 'from-amber-500 to-orange-400',img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&q=70' },
  { id: 'sports',      label: 'Sports',      icon: '🏃', color: 'from-green-500 to-emerald-400',img: 'https://images.unsplash.com/photo-1601925228458-73735f69c57f?w=300&q=70' },
  { id: 'beauty',      label: 'Beauty',      icon: '✨', color: 'from-purple-500 to-violet-400',img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&q=70' },
];

export default function HomePage() {
  useScrollTop([]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-primary-950 to-gray-950 dark:from-gray-950 dark:via-primary-950 dark:to-gray-950 text-white py-20 sm:py-28">
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-bold tracking-widest text-primary-400 uppercase mb-4 px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full">
              🎉 Free shipping on orders over $100
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
              Shop Smarter,
              <br />
              <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Live Better
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-xl mx-auto mb-10">
              Discover thousands of curated products across every category, delivered fast with hassle-free returns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products" className="btn-primary text-base px-8 py-3.5">
                Shop Now →
              </Link>
              <Link to="/register" className="btn-outline text-base px-8 py-3.5 border-white/30 text-white hover:border-white hover:text-white">
                Create Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
              >
                <Link
                  to={`/products?category=${cat.id}`}
                  className="relative group block rounded-2xl overflow-hidden aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <img src={cat.img} alt={cat.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} opacity-70 group-hover:opacity-80 transition-opacity duration-300`} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="text-2xl mb-1">{cat.icon}</span>
                    <span className="text-sm font-bold">{cat.label}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">All Products</h2>
        <ProductGrid />
      </section>

      {/* Value props banner */}
      <section className="bg-primary-500 text-white py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { icon: '🚚', title: 'Free Shipping', sub: 'On orders over $100' },
            { icon: '↩', title: 'Easy Returns',  sub: '30-day return policy' },
            { icon: '🔒', title: 'Secure Payment', sub: 'SSL encrypted checkout' },
            { icon: '🎧', title: '24/7 Support',  sub: 'Always here to help' },
          ].map((v) => (
            <div key={v.title}>
              <div className="text-3xl mb-2">{v.icon}</div>
              <div className="font-bold text-sm">{v.title}</div>
              <div className="text-primary-100 text-xs mt-1">{v.sub}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}