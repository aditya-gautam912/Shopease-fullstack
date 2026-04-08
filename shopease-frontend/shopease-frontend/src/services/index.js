/**
 * src/services/index.js  (combined services file)
 *
 * ✅ FIX: re-exports injectStore from api.js so store.js can import it
 * from '../services/api' and Rollup resolves it correctly.
 */
export { injectStore } from './api';

import api from './api';

// ─────────────────────────────────────────────────────────
// orderService
// ─────────────────────────────────────────────────────────
export const orderService = {
  createOrder: async (data) => {
    const res = await api.post('/orders', data);
    return res.data.data;
  },
  createGuestOrder: async (data) => {
    const res = await api.post('/orders/guest', data);
    return res.data;
  },
  trackGuestOrder: async (token) => {
    const res = await api.get(`/orders/track/${token}`);
    return res.data.data;
  },
  getMyOrders: async () => {
    const res = await api.get('/orders/my');
    return res.data.data;
  },
  getAllOrders: async (params = {}) => {
    const res = await api.get('/orders', { params });
    return res.data.data;
  },
  updateOrderStatus: async (id, status) => {
    const res = await api.put(`/orders/${id}/status`, { status });
    return res.data.data;
  },
  deleteOrder: async (id) => {
    const res = await api.delete(`/orders/${id}`);
    return res.data;
  },
  createRazorpayOrder: async (data) => {
    const res = await api.post('/orders/razorpay-order', data);
    return res.data.data;
  },
  downloadInvoice: async (orderId) => {
    const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ShopEase-Invoice-${orderId.slice(-8).toUpperCase()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadGuestInvoice: async (trackingToken) => {
    const res  = await api.get(`/orders/guest/${trackingToken}/invoice`, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ShopEase-Invoice.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ─────────────────────────────────────────────────────────
// userService
// ─────────────────────────────────────────────────────────
export const userService = {
  getMe: async () => {
    const res = await api.get('/users/me');
    return res.data.data;
  },
  updateMe: async (data) => {
    const res = await api.put('/users/me', data);
    return res.data.data;
  },
  changePassword: async (data) => {
    const res = await api.put('/users/me/password', data);
    return res.data;
  },
  addAddress: async (address) => {
    const res = await api.post('/users/me/address', address);
    return res.data.data;
  },
  removeAddress: async (addressId) => {
    const res = await api.delete(`/users/me/address/${addressId}`);
    return res.data.data;
  },
  setDefaultAddress: async (addressId) => {
    const res = await api.patch(`/users/me/address/${addressId}/default`);
    return res.data.data;
  },
  getWishlist: async () => {
    const res = await api.get('/users/wishlist');
    return res.data.data;
  },
  toggleWishlist: async (productId) => {
    const res = await api.post(`/users/wishlist/${productId}`);
    return res.data.data;
  },
  getRecentlyViewed: async () => {
    const res = await api.get('/users/recently-viewed');
    return res.data.data;
  },
  getAllUsers: async (params = {}) => {
    const res = await api.get('/users', { params });
    return res.data.data; // { users: [...], pagination: { total, page, limit } }
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
  updateUserRole: async (id, role) => {
    const res = await api.patch(`/users/${id}/role`, { role });
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────
// couponService
// ─────────────────────────────────────────────────────────
export const couponService = {
  validate: async (code, subtotal) => {
    const res = await api.post('/coupons/validate', { code, subtotal });
    return res.data.data;
  },
  getAll: async () => {
    const res = await api.get('/coupons');
    return res.data.data;
  },
  create: async (data) => {
    const res = await api.post('/coupons', data);
    return res.data.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/coupons/${id}`, data);
    return res.data.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/coupons/${id}`);
    return res.data;
  },
  toggle: async (id) => {
    const res = await api.patch(`/coupons/${id}/toggle`);
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────
// adminService
// ─────────────────────────────────────────────────────────
export const adminService = {
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data.data;
  },
  getLowStockProducts: async (threshold) => {
    const params = threshold ? { threshold } : {};
    const res = await api.get('/products/inventory/low-stock', { params });
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────
// reviewService
// ─────────────────────────────────────────────────────────
export const reviewService = {
  getReviews: async (productId, params = {}) => {
    const res = await api.get(`/products/${productId}/reviews`, { params });
    return res.data.data;
  },
  createReview: async (productId, data) => {
    const res = await api.post(`/products/${productId}/reviews`, data);
    return res.data.data;
  },
  updateReview: async (productId, reviewId, data) => {
    const res = await api.put(`/products/${productId}/reviews/${reviewId}`, data);
    return res.data.data;
  },
  deleteReview: async (productId, reviewId) => {
    const res = await api.delete(`/products/${productId}/reviews/${reviewId}`);
    return res.data;
  },
  getMyReviews: async () => {
    const res = await api.get('/reviews/my');
    return res.data.data;
  },
  toggleVisibility: async (reviewId) => {
    const res = await api.put(`/reviews/${reviewId}/visibility`);
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────
// cartService
// ─────────────────────────────────────────────────────────
export const cartService = {
  getCart: async () => {
    const res = await api.get('/users/cart');
    return res.data.data;
  },
  syncCart: async (items) => {
    const res = await api.put('/users/cart', { items });
    return res.data.data;
  },
};
