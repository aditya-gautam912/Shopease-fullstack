/**
 * src/pages/WishlistPage.jsx
 * Displays user's wishlist with heart icons and add to cart functionality
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { selectIsLoggedIn } from '../redux/slices/authSlice';
import { fetchWishlist, toggleWishlistItem, selectWishlistItems, selectWishlistLoading } from '../redux/slices/wishlistSlice';
import { addToCart } from '../redux/slices/cartSlice';
import { fmtPrice } from '../utils/helpers';
import EmptyState from '../components/common/EmptyState';
import PageSpinner from '../components/common/PageSpinner';

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=60';

export default function WishlistPage() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const items = useSelector(selectWishlistItems);
  const loading = useSelector(selectWishlistLoading);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, isLoggedIn]);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await dispatch(toggleWishlistItem(productId)).unwrap();
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err || 'Failed to remove');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = (item) => {
    dispatch(addToCart({
      _id: item._id,
      title: item.title,
      price: item.price,
      image: item.image,
      category: item.category,
      qty: 1,
    }));
    toast.success('Added to cart!');
  };

  const handleAddAllToCart = () => {
    items.forEach((item) => {
      dispatch(addToCart({
        _id: item._id,
        title: item.title,
        price: item.price,
        image: item.image,
        category: item.category,
        qty: 1,
      }));
    });
    toast.success(`${items.length} items added to cart!`);
  };

  if (!isLoggedIn) {
    return (
      <EmptyState
        icon="♡"
        title="Sign in to see your wishlist"
        subtitle="Save products you love for later."
        actionLabel="Sign In"
        actionTo="/login"
      />
    );
  }

  if (loading) return <PageSpinner />;

  if (!items.length) {
    return (
      <EmptyState
        icon="♡"
        title="Your wishlist is empty"
        subtitle="Heart products to save them here."
        actionLabel="Browse Products"
        actionTo="/products"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-red-500">♥</span> Wishlist
          </h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
        {items.length > 1 && (
          <button onClick={handleAddAllToCart} className="btn-primary flex items-center gap-2 text-sm">
            <CartIcon /> Add All to Cart
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="card overflow-hidden group"
            >
              {/* Image */}
              <Link to={`/products/${item._id}`} className="block relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => { e.target.src = FALLBACK; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {item.oldPrice && item.oldPrice > item.price && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)}%
                  </span>
                )}
                {/* Remove button */}
                <button
                  onClick={(e) => { e.preventDefault(); handleRemove(item._id); }}
                  disabled={removing === item._id}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                  title="Remove from wishlist"
                >
                  {removing === item._id ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-sm">♥</span>
                  )}
                </button>
              </Link>

              {/* Content */}
              <div className="p-3 sm:p-4">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {item.category}
                </p>
                <Link to={`/products/${item._id}`}>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:text-primary-500 transition-colors mb-2">
                    {item.title}
                  </h3>
                </Link>

                {/* Rating */}
                {item.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-yellow-400 text-xs">★</span>
                    <span className="text-xs text-gray-500">{item.rating.rate?.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({item.rating.count})</span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                    {fmtPrice(item.price)}
                  </span>
                  {item.oldPrice && item.oldPrice > item.price && (
                    <span className="text-xs text-gray-400 line-through">
                      {fmtPrice(item.oldPrice)}
                    </span>
                  )}
                </div>

                {/* Add to Cart */}
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-full btn-primary text-xs sm:text-sm py-2 flex items-center justify-center gap-1.5"
                >
                  <CartIcon /> Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const CartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);