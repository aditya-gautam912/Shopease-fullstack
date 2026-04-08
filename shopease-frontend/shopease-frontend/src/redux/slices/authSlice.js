/**
 * src/redux/slices/authSlice.js
 * Manages authentication state: user object, tokens, loading flag.
 * Supports access token + refresh token pattern.
 * Initial state is hydrated from localStorage on app boot.
 */

import { createSlice } from '@reduxjs/toolkit';

// ── Hydrate from localStorage (lazy, runs once at import time) ──
const storedAccessToken  = localStorage.getItem('se_access_token') || null;
const storedRefreshToken = localStorage.getItem('se_refresh_token') || null;
const storedUser  = (() => {
  try { return JSON.parse(localStorage.getItem('se_user')) || null; }
  catch { return null; }
})();

const initialState = {
  user:         storedAccessToken ? storedUser : null,
  token:        storedAccessToken,  // access token (kept as 'token' for backward compat)
  refreshToken: storedRefreshToken,
  loading:      false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called after successful login / register API response
    setCredentials(state, action) {
      const { user, accessToken, refreshToken } = action.payload;
      state.user         = user;
      state.token        = accessToken;
      state.refreshToken = refreshToken;
      state.loading      = false;
      localStorage.setItem('se_access_token',  accessToken);
      localStorage.setItem('se_refresh_token', refreshToken);
      localStorage.setItem('se_user',  JSON.stringify(user));
    },

    // Called after successful token refresh
    setTokens(state, action) {
      const { accessToken, refreshToken } = action.payload;
      state.token        = accessToken;
      state.refreshToken = refreshToken;
      localStorage.setItem('se_access_token',  accessToken);
      localStorage.setItem('se_refresh_token', refreshToken);
    },

    // Update user fields (e.g. after profile edit)
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('se_user', JSON.stringify(state.user));
    },

    // Clear all auth state on logout
    logout(state) {
      state.user         = null;
      state.token        = null;
      state.refreshToken = null;
      localStorage.removeItem('se_access_token');
      localStorage.removeItem('se_refresh_token');
      localStorage.removeItem('se_user');
      localStorage.removeItem('se_cart');
      // Also remove legacy token if exists
      localStorage.removeItem('se_token');
    },

    setLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, setTokens, updateUser, logout, setLoading } = authSlice.actions;

// ── Selectors ──────────────────────────────────────────────
export const selectCurrentUser  = (state) => state.auth.user;
export const selectToken        = (state) => state.auth.token;
export const selectRefreshToken = (state) => state.auth.refreshToken;
export const selectIsLoggedIn   = (state) => !!state.auth.token;
export const selectIsAdmin      = (state) => state.auth.user?.role === 'admin';
export const selectAuthLoading  = (state) => state.auth.loading;

export default authSlice.reducer;