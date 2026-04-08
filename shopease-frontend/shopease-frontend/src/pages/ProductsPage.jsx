/**
 * src/pages/ProductsPage.jsx
 * Full product listing page with filters - mobile optimized
 */
import React from 'react';
import { useScrollTop } from '../hooks';
import ProductGrid from '../components/product/ProductGrid';

export default function ProductsPage() {
  useScrollTop([]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 sm:mb-2">All Products</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 sm:mb-8">Browse our curated collection</p>
      <ProductGrid />
    </div>
  );
}