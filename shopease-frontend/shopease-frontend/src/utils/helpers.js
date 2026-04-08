/**
 * src/utils/helpers.js
 * Shared utility functions used across the application.
 */

/** Format a number as INR — prices are stored natively in INR */
export const fmtPrice = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

/** Get initials from a full name */
export const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

/** Generate filled/empty star string for a rating */
export const ratingStars = (rate = 0) => {
  const full  = Math.round(rate);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
};

/** Truncate a string to maxLen characters */
export const truncate = (str = '', maxLen = 60) =>
  str.length > maxLen ? str.slice(0, maxLen) + '…' : str;

/** Compute a fake discount percentage seeded by product id */
export const fakeDiscount = (id = '', base = 10) => {
  const seed = [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);
  return base + (seed % 25);
};

/** Format a date string to a human-readable format */
export const fmtDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

/** Debounce a function call */
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/** Map an order status string to a Tailwind class */
export const statusClass = (status = '') => {
  const map = {
    delivered:  'status-delivered',
    processing: 'status-processing',
    shipped:    'status-shipped',
    pending:    'status-pending',
    cancelled:  'status-cancelled',
  };
  return map[status] || 'status-pending';
};

/** Clamp a number between min and max */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);