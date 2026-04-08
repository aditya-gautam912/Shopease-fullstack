import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageSpinner from '../components/common/PageSpinner';
import { orderService } from '../services';
import { fmtDate, fmtPrice, statusClass } from '../utils/helpers';

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60';

export default function TrackOrderPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;

    orderService.trackGuestOrder(token)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((err) => {
        toast.error(err.message || 'Could not load order');
        navigate('/', { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, token]);

  const handleInvoice = async () => {
    setDownloading(true);
    try {
      await orderService.downloadGuestInvoice(token);
    } catch (err) {
      toast.error(err.message || 'Invoice download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (!order) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Guest Order Tracking</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Order #{order._id.slice(-8).toUpperCase()}
          </h1>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 capitalize ${statusClass(order.status)} border-transparent`}>
          {order.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Items</h2>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => { e.target.src = FALLBACK; }}
                  className="w-14 h-14 object-cover rounded-lg bg-gray-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white">{fmtPrice(item.price * item.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Date</span><span>{fmtDate(order.createdAt)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Payment</span><span className="uppercase">{order.paymentMethod}</span></div>
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtPrice(order.subtotal)}</span></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount</span><span>-{fmtPrice(order.discount)}</span></div>
              )}
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : fmtPrice(order.shipping)}</span></div>
              <div className="flex justify-between font-extrabold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                <span>Total</span><span>{fmtPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Shipping</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {order.shippingAddress?.street}, {order.shippingAddress?.city}
              {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''} {order.shippingAddress?.zip}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{order.shippingAddress?.country}</p>
            {order.trackingNumber && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                Tracking Number: <span className="font-mono font-semibold">{order.trackingNumber}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={handleInvoice} disabled={downloading} className="btn-primary">
              {downloading ? 'Preparing Invoice...' : 'Download Invoice'}
            </button>
            <Link to="/" className="btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
