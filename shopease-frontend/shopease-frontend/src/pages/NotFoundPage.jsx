/**
 * src/pages/NotFoundPage.jsx
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-8xl font-extrabold text-primary-100 dark:text-primary-900 mb-4">404</p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary px-8 py-3">Back to Home</Link>
      </motion.div>
    </div>
  );
}