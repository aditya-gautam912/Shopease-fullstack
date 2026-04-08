/**
 * src/redux/slices/cartSlice.js
 * Manages the shopping cart entirely on the client.
 * Cart is persisted to localStorage via the store subscriber in store.js.
 */

import { createSlice } from '@reduxjs/toolkit';

// ── Hydrate cart from localStorage ────────────────────────
const storedItems = (() => {
  try { return JSON.parse(localStorage.getItem('se_cart')) || []; }
  catch { return []; }
})();

const initialState = {
  items: storedItems,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Add product to cart or increment qty if already present
    addToCart(state, action) {
      const product  = action.payload;
      const qty      = product.qty || 1;
      const existing = state.items.find((i) => i._id === product._id);

      if (existing) {
        existing.qty = Math.min(existing.qty + qty, product.stock || 99);
      } else {
        state.items.push({
          _id:      product._id,
          title:    product.title,
          price:    product.price,
          image:    product.image,
          category: product.category,
          stock:    product.stock,
          qty,
        });
      }
    },

    // Remove a specific product from cart
    removeFromCart(state, action) {
      state.items = state.items.filter((i) => i._id !== action.payload);
    },

    // Set an exact quantity for a cart item
    updateQty(state, action) {
      const { id, qty } = action.payload;
      const item = state.items.find((i) => i._id === id);
      if (item) {
        item.qty = Math.max(1, Math.min(qty, item.stock || 99));
      }
    },

    // Empty the cart (called after successful order placement)
    clearCart(state) {
      state.items = [];
    },

    // Hydrate cart from server (called on login / app boot when logged in)
    setCart(state, action) {
      state.items = action.payload;
    },
  },
});

export const { addToCart, removeFromCart, updateQty, clearCart, setCart } = cartSlice.actions;

// ── Selectors ──────────────────────────────────────────────
export const selectCartItems    = (state) => state.cart.items;
export const selectCartCount    = (state) => state.cart.items.reduce((s, i) => s + i.qty, 0);
export const selectCartSubtotal = (state) =>
  parseFloat(state.cart.items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2));

export default cartSlice.reducer;