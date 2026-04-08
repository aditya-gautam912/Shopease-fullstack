/**
 * src/components/product/ProductCard.jsx
 * Individual product card with image, rating, price, wishlist toggle,
 * and add-to-cart. Used in grids across the app.
 * Mobile-optimized with larger touch targets.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { addToCart } from '../../redux/slices/cartSlice';
import { selectIsLoggedIn } from '../../redux/slices/authSlice';
import { userService } from '../../services/index';
import { fmtPrice, fakeDiscount, ratingStars } from '../../utils/helpers';

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=60';

export default function ProductCard({ product, wishlistIds = [], onWishlistToggle }) {
  const dispatch    = useDispatch();
  const isLoggedIn  = useSelector(selectIsLoggedIn);
  const [wishlisted, setWishlisted] = useState(wishlistIds.includes(product._id));
  const [wishLoading, setWishLoading] = useState(false);

  const disc     = fakeDiscount(product._id);
  const oldPrice = product.oldPrice || parseFloat((product.price / (1 - disc / 100)).toFixed(2));

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addToCart({ ...product, qty: 1 }));
    toast.success(`Added to cart!`);
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { toast.error('Sign in to save wishlist'); return; }
    setWishLoading(true);
    try {
      await userService.toggleWishlist(product._id);
      setWishlisted((w) => !w);
      if (onWishlistToggle) onWishlistToggle(product._id);
      toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist ♡');
    } catch {
      toast.error('Could not update wishlist');
    } finally {
      setWishLoading(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="card overflow-hidden group cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-300 touch-manipulation"
    >
      <Link to={`/products/${product._id}`} className="block">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            onError={(e) => { e.target.src = FALLBACK; }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Discount badge */}
          {disc > 0 && (
            <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-green-500 text-white text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
              -{disc}%
            </span>
          )}
          {/* Wishlist button - larger touch target on mobile */}
          <button
            onClick={handleWishlist}
            disabled={wishLoading}
            className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 touch-manipulation ${
              wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/80 dark:bg-gray-900/80 text-gray-500 hover:bg-red-500 hover:text-white active:bg-red-600'
            }`}
            title="Toggle wishlist"
          >
            <span className="text-base sm:text-sm">{wishlisted ? '♥' : '♡'}</span>
          </button>
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-2 line-clamp-2">
            {product.title}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
            <span className="text-yellow-400 text-[10px] sm:text-xs">{ratingStars(product.rating?.rate)}</span>
            <span className="text-[10px] sm:text-xs text-gray-400">({product.rating?.count ?? 0})</span>
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
              <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white truncate">{fmtPrice(product.price)}</span>
              <span className="text-[10px] sm:text-xs text-gray-400 line-through hidden xs:inline">{fmtPrice(oldPrice)}</span>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-1.5 rounded-full transition-all duration-200 active:scale-95 touch-manipulation flex-shrink-0"
            >
              <CartIcon /> <span className="hidden xs:inline">Add</span>
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const CartIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
