/**
 * src/components/layout/Footer.jsx
 * Site-wide footer with brand info, nav links, and copyright.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLS = [
  {
    title: 'Shop',
    links: [
      { label: 'Electronics',   to: '/products?category=electronics' },
      { label: 'Fashion',       to: '/products?category=fashion' },
      { label: 'Home & Living', to: '/products?category=home' },
      { label: 'Sports',        to: '/products?category=sports' },
      { label: 'Beauty',        to: '/products?category=beauty' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My Profile', to: '/profile' },
      { label: 'My Orders',  to: '/orders' },
      { label: 'Wishlist',   to: '/wishlist' },
      { label: 'Cart',       to: '/cart' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us',       soon: true },
      { label: 'Careers',        soon: true },
      { label: 'Press',          soon: true },
      { label: 'Sustainability',  soon: true },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', soon: true },
      { label: 'Returns',     soon: true },
      { label: 'Track Order', to: '/orders' },
      { label: 'Contact Us',  soon: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-extrabold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
              ShopEase
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your one-stop destination for premium products. Fast delivery, easy returns, exceptional service.
            </p>
            <div className="flex gap-3 mt-4">
              {['🔒 Secure', '🚚 Fast Delivery', '↩ Free Returns'].map((t) => (
                <span key={t} className="text-xs text-gray-400 dark:text-gray-500">{t}</span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.soon ? (
                      <button
                        onClick={() => toast('Coming soon! 🚀', { icon: '🛠️' })}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors text-left">
                        {l.label}
                      </button>
                    ) : (
                      <Link to={l.to}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} ShopEase. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Built with React + Node.js + MongoDB
          </p>
        </div>
      </div>
    </footer>
  );
}