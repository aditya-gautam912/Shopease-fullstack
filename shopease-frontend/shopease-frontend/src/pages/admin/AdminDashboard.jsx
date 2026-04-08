/**
 * src/pages/admin/AdminDashboard.jsx
 * Admin dashboard with animated analytics charts built in pure SVG.
 * No external chart library — zero new npm packages required.
 *
 * Charts:
 *  - Revenue last 7 days  (area chart)
 *  - Orders last 7 days   (bar chart)
 *  - New users last 7 days (bar chart)
 *  - Products by category  (donut chart)
 *  - Orders by status      (horizontal bar chart)
 *  - Top 5 selling products (ranked list)
 *  - Recent orders          (table)
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { adminService }                   from '../../services/index';
import { fmtPrice, fmtDate, statusClass } from '../../utils/helpers';
import PageSpinner                        from '../../components/common/PageSpinner';

// ── Colour palette ─────────────────────────────────────────
const PRIMARY  = '#6c63ff';
const GREEN    = '#22c55e';
const BLUE     = '#3b82f6';
const ORANGE   = '#f97316';
const PINK     = '#ec4899';
const YELLOW   = '#eab308';
const RED      = '#ef4444';
const CYAN     = '#06b6d4';

const CAT_COLORS = {
  electronics: PRIMARY,
  fashion:     PINK,
  home:        ORANGE,
  sports:      GREEN,
  beauty:      CYAN,
};

const STATUS_COLORS = {
  delivered:  GREEN,
  processing: PRIMARY,
  shipped:    BLUE,
  pending:    YELLOW,
  cancelled:  RED,
};

// ── Utility ────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Empty chart placeholder ────────────────────────────────
function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-300 dark:text-gray-700">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <line x1="2"  y1="20" x2="22" y2="20" />
      </svg>
      <p className="text-xs mt-2">No data yet</p>
    </div>
  );
}

// ── Chart card wrapper ─────────────────────────────────────
function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Area chart (revenue) ───────────────────────────────────
function AreaChart({ data, color, height = 180 }) {
  if (!data || data.length < 2) return <EmptyChart />;
  const max     = Math.max(...data.map((d) => d.value), 1);
  const W = 560, H = height;
  const pad = { top: 20, right: 10, bottom: 34, left: 54 };
  const iW  = W - pad.left - pad.right;
  const iH  = H - pad.top  - pad.bottom;
  const n   = data.length;
  const px  = (i) => pad.left + (i / (n - 1)) * iW;
  const py  = (v) => pad.top  + iH * (1 - v / max);
  const id  = `ag${color.replace('#', '')}`;

  const pts   = data.map((d, i) => [px(i), py(d.value)]);
  const lineD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const areaD = `${lineD} L ${px(n - 1)} ${H - pad.bottom} L ${px(0)} ${H - pad.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = pad.top + iH * (1 - f);
        const v = max * f;
        return (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={y} y2={y}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end"
              fontSize="9" fill="currentColor" fillOpacity="0.4">
              {v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`}
            </text>
          </g>
        );
      })}

      <motion.path d={areaD} fill={`url(#${id})`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }} />

      <motion.polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none" stroke={color} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }} />

      {data.map((d, i) => (
        <g key={d.date || i}>
          <circle cx={px(i)} cy={py(d.value)} r="4"
            fill="white" stroke={color} strokeWidth="2" className="dark:[fill:theme(colors.gray.900)]" />
          <text x={px(i)} y={H - pad.bottom + 14} textAnchor="middle"
            fontSize="9" fill="currentColor" fillOpacity="0.45">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Bar chart ──────────────────────────────────────────────
function BarChart({ data, color, height = 160 }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const max  = Math.max(...data.map((d) => d.value), 1);
  const W = 560, H = height;
  const pad = { top: 16, right: 8, bottom: 34, left: 36 };
  const iH  = H - pad.top - pad.bottom;
  const cW  = (W - pad.left - pad.right) / data.length;
  const bW  = clamp(cW * 0.55, 8, 36);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {[0, 0.5, 1].map((f) => {
        const y = pad.top + iH * (1 - f);
        const v = max * f;
        return (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={y} y2={y}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={pad.left - 4} y={y + 4} textAnchor="end"
              fontSize="9" fill="currentColor" fillOpacity="0.4">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const bH = clamp((d.value / max) * iH, d.value > 0 ? 4 : 0, iH);
        const x  = pad.left + i * cW + (cW - bW) / 2;
        const y  = H - pad.bottom - bH;
        return (
          <g key={d.date || i}>
            <rect x={x} y={pad.top} width={bW} height={iH}
              rx="4" fill="currentColor" fillOpacity="0.04" />
            <motion.rect x={x} width={bW} rx="4" fill={color}
              initial={{ height: 0, y: H - pad.bottom }}
              animate={{ height: bH, y }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }} />
            {bH > 18 && (
              <text x={x + bW / 2} y={y - 4} textAnchor="middle"
                fontSize="8" fill={color} fontWeight="bold">{d.value}</text>
            )}
            <text x={x + bW / 2} y={H - pad.bottom + 14} textAnchor="middle"
              fontSize="9" fill="currentColor" fillOpacity="0.45">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut chart ────────────────────────────────────────────
function DonutChart({ data, size = 150 }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyChart />;

  const cx = size / 2, cy = size / 2;
  const R  = size * 0.4, r = size * 0.24;
  let angle = -Math.PI / 2;

  const slices = data.map((d) => {
    const sweep  = (d.count / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    return {
      path:  `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`,
      color: CAT_COLORS[d._id] || '#9ca3af',
      label: d._id,
      count: d.count,
      pct:   Math.round((d.count / total) * 100),
    };
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {slices.map((s, i) => (
          <motion.path key={i} d={s.path} fill={s.color}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }} />
        ))}
        <circle cx={cx} cy={cy} r={r} className="fill-white dark:fill-gray-900" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.45">products</text>
      </svg>
      <div className="space-y-2 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-gray-600 dark:text-gray-300 capitalize flex-1 truncate">{s.label}</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{s.count}</span>
            <span className="text-xs text-gray-400 w-7 text-right">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar (order statuses) ───────────────────────
function HBarChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d._id}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`font-semibold capitalize px-2 py-0.5 rounded-full text-[11px] ${statusClass(d._id)}`}>
              {d._id}
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{d.count}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: STATUS_COLORS[d._id] || '#9ca3af' }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────
export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState(null);

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.getLowStockProducts()
    ])
      .then(([statsData, stockData]) => {
        setData(statsData);
        setLowStock(stockData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const {
    stats                = {},
    recentOrders         = [],
    categoryBreakdown    = [],
    orderStatusBreakdown = [],
    charts               = {},
  } = data || {};

  const {
    revenueByDay = [],
    ordersByDay  = [],
    usersByDay   = [],
    topProducts  = [],
  } = charts;

  const STAT_CARDS = [
    { label: 'Total Revenue', value: fmtPrice(stats.totalRevenue || 0), icon: '💰', color: 'from-green-500 to-emerald-400',  sub: 'All time' },
    { label: 'Total Orders',  value: stats.totalOrders   || 0,          icon: '📦', color: 'from-blue-500 to-cyan-400',      sub: 'All time' },
    { label: 'Products',      value: stats.totalProducts || 0,          icon: '🛍️', color: 'from-primary-500 to-violet-400', sub: 'Active listings' },
    { label: 'Users',         value: stats.totalUsers    || 0,          icon: '👤', color: 'from-orange-500 to-amber-400',   sub: 'Registered' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ShopEase analytics overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => (
          <motion.div key={card.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-lg mb-3`}>
              {card.icon}
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue area chart */}
      <ChartCard title="Revenue — Last 7 Days" subtitle="Daily order revenue">
        <AreaChart data={revenueByDay} color={PRIMARY} height={190} />
      </ChartCard>

      {/* Orders + Users bar charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Orders — Last 7 Days" subtitle="Orders placed per day">
          <BarChart data={ordersByDay} color={BLUE} height={160} />
        </ChartCard>
        <ChartCard title="New Users — Last 7 Days" subtitle="New registrations per day">
          <BarChart data={usersByDay} color={GREEN} height={160} />
        </ChartCard>
      </div>

      {/* Donut + Status bars */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Products by Category" subtitle="Active product distribution">
          <DonutChart data={categoryBreakdown} size={150} />
        </ChartCard>
        <ChartCard title="Orders by Status" subtitle="Current order pipeline">
          <HBarChart data={orderStatusBreakdown} />
        </ChartCard>
      </div>

      {/* Low Stock Alerts */}
      {lowStock && (lowStock.products?.length > 0 || lowStock.variants?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden border-l-4 border-l-red-500"
        >
          <div className="flex items-center justify-between px-5 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-800 dark:text-red-200 text-sm">Low Stock Alerts</h3>
                <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                  {(lowStock.products?.length || 0) + (lowStock.variants?.length || 0)} items below {lowStock.threshold} units
                </p>
              </div>
            </div>
            <Link to="/admin/products" className="text-xs text-red-600 dark:text-red-300 font-semibold hover:underline">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
            {/* Out of stock items first */}
            {lowStock.products?.filter(p => p.stock === 0).map((p) => (
              <div key={p._id} className="flex items-center gap-3 px-5 py-3 bg-red-50/50 dark:bg-red-900/10">
                <img src={p.image} alt={p.title}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'; }}
                  className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.category}</p>
                </div>
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  OUT OF STOCK
                </span>
              </div>
            ))}
            {/* Low stock items */}
            {lowStock.products?.filter(p => p.stock > 0).map((p) => (
              <div key={p._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <img src={p.image} alt={p.title}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'; }}
                  className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.category}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  p.stock <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                  p.stock <= 5 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                }`}>
                  {p.stock} left
                </span>
              </div>
            ))}
            {/* Low stock variants */}
            {lowStock.variants?.map((v) => (
              <div key={`${v.productId}-${v.variant._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                  VAR
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{v.title}</p>
                  <p className="text-xs text-gray-400">
                    {v.variant.size} {v.variant.color} · SKU: {v.variant.sku}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  v.variant.stock === 0 ? 'bg-red-500 text-white' :
                  v.variant.stock <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                }`}>
                  {v.variant.stock === 0 ? 'OUT' : `${v.variant.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top products + Recent orders */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Top selling */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Top Selling Products</h3>
            <p className="text-xs text-gray-400 mt-0.5">By total units sold</p>
          </div>
          {topProducts.length === 0
            ? <div className="py-10 text-center text-sm text-gray-400">No sales data yet</div>
            : topProducts.map((p, i) => (
              <motion.div key={String(p._id)}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-5 py-3 border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-xs font-extrabold text-gray-300 dark:text-gray-600 w-4">{i + 1}</span>
                <img src={p.image} alt={p.title}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'; }}
                  className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.qty} sold · {fmtPrice(p.revenue)}</p>
                </div>
                <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex-shrink-0">
                  <motion.div className="h-full rounded-full bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.qty / (topProducts[0]?.qty || 1)) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }} />
                </div>
              </motion.div>
            ))
          }
        </div>

        {/* Recent orders */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Recent Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 5 placed</p>
            </div>
            <Link to="/admin/orders" className="text-xs text-primary-500 font-semibold hover:underline">View all →</Link>
          </div>
          {recentOrders.length === 0
            ? <div className="py-10 text-center text-sm text-gray-400">No orders yet</div>
            : recentOrders.map((order, i) => (
              <motion.div key={order._id}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {order.userId?.name || 'Guest'}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">#{order._id.slice(-8).toUpperCase()} · {fmtDate(order.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">{fmtPrice(order.total)}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${statusClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </motion.div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
