/**
 * src/redux/store.js
 * Configures the Redux Toolkit store with all slices.
 * Cart and auth state are persisted to localStorage via listeners.
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import cartReducer     from './slices/cartSlice';
import uiReducer       from './slices/uiSlice';
import wishlistReducer from './slices/wishlistSlice';
import { injectStore } from '../services/api';   // ✅ FIX: inject after creation

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    cart:     cartReducer,
    ui:       uiReducer,
    wishlist: wishlistReducer,
  },
});

// ✅ FIX: give api.js a reference to the store without a circular import.
// api.js exports injectStore() instead of importing store directly,
// so the dependency now flows one way:
//   store.js → api.js (safe — api.js no longer imports store.js)
injectStore(store);

// ── Persist cart and auth tokens to localStorage on every change ──
store.subscribe(() => {
  const { cart, auth } = store.getState();
  try {
    localStorage.setItem('se_cart',  JSON.stringify(cart.items));
    if (auth.token) {
      localStorage.setItem('se_access_token',  auth.token);
      localStorage.setItem('se_refresh_token', auth.refreshToken);
      localStorage.setItem('se_user',  JSON.stringify(auth.user));
    }
  } catch {
    // Ignore quota errors silently
  }
});

export default store;