/**
 * src/components/product/ProductGrid.jsx
 * Renders the filter bar + responsive product grid.
 * Handles category chips, sort, price range, and Load More.
 * Mobile optimized with scrollable chips and stacked filters.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import ProductCard    from './ProductCard';
import { SkeletonGrid } from '../common/SkeletonCard';
import EmptyState     from '../common/EmptyState';
import { productService } from '../../services/productService';
import { useDebounce }    from '../../hooks';

const CATEGORIES = [
  { id: 'all',         label: 'All',         icon: '🛍️' },
  { id: 'electronics', label: 'Electronics', icon: '⚡' },
  { id: 'fashion',     label: 'Fashion',     icon: '👗' },
  { id: 'home',        label: 'Home',        icon: '🏠' },
  { id: 'sports',      label: 'Sports',      icon: '🏃' },
  { id: 'beauty',      label: 'Beauty',      icon: '✨' },
];

const SORT_OPTIONS = [
  { value: 'default',    label: 'Default' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'newest',     label: 'Newest' },
];

const PRICE_OPTIONS = [
  { value: '',           label: 'All Prices' },
  { value: 'under50',   label: 'Under $50' },
  { value: '50to150',   label: '$50 – $150' },
  { value: 'over150',   label: 'Over $150' },
];

const PRICE_MAP = {
  'under50': { maxPrice: 49.99 },
  '50to150': { minPrice: 50, maxPrice: 150 },
  'over150': { minPrice: 150.01 },
};

export default function ProductGrid({ initialSearch = '' }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);

  const [category,   setCategory]   = useState(searchParams.get('category') || 'all');
  const [sort,       setSort]       = useState('default');
  const [priceRange, setPriceRange] = useState('');
  const [search,     setSearch]     = useState(searchParams.get('search') || initialSearch);

  const debouncedSearch = useDebounce(search, 300);

  const filtersActive = category !== 'all' || sort !== 'default' || priceRange !== '' || debouncedSearch !== '';

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    else         setLoadingMore(true);
    try {
      const params = {
        page:  pageNum,
        limit: 8,
        sort,
        ...(category !== 'all' && { category }),
        ...(debouncedSearch  && { search: debouncedSearch }),
        ...(PRICE_MAP[priceRange] || {}),
      };
      const { products: newProds, pagination: pag } = await productService.getProducts(params);
      setProducts((prev) => append ? [...prev, ...newProds] : newProds);
      setPagination(pag);
      setPage(pageNum);
    } catch {
      /* errors handled by Axios interceptor */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, sort, priceRange, debouncedSearch]);

  // Re-fetch when filters change (reset to page 1)
  useEffect(() => { fetchProducts(1, false); }, [fetchProducts]);

  // Sync category from URL param
  useEffect(() => {
    const cat = searchParams.get('category');
    const srch = searchParams.get('search');
    if (cat)  setCategory(cat);
    if (srch) setSearch(srch);
  }, [searchParams]);

  const clearFilters = () => {
    setCategory('all'); setSort('default'); setPriceRange(''); setSearch('');
    setSearchParams({});
  };

  const handleCategoryClick = (cat) => {
    setCategory(cat);
    setSearchParams(cat !== 'all' ? { category: cat } : {});
  };

  return (
    <div>
      {/* Category chips - horizontally scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar mb-4 sm:mb-5">
        {CATEGORIES.map((cat) => (
          <button key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 touch-manipulation ${
              category === cat.id
                ? 'bg-primary-500 text-white shadow-md scale-[1.03]'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-500'
            }`}
          >
            <span className="text-sm sm:text-base">{cat.icon}</span>{cat.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px] sm:flex-none">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full sm:w-44 pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100"
          />
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="text-xs sm:text-sm px-2 sm:px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100 cursor-pointer">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}
          className="text-xs sm:text-sm px-2 sm:px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100 cursor-pointer">
          {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {filtersActive && (
          <button onClick={clearFilters}
            className="text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-full border-2 border-primary-400 text-primary-500 font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors touch-manipulation">
            ✕ Clear
          </button>
        )}

        {!loading && (
          <span className="text-xs sm:text-sm text-gray-400 ml-auto hidden xs:block">
            {pagination.total ?? products.length} products
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <SkeletonGrid />
      ) : products.length === 0 ? (
        <EmptyState icon="🔍" title="No products found" subtitle="Try adjusting your search or filters" actionLabel="Clear Filters" actionTo="/products" />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
          >
            {products.map((p, i) => (
              <motion.div key={p._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>

          {/* Load more */}
          {pagination.hasMore && (
            <div className="text-center mt-8 sm:mt-10">
              <button
                onClick={() => fetchProducts(page + 1, true)}
                disabled={loadingMore}
                className="btn-outline px-8 sm:px-10 py-2.5 sm:py-3 text-sm touch-manipulation"
              >
                {loadingMore
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading…</span>
                  : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;