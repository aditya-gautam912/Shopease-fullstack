/**
 * src/redux/slices/wishlistSlice.js
 * Manages wishlist state: items, loading, synced with backend.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/users/wishlist');
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch wishlist');
    }
  }
);

export const toggleWishlistItem = createAsyncThunk(
  'wishlist/toggleItem',
  async (productId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/users/wishlist/${productId}`);
      return { productId, action: res.data.data.action, wishlist: res.data.data.wishlist };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update wishlist');
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlist(state) {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wishlist
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Toggle item
      .addCase(toggleWishlistItem.pending, (state) => {
        state.error = null;
      })
      .addCase(toggleWishlistItem.fulfilled, (state, action) => {
        const { productId, action: toggleAction } = action.payload;
        if (toggleAction === 'removed') {
          state.items = state.items.filter((item) => item._id !== productId);
        }
        // For 'added', we'll refetch to get full product data
      })
      .addCase(toggleWishlistItem.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;

// Selectors
export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistLoading = (state) => state.wishlist.loading;
export const selectWishlistCount = (state) => state.wishlist.items.length;
export const selectIsInWishlist = (productId) => (state) =>
  state.wishlist.items.some((item) => item._id === productId);

export default wishlistSlice.reducer;
