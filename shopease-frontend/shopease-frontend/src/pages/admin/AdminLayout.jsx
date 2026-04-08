/**
 * src/pages/admin/AdminLayout.jsx
 * Admin panel shell with sticky sidebar navigation and nested routes.
 * All child routes are rendered in the main content area.
 * Mobile-responsive with bottom navigation.
 */
import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import AdminDashboard from './AdminDashboard';
import AdminProducts  from './AdminProducts';
import AdminOrders    from './AdminOrders';
import AdminUsers     from './AdminUsers';
import AdminCoupons   from './AdminCoupons';

// Icons must be defined before NAV_ITEMS so they exist when the array is initialised
const DashIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const BoxIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const OrderIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const UserIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CouponIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;

const NAV_ITEMS = [
  { to: '',        label: 'Dashboard', icon: <DashIcon /> },
  { to: 'products',label: 'Products',  icon: <BoxIcon /> },
  { to: 'orders',  label: 'Orders',    icon: <OrderIcon /> },
  { to: 'users',   label: 'Users',     icon: <UserIcon /> },
  { to: 'coupons', label: 'Coupons',   icon: <CouponIcon /> },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto flex-shrink-0">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Panel</p>
        </div>
        <nav className="p-3 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={`/admin/${item.to}`}
              end={item.to === ''}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 sm:p-6 md:p-8"
        >
          <Routes>
            <Route index           element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders"   element={<AdminOrders />} />
            <Route path="users"    element={<AdminUsers />} />
            <Route path="coupons"  element={<AdminCoupons />} />
          </Routes>
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 md:hidden safe-bottom">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === '' 
              ? location.pathname === '/admin' || location.pathname === '/admin/'
              : location.pathname.includes(`/admin/${item.to}`);
            
            return (
              <NavLink
                key={item.label}
                to={`/admin/${item.to}`}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors ${
                  isActive
                    ? 'text-primary-500'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
