/**
 * src/services/productService.js
 * API calls for product listing, detail, and admin CRUD.
 */

import api from './api';

export const productService = {
  /** Fetch paginated/filtered product list */
  getProducts: async (params = {}) => {
    const res = await api.get('/products', { params });
    return res.data.data; // { products, pagination }
  },

  /** Fetch single product + related items */
  getProductById: async (id) => {
    const res = await api.get(`/products/${id}`);
    return res.data.data; // { product, related }
  },

  /** Admin: create a new product */
  createProduct: async (data) => {
    const res = await api.post('/products', data);
    return res.data.data;
  },

  /** Admin: update a product */
  updateProduct: async (id, data) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data.data;
  },

  /** Admin: soft-delete a product */
  deleteProduct: async (id) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },

  /** Admin: upload a product image file — returns { url } */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data; // { url }
  },
};