/**
 * src/pages/CartPage.jsx
 * Shopping cart with item list, quantity controls, coupon input,
 * order summary, and checkout button.
 * Mobile-optimized with sticky checkout bar.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { selectCartItems, selectCartSubtotal, removeFromCart, updateQty } from '../redux/slices/cartSlice';
import { selectIsLoggedIn } from '../redux/slices/authSlice';
import { couponService } from '../services/index';
import { fmtPrice }      from '../utils/helpers';
import EmptyState        from '../components/common/EmptyState';

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=60';

export default function CartPage() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const items       = useSelector(selectCartItems);
  const subtotal    = useSelector(selectCartSubtotal);
  const isLoggedIn  = useSelector(selectIsLoggedIn);

  const [couponCode,    setCouponCode]    = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const discount  = couponApplied ? couponApplied.amount : 0;
  const shipping  = subtotal - discount >= 8400 ? 0 : 849;
  const total     = Math.max(0, subtotal - discount + shipping).toFixed(2);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!isLoggedIn) { toast.error('Sign in to use coupon codes'); return; }
    setCouponLoading(true);
    try {
      const data = await couponService.validate(couponCode, subtotal);
      setCouponApplied(data);
      toast.success(`${data.label} applied!`);
    } catch (err) {
      toast.error(err.message || 'Invalid coupon code');
      setCouponApplied(null);
    } finally { setCouponLoading(false); }
  };

  const handleCheckout = () => {
    if (!isLoggedIn) { toast.error('Please sign in to checkout'); navigate('/login'); return; }
    navigate('/checkout', { state: { discount, shipping, total: parseFloat(total), coupon: couponApplied?.code } });
  };

  if (!items.length) return (
    <EmptyState icon="🛒" title="Your cart is empty" subtitle="Looks like you haven't added anything yet." actionLabel="Start Shopping" actionTo="/products" />
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32 lg:pb-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 sm:mb-2">Shopping Cart</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">{items.length} {items.length === 1 ? 'item' : 'items'}</p>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div key={item._id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="card p-3 sm:p-4 flex gap-3 sm:gap-4 items-start"
              >
                <Link to={`/products/${item._id}`} className="flex-shrink-0">
                  <img src={item.image} alt={item.title}
                    onError={(e) => { e.target.src = FALLBACK; }}
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-xl bg-gray-100" />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item._id}`}>
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 hover:text-primary-500 transition-colors line-clamp-2">{item.title}</h3>
                  </Link>
                  <p className="text-[10px] sm:text-xs text-gray-400 capitalize mt-0.5">{item.category}</p>
                  
                  {/* Mobile: Price and controls in same row */}
                  <div className="flex items-center justify-between mt-2 sm:mt-3 gap-2">
                    <p className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">{fmtPrice(item.price)}</p>
                    
                    {/* Qty control */}
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-full overflow-hidden text-xs sm:text-sm">
                      <button
                        onClick={() => dispatch(updateQty({ id: item._id, qty: item.qty - 1 }))}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-gray-600 dark:text-gray-300 touch-manipulation">
                        −
                      </button>
                      <span className="w-6 sm:w-8 text-center font-bold text-gray-900 dark:text-white">{item.qty}</span>
                      <button
                        onClick={() => dispatch(updateQty({ id: item._id, qty: item.qty + 1 }))}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-gray-600 dark:text-gray-300 touch-manipulation">
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtotal and Remove - mobile layout */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs sm:text-sm font-bold text-primary-500">{fmtPrice(item.price * item.qty)}</p>
                    <button
                      onClick={() => { dispatch(removeFromCart(item._id)); toast.success('Removed from cart'); }}
                      className="text-[10px] sm:text-xs text-gray-400 hover:text-red-500 transition-colors touch-manipulation py-1">
                      Remove
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order summary - Desktop */}
        <div className="hidden lg:block card p-6 sticky top-24">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Order Summary</h2>

          {/* Coupon */}
          <div className="flex gap-2 mb-4">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              placeholder="Coupon code"
              className="form-input text-sm py-2 flex-1"
            />
            <button onClick={handleApplyCoupon} disabled={couponLoading}
              className="px-4 py-2 bg-primary-500 text-white text-sm font-bold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-60 whitespace-nowrap">
              {couponLoading ? '…' : 'Apply'}
            </button>
          </div>
          {couponApplied && (
            <p className="text-xs text-green-600 dark:text-green-400 mb-3">✓ {couponApplied.label}</p>
          )}
          <p className="text-xs text-gray-400 mb-5">Try: SAVE10 · SAVE20 · SHOPEASE</p>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal</span><span>{fmtPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span><span>-{fmtPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Shipping</span>
              <span>{shipping === 0 ? <span className="text-green-600 font-semibold">Free</span> : fmtPrice(shipping)}</span>
            </div>
            {subtotal - discount < 8400 && (
              <p className="text-xs text-gray-400">Add {fmtPrice(8400 - (subtotal - discount))} more for free shipping</p>
            )}
            <div className="flex justify-between font-extrabold text-base text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
              <span>Total</span><span>{fmtPrice(total)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} className="btn-primary w-full mt-5 py-3 justify-center text-sm">
            Proceed to Checkout →
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">🔒 Secure SSL encrypted checkout</p>
        </div>
      </div>

      {/* Mobile Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 z-40 lg:hidden safe-bottom">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white">{fmtPrice(total)}</p>
          </div>
          <button onClick={handleCheckout} className="btn-primary py-3 px-6 text-sm flex-1 max-w-[200px] justify-center">
            Checkout →
          </button>
        </div>
      </div>
    </div>
  );
}