/**
 * src/pages/admin/AdminOrders.jsx
 * Full admin order management — status filter, update status,
 * view order items, and delete order.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { orderService }                   from '../../services/index';
import { fmtPrice, fmtDate, statusClass } from '../../utils/helpers';
import PageSpinner                        from '../../components/common/PageSpinner';
import Modal                              from '../../components/common/Modal';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60';

export default function AdminOrders() {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId,   setUpdatingId]   = useState(null);
  const [deleting,     setDeleting]     = useState(null);  // order to delete
  const [viewing,      setViewing]      = useState(null);  // order whose items to show
  const [search,       setSearch]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    orderService.getAllOrders({ status: statusFilter || undefined, limit: 200 })
      .then(({ orders: o }) => setOrders(o))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Update status ──────────────────────────────────────
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const updated = await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: updated.status } : o));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete order (optimistic local remove) ─────────────
  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await orderService.deleteOrder(deleting._id);
      setOrders((prev) => prev.filter((o) => o._id !== deleting._id));
      toast.success('Order removed');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete order');
    }
  };

  // ── Client-side search across order ID and customer ────
  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o._id.toLowerCase().includes(q) ||
      (o.userId?.name  || '').toLowerCase().includes(q) ||
      (o.userId?.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID or customer…"
            className="form-input max-w-xs text-sm py-2" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100 cursor-pointer">
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-5 py-3 font-semibold">Order ID</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order._id}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>

                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{order.userId?.name || 'Guest'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{order.userId?.email}</p>
                    </td>

                    {/* Items count — clickable to view detail */}
                    <td className="px-5 py-3">
                      <button onClick={() => setViewing(order)}
                        className="text-xs font-semibold text-primary-500 hover:underline">
                        {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} →
                      </button>
                    </td>

                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{fmtPrice(order.total)}</td>

                    <td className="px-5 py-3">
                      <span className="uppercase text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {order.paymentMethod}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(order.createdAt)}</td>

                    {/* Status dropdown */}
                    <td className="px-5 py-3">
                      <select
                        value={order.status}
                        disabled={updatingId === order._id}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 cursor-pointer focus:outline-none transition-all ${statusClass(order.status)} border-transparent`}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(order)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors">
                          View
                        </button>
                        <button onClick={() => setDeleting(order)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-12 text-sm">No orders found</p>
            )}
          </div>
        </div>
      )}

      {/* ── View Order Items Modal ──────────────────────── */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Order #${viewing._id.slice(-8).toUpperCase()}` : ''} maxWidth="max-w-lg">
        {viewing && (
          <div className="p-6">
            {/* Customer + summary */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Customer',  value: viewing.userId?.name  || 'Guest' },
                { label: 'Email',     value: viewing.userId?.email || '—' },
                { label: 'Date',      value: fmtDate(viewing.createdAt) },
                { label: 'Payment',   value: viewing.paymentMethod?.toUpperCase() },
                { label: 'Status',    value: viewing.status },
                { label: 'Total',     value: fmtPrice(viewing.total) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-semibold mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{value}</p>
                </div>
              ))}
            </div>

            {/* Shipping address */}
            {viewing.shippingAddress && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-5">
                <p className="text-xs text-gray-400 font-semibold mb-1">Shipping Address</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {viewing.shippingAddress.street}, {viewing.shippingAddress.city}
                  {viewing.shippingAddress.state ? `, ${viewing.shippingAddress.state}` : ''}{' '}
                  {viewing.shippingAddress.zip} — {viewing.shippingAddress.country}
                </p>
              </div>
            )}

            {/* Items list */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Items ({viewing.items?.length})
            </p>
            <div className="space-y-3">
              {viewing.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <img src={item.image} alt={item.title}
                    onError={(e) => { e.target.src = FALLBACK; }}
                    className="w-12 h-12 object-cover rounded-lg bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">Qty: {item.qty}  ×  {fmtPrice(item.price)}</p>
                  </div>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white flex-shrink-0">
                    {fmtPrice(item.price * item.qty)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{fmtPrice(viewing.subtotal)}</span></div>
              {viewing.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{fmtPrice(viewing.discount)}</span></div>}
              <div className="flex justify-between text-sm text-gray-500"><span>Shipping</span><span>{viewing.shipping === 0 ? 'Free' : fmtPrice(viewing.shipping)}</span></div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-800">
                <span>Total</span><span>{fmtPrice(viewing.total)}</span>
              </div>
            </div>

            {/* Quick status update from modal */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-400 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => { handleStatusChange(viewing._id, s); setViewing((v) => ({ ...v, status: s })); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all capitalize ${
                      viewing.status === s
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary-400 hover:text-primary-500'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} maxWidth="max-w-sm">
        <div className="p-6 text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Order?</h3>
          <p className="text-sm text-gray-500 mb-1">
            Order <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
              #{deleting?._id.slice(-8).toUpperCase()}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Total: <strong>{fmtPrice(deleting?.total)}</strong> · This cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleDelete}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-sm transition-colors">
              Yes, Delete
            </button>
            <button onClick={() => setDeleting(null)} className="btn-outline py-2.5 px-5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
