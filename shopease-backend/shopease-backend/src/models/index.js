const { sequelize } = require('../config/db');
const User = require('./User');
const Address = require('./Address');
const RefreshToken = require('./RefreshToken');
const Product = require('./Product');
const ProductVariant = require('./ProductVariant');
const CartItem = require('./CartItem');
const WishlistItem = require('./WishlistItem');
const RecentlyViewed = require('./RecentlyViewed');
const Order = require('./Order');
const Review = require('./Review');
const Coupon = require('./Coupon');
const Banner = require('./Banner');
const Return = require('./Return');
const Ticket = require('./Ticket');
const Newsletter = require('./Newsletter');

User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(CartItem, { foreignKey: 'userId', as: 'cart' });
CartItem.belongsTo(User, { foreignKey: 'userId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(WishlistItem, { foreignKey: 'userId', as: 'wishlist' });
WishlistItem.belongsTo(User, { foreignKey: 'userId' });
WishlistItem.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(RecentlyViewed, { foreignKey: 'userId', as: 'recentlyViewed' });
RecentlyViewed.belongsTo(User, { foreignKey: 'userId' });
RecentlyViewed.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId' });

Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'productId' });
User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Return, { foreignKey: 'userId', as: 'returns' });
Return.belongsTo(User, { foreignKey: 'userId' });
Order.hasMany(Return, { foreignKey: 'orderId' });
Return.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'userId' });

// DECIMAL fields per model — pg returns them as strings, coerce to numbers for frontend
const DECIMAL_FIELDS = {
  Product:       ['price', 'oldPrice', 'ratingRate'],
  ProductVariant:['price'],
  Order:         ['subtotal', 'discount', 'shipping', 'total'],
  Coupon:        ['discount', 'minOrderValue'],
  Return:        ['refundAmount'],
};

// Add _id virtual to every model so frontend code expecting _id still works
for (const model of [User, Address, RefreshToken, Product, ProductVariant, CartItem, WishlistItem, RecentlyViewed, Order, Review, Coupon, Banner, Return, Ticket, Newsletter]) {
  const orig = model.prototype.toJSON;
  const fields = DECIMAL_FIELDS[model.name] || [];
  model.prototype.toJSON = function () {
    const json = orig.call(this);
    json._id = json.id;
    for (const key of fields) {
      if (typeof json[key] === 'string') json[key] = parseFloat(json[key]);
    }
    return json;
  };
}

module.exports = {
  sequelize,
  User,
  Address,
  RefreshToken,
  Product,
  ProductVariant,
  CartItem,
  WishlistItem,
  RecentlyViewed,
  Order,
  Review,
  Coupon,
  Banner,
  Return,
  Ticket,
  Newsletter,
};
