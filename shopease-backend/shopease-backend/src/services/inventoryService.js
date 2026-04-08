/**
 * src/services/inventoryService.js
 * Handles inventory operations: stock validation, decrement, restore.
 * Uses atomic operations to prevent race conditions and overselling.
 */

const Product = require('../models/Product');
const { sendLowStockAlert, sendOutOfStockAlert } = require('./emailService');

// Low stock threshold for alerts
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 10;

/**
 * Validate stock availability for all items
 * @param {Array} items - Array of { productId, variantId?, qty }
 * @returns {{ valid: boolean, errors: string[], products: Map }}
 */
const validateStock = async (items) => {
  const errors = [];
  const products = new Map();

  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (!product) {
      errors.push(`Product not found: ${item.productId}`);
      continue;
    }
    
    if (!product.isActive) {
      errors.push(`Product "${product.title}" is no longer available`);
      continue;
    }

    let availableStock = product.stock;
    let stockSource = 'product';

    // Check variant stock if specified
    if (item.variantId && product.variants?.length > 0) {
      const variant = product.variants.id(item.variantId);
      if (!variant) {
        errors.push(`Variant not found for "${product.title}"`);
        continue;
      }
      availableStock = variant.stock;
      stockSource = 'variant';
    }

    if (availableStock < item.qty) {
      errors.push(
        `Insufficient stock for "${product.title}"` +
        (item.variantId ? ` (variant)` : '') +
        ` - requested: ${item.qty}, available: ${availableStock}`
      );
      continue;
    }

    // Store product for later use
    products.set(item.productId.toString(), {
      product,
      variantId: item.variantId,
      qty: item.qty,
      stockSource,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    products,
  };
};

/**
 * Atomically decrement stock for order items
 * Uses findOneAndUpdate with conditions to prevent overselling
 * @param {Array} items - Array of { productId, variantId?, qty }
 * @returns {{ success: boolean, errors: string[], decremented: Array }}
 */
const decrementStock = async (items) => {
  const errors = [];
  const decremented = [];
  const lowStockAlerts = [];

  for (const item of items) {
    try {
      let result;
      let newStock;

      if (item.variantId) {
        // Decrement variant stock atomically
        result = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants._id': item.variantId,
            'variants.stock': { $gte: item.qty },
          },
          {
            $inc: { 'variants.$.stock': -item.qty },
          },
          { new: true }
        );

        if (result) {
          const variant = result.variants.id(item.variantId);
          newStock = variant?.stock;
        }
      } else {
        // Decrement main product stock atomically
        result = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            stock: { $gte: item.qty },
          },
          {
            $inc: { stock: -item.qty },
          },
          { new: true }
        );

        if (result) {
          newStock = result.stock;
        }
      }

      if (!result) {
        errors.push(`Failed to decrement stock for product ${item.productId} - insufficient stock or not found`);
        continue;
      }

      decremented.push({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        newStock,
      });

      // Check for low stock or out-of-stock alert
      if (newStock !== undefined) {
        if (newStock === 0) {
          // Out of stock - urgent alert
          sendOutOfStockAlert(result, item.variantId).catch(console.error);
        } else if (newStock <= LOW_STOCK_THRESHOLD) {
          // Low stock warning
          lowStockAlerts.push({
            product: result,
            variantId: item.variantId,
            currentStock: newStock,
          });
        }
      }
    } catch (err) {
      errors.push(`Error decrementing stock for ${item.productId}: ${err.message}`);
    }
  }

  // Send low stock alerts (non-blocking)
  if (lowStockAlerts.length > 0) {
    sendLowStockAlerts(lowStockAlerts).catch(console.error);
  }

  return {
    success: errors.length === 0,
    errors,
    decremented,
  };
};

/**
 * Restore stock when order is cancelled
 * @param {Array} items - Order items array from Order document
 * @returns {{ success: boolean, errors: string[], restored: Array }}
 */
const restoreStock = async (items) => {
  const errors = [];
  const restored = [];

  for (const item of items) {
    try {
      let result;

      if (item.variantId) {
        // Restore variant stock
        result = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants._id': item.variantId,
          },
          {
            $inc: { 'variants.$.stock': item.qty },
          },
          { new: true }
        );
      } else {
        // Restore main product stock
        result = await Product.findOneAndUpdate(
          { _id: item.productId },
          { $inc: { stock: item.qty } },
          { new: true }
        );
      }

      if (result) {
        restored.push({
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
        });
      } else {
        errors.push(`Product not found for stock restoration: ${item.productId}`);
      }
    } catch (err) {
      errors.push(`Error restoring stock for ${item.productId}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    restored,
  };
};

/**
 * Get products with low stock
 * @param {number} threshold - Stock threshold (default: LOW_STOCK_THRESHOLD)
 * @returns {Array} Products with stock <= threshold
 */
const getLowStockProducts = async (threshold = LOW_STOCK_THRESHOLD) => {
  // Find products with low main stock
  const lowStockProducts = await Product.find({
    isActive: true,
    stock: { $lte: threshold, $gte: 0 },
  }).select('title stock category image').lean();

  // Find products with low variant stock
  const productsWithLowVariants = await Product.find({
    isActive: true,
    'variants.stock': { $lte: threshold, $gte: 0 },
  }).select('title variants category image').lean();

  // Extract low stock variants
  const lowVariants = [];
  for (const product of productsWithLowVariants) {
    for (const variant of product.variants) {
      if (variant.stock <= threshold) {
        lowVariants.push({
          productId: product._id,
          title: product.title,
          category: product.category,
          variant: {
            _id: variant._id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
          },
        });
      }
    }
  }

  return {
    products: lowStockProducts,
    variants: lowVariants,
    threshold,
  };
};

/**
 * Send low stock alert emails to admin
 * @param {Array} alerts - Array of { product, variantId?, currentStock }
 */
const sendLowStockAlerts = async (alerts) => {
  for (const alert of alerts) {
    try {
      await sendLowStockAlert(alert.product, alert.variantId, alert.currentStock);
    } catch (err) {
      console.error(`Failed to send low stock alert for ${alert.product.title}:`, err);
    }
  }
};

/**
 * Check and reserve stock (for payment processing)
 * This is a two-phase commit pattern - reserve first, then confirm or release
 * @param {Array} items - Array of { productId, variantId?, qty }
 * @param {number} reservationMinutes - How long to hold the reservation
 * @returns {{ success: boolean, reservationId: string, errors: string[] }}
 */
const reserveStock = async (items) => {
  // For now, we'll use atomic decrement directly
  // A full implementation would use a separate reservations collection
  // with TTL index to auto-release expired reservations
  return decrementStock(items);
};

module.exports = {
  validateStock,
  decrementStock,
  restoreStock,
  getLowStockProducts,
  reserveStock,
  LOW_STOCK_THRESHOLD,
};
