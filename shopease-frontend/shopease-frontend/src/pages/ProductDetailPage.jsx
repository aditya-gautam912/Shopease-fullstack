/**
 * src/pages/ProductDetailPage.jsx
 * Full product detail page with image, description, qty selector,
 * add-to-cart, wishlist, and related products.
 * Mobile-optimized with sticky add-to-cart bar.
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { addToCart }       from '../redux/slices/cartSlice';
import { selectIsLoggedIn } from '../redux/slices/authSlice';
import { productService }  from '../services/productService';
import { userService }     from '../services/index';
import { fmtPrice, fakeDiscount, ratingStars } from '../utils/helpers';
import { SkeletonDetail }  from '../components/common/SkeletonCard';
import ProductCard         from '../components/product/ProductCard';
import { useScrollTop }    from '../hooks';
import ReviewSection      from '../components/product/ReviewSection';

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=70';

export default function ProductDetailPage() {
  const { id }       = useParams();
  const dispatch     = useDispatch();
  const isLoggedIn   = useSelector(selectIsLoggedIn);

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [qty,        setQty]        = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading,setWishLoading] = useState(false);

  useScrollTop([id]);

  useEffect(() => {
    setLoading(true);
    productService.getProductById(id)
      .then(setData)
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10"><SkeletonDetail /></div>
  );

  if (!data) return (
    <div className="text-center py-24 text-gray-400">Product not found.</div>
  );

  const { product, related = [] } = data;
  const disc     = fakeDiscount(product._id);
  const oldPrice = product.oldPrice || parseFloat((product.price / (1 - disc / 100)).toFixed(2));

  const handleAddCart = () => {
    dispatch(addToCart({ ...product, qty }));
    toast.success(`${qty}× added to cart!`);
  };

  const handleWishlist = async () => {
    if (!isLoggedIn) { toast.error('Sign in to save items'); return; }
    setWishLoading(true);
    try {
      await userService.toggleWishlist(product._id);
      setWishlisted((w) => !w);
      toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist ♡');
    } catch { toast.error('Could not update wishlist'); }
    finally { setWishLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-10 pb-28 sm:pb-10">
      {/* Breadcrumb - hidden on mobile */}
      <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link to="/" className="hover:text-primary-500">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary-500">Products</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category}`} className="hover:text-primary-500 capitalize">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{product.title}</span>
      </nav>

      {/* Mobile back button */}
      <div className="sm:hidden mb-4">
        <Link to="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-500">
          ← Back to Products
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid md:grid-cols-2 gap-6 sm:gap-10 mb-10 sm:mb-16"
      >
        {/* Image */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden aspect-square flex items-center justify-center p-4 sm:p-8">
          <img src={product.image} alt={product.title}
            onError={(e) => { e.target.src = FALLBACK; }}
            className="w-full h-full object-contain" />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 sm:gap-5 py-0 sm:py-2">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-primary-500 uppercase tracking-widest">{product.category}</span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-1 sm:mt-2 leading-tight">{product.title}</h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-yellow-400 text-sm sm:text-base">{ratingStars(product.rating?.rate)}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">{product.rating?.rate}</span>
            <span className="text-xs sm:text-sm text-gray-400">({product.rating?.count} reviews)</span>
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{fmtPrice(product.price)}</span>
            <span className="text-base sm:text-lg text-gray-400 line-through">{fmtPrice(oldPrice)}</span>
            <span className="text-xs sm:text-sm font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Save {disc}%</span>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{product.description}</p>

          {/* Stock */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className={`w-2 h-2 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-gray-500 dark:text-gray-400">
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
            </span>
          </div>

          {/* Qty selector - Desktop */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Quantity</span>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-full overflow-hidden">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg font-bold touch-manipulation">
                −
              </button>
              <span className="w-12 text-center font-bold text-gray-900 dark:text-white">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(q + 1, product.stock || 99))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg font-bold touch-manipulation">
                +
              </button>
            </div>
          </div>

          {/* Actions - Desktop */}
          <div className="hidden sm:flex gap-3">
            <button onClick={handleAddCart} disabled={product.stock === 0}
              className="flex-1 btn-primary py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              🛒 Add to Cart · {fmtPrice(product.price * qty)}
            </button>
            <button onClick={handleWishlist} disabled={wishLoading}
              className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-200 text-lg ${
                wishlisted
                  ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-500'
              }`}>
              {wishlisted ? '♥' : '♡'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 sm:pt-2 border-t border-gray-100 dark:border-gray-800">
            {['🔒 Secure', '🚚 Free ₹8,400+', '↩ 30-Day'].map((b) => (
              <span key={b} className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">{b}</span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Mobile Sticky Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 z-40 sm:hidden safe-bottom">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {/* Mobile qty selector */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-full overflow-hidden flex-shrink-0">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold touch-manipulation">
              −
            </button>
            <span className="w-8 text-center font-bold text-gray-900 dark:text-white text-sm">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(q + 1, product.stock || 99))}
              className="w-9 h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold touch-manipulation">
              +
            </button>
          </div>
          
          {/* Add to cart button */}
          <button onClick={handleAddCart} disabled={product.stock === 0}
            className="flex-1 btn-primary py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed justify-center">
            Add · {fmtPrice(product.price * qty)}
          </button>
          
          {/* Wishlist button */}
          <button onClick={handleWishlist} disabled={wishLoading}
            className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all duration-200 text-lg touch-manipulation ${
              wishlisted
                ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-400'
            }`}>
            {wishlisted ? '♥' : '♡'}
          </button>
        </div>
      </div>

      {/* Reviews */}
      <ReviewSection productId={product._id} productRating={product.rating} />

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-8 sm:mt-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white mb-4 sm:mb-5">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}