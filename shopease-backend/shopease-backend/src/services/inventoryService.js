const { Product, ProductVariant, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendLowStockAlert, sendOutOfStockAlert } = require('./emailService');

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 10;

const validateStock = async (items) => {
  const errors = [];
  const products = new Map();

  for (const item of items) {
    const product = await Product.findByPk(item.productId);

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

    if (item.variantId) {
      const variant = await ProductVariant.findByPk(item.variantId);
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
        (item.variantId ? ' (variant)' : '') +
        ` - requested: ${item.qty}, available: ${availableStock}`,
      );
      continue;
    }

    products.set(item.productId.toString(), {
      product,
      variantId: item.variantId,
      qty: item.qty,
      stockSource,
    });
  }

  return { valid: errors.length === 0, errors, products };
};

const decrementStock = async (items) => {
  const errors = [];
  const decremented = [];
  const lowStockAlerts = [];

  try {
    await sequelize.transaction(async (t) => {
      for (const item of items) {
        try {
          let newStock;

          if (item.variantId) {
            const [affected] = await ProductVariant.update(
              { stock: sequelize.literal(`"stock" - ${parseInt(item.qty, 10)}`) },
              { where: { id: item.variantId, productId: item.productId, stock: { [Op.gte]: item.qty } }, transaction: t },
            );
            if (affected === 0) {
              errors.push(`Failed to decrement stock for product ${item.productId} - insufficient stock or not found`);
              return;
            }
            const variant = await ProductVariant.findByPk(item.variantId, { attributes: ['stock'], raw: true, transaction: t });
            newStock = variant ? variant.stock : 0;
          } else {
            const [affected] = await Product.update(
              { stock: sequelize.literal(`"stock" - ${parseInt(item.qty, 10)}`) },
              { where: { id: item.productId, stock: { [Op.gte]: item.qty } }, transaction: t },
            );
            if (affected === 0) {
              errors.push(`Failed to decrement stock for product ${item.productId} - insufficient stock or not found`);
              return;
            }
            const product = await Product.findByPk(item.productId, { attributes: ['stock'], raw: true, transaction: t });
            newStock = product ? product.stock : 0;
          }

          decremented.push({ productId: item.productId, variantId: item.variantId, qty: item.qty, newStock });

          if (newStock !== undefined) {
            if (newStock === 0) {
              const prod = await Product.findByPk(item.productId, { attributes: ['title'], raw: true, transaction: t });
              sendOutOfStockAlert(prod, item.variantId).catch(console.error);
            } else if (newStock <= LOW_STOCK_THRESHOLD) {
              const prod = await Product.findByPk(item.productId, { attributes: ['title'], raw: true, transaction: t });
              lowStockAlerts.push({ product: prod, variantId: item.variantId, currentStock: newStock });
            }
          }
        } catch (err) {
          errors.push(`Error decrementing stock for ${item.productId}: ${err.message}`);
          return;
        }
      }

      if (errors.length > 0) {
        throw new Error(); // triggers rollback
      }
    });
  } catch {
    // Transaction rolled back — errors array already populated
  }

  if (lowStockAlerts.length > 0) {
    sendLowStockAlerts(lowStockAlerts).catch(console.error);
  }

  return { success: errors.length === 0, errors, decremented };
};

const restoreStock = async (items) => {
  const errors = [];
  const restored = [];

  for (const item of items) {
    try {
      if (item.variantId) {
        await ProductVariant.increment('stock', { by: parseInt(item.qty, 10), where: { id: item.variantId } });
      } else {
        await Product.increment('stock', { by: parseInt(item.qty, 10), where: { id: item.productId } });
      }
      restored.push({ productId: item.productId, variantId: item.variantId, qty: item.qty });
    } catch (err) {
      errors.push(`Error restoring stock for ${item.productId}: ${err.message}`);
    }
  }

  return { success: errors.length === 0, errors, restored };
};

const getLowStockProducts = async (threshold = LOW_STOCK_THRESHOLD) => {
  const lowStockProducts = await Product.findAll({
    where: { isActive: true, stock: { [Op.lte]: threshold, [Op.gte]: 0 } },
    attributes: ['id', 'title', 'stock', 'category', 'image'],
    raw: true,
  });

  const productsWithLowVariants = await Product.findAll({
    where: { isActive: true },
    include: [{
      model: ProductVariant,
      as: 'variants',
      where: { stock: { [Op.lte]: threshold, [Op.gte]: 0 } },
      required: true,
    }],
    attributes: ['id', 'title', 'category', 'image'],
  });

  const lowVariants = [];
  for (const product of productsWithLowVariants) {
    for (const variant of product.variants) {
      if (variant.stock <= threshold) {
        lowVariants.push({
          productId: product.id,
          title: product.title,
          category: product.category,
          variant: {
            _id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
          },
        });
      }
    }
  }

  return { products: lowStockProducts, variants: lowVariants, threshold };
};

const sendLowStockAlerts = async (alerts) => {
  for (const alert of alerts) {
    try {
      await sendLowStockAlert(alert.product, alert.variantId, alert.currentStock);
    } catch (err) {
      console.error(`Failed to send low stock alert for ${alert.product.title}:`, err);
    }
  }
};

const reserveStock = async (items) => {
  return decrementStock(items);
};

module.exports = {
  validateStock, decrementStock, restoreStock,
  getLowStockProducts, reserveStock, LOW_STOCK_THRESHOLD,
};
