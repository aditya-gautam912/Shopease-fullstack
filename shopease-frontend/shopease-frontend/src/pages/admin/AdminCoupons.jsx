/**
 * src/pages/admin/AdminCoupons.jsx
 * Admin coupon management — create, edit, toggle active, delete.
 * Supports percentage and fixed-amount discounts, expiry dates,
 * usage limits, and minimum order values.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence }     from 'framer-motion';
import toast                           from 'react-hot-toast';

import { couponService } from '../../services/index';
import Modal             from '../../components/common/Modal';
import PageSpinner       from '../../components/common/PageSpinner';

// ── Helpers ────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const isExpired = (d) => d && new Date(d) < new Date();

// ── Empty form state ───────────────────────────────────────
const EMPTY = {
  code:          '',
  description:   '',
  type:          'percentage',
  discount:      '',
  minOrderValue: '',
  expiresAt:     '',
  usageLimit:    '',
  isActive:      true,
};

// ── Field component ────────────────────────────────────────
function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {hint  && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function AdminCoupons() {
  const [coupons,    setCoupons]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);   // null = create mode
  const [deleting,   setDeleting]   = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    couponService.getAll()
      .then(setCoupons)
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Open modal ─────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code:          c.code,
      description:   c.description || '',
      type:          c.type,
      discount:      c.type === 'percentage' ? Math.round(c.discount * 100) : c.discount,
      minOrderValue: c.minOrderValue || '',
      expiresAt:     c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      usageLimit:    c.usageLimit || '',
      isActive:      c.isActive,
    });
    setErrors({});
    setShowModal(true);
  };

  // ── Field update helper ────────────────────────────────
  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  // ── Validate ───────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.code.trim())                         e.code     = 'Code is required';
    else if (!/^[A-Z0-9_-]{2,20}$/i.test(form.code)) e.code  = '2-20 alphanumeric characters only';
    if (!form.discount && form.discount !== 0)     e.discount = 'Discount is required';
    else if (isNaN(Number(form.discount)) || Number(form.discount) < 0) e.discount = 'Must be a positive number';
    else if (form.type === 'percentage' && Number(form.discount) > 100)  e.discount = 'Percentage cannot exceed 100';
    return e;
  };

  // ── Save (create or update) ────────────────────────────
  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      // Convert percentage input (e.g. 10) to decimal (0.10) for storage
      const discountValue = form.type === 'percentage'
        ? parseFloat(form.discount) / 100
        : parseFloat(form.discount);

      const payload = {
        code:          form.code.trim().toUpperCase(),
        description:   form.description.trim(),
        type:          form.type,
        discount:      discountValue,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        expiresAt:     form.expiresAt || null,
        usageLimit:    form.usageLimit ? Number(form.usageLimit) : null,
        isActive:      form.isActive,
      };

      if (editing) {
        const updated = await couponService.update(editing._id, payload);
        setCoupons((cs) => cs.map((c) => c._id === updated._id ? updated : c));
        toast.success('Coupon updated!');
      } else {
        const created = await couponService.create(payload);
        setCoupons((cs) => [created, ...cs]);
        toast.success('Coupon created!');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────
  const handleToggle = async (c) => {
    try {
      const updated = await couponService.toggle(c._id);
      setCoupons((cs) => cs.map((x) => x._id === updated._id ? updated : x));
      toast.success(`${updated.code} is now ${updated.isActive ? 'active' : 'inactive'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle');
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await couponService.remove(deleting._id);
      setCoupons((cs) => cs.filter((c) => c._id !== deleting._id));
      toast.success('Coupon deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Render discount value nicely ───────────────────────
  const renderDiscount = (c) =>
    c.type === 'percentage'
      ? `${Math.round(c.discount * 100)}% off`
      : `${fmt(c.discount)} off`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm py-2 px-5 flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Create Coupon
        </button>
      </div>

      {/* Table */}
      {loading ? <PageSpinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Discount</th>
                  <th className="px-5 py-3 font-semibold">Min Order</th>
                  <th className="px-5 py-3 font-semibold">Usage</th>
                  <th className="px-5 py-3 font-semibold">Expires</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {coupons.map((c) => {
                    const expired = isExpired(c.expiresAt);
                    const maxed   = c.usageLimit !== null && c.usedCount >= c.usageLimit;
                    return (
                      <motion.tr key={c._id} layout
                        className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                        {/* Code + description */}
                        <td className="px-5 py-3">
                          <p className="font-mono font-bold text-gray-900 dark:text-white">{c.code}</p>
                          {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                        </td>

                        {/* Discount */}
                        <td className="px-5 py-3">
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            {renderDiscount(c)}
                          </span>
                        </td>

                        {/* Min order */}
                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {c.minOrderValue > 0 ? fmt(c.minOrderValue) : '—'}
                        </td>

                        {/* Usage */}
                        <td className="px-5 py-3 text-xs">
                          {c.usageLimit !== null
                            ? <span className={maxed ? 'text-red-500 font-bold' : 'text-gray-500'}>
                                {c.usedCount} / {c.usageLimit}
                              </span>
                            : <span className="text-gray-400">{c.usedCount} used</span>}
                        </td>

                        {/* Expires */}
                        <td className="px-5 py-3 text-xs">
                          {c.expiresAt
                            ? <span className={expired ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                                {fmtDate(c.expiresAt)}{expired ? ' ✕' : ''}
                              </span>
                            : <span className="text-gray-400">Never</span>}
                        </td>

                        {/* Status toggle */}
                        <td className="px-5 py-3">
                          <button onClick={() => handleToggle(c)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize transition-colors border cursor-pointer ${
                              c.isActive && !expired && !maxed
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-200'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                            }`}>
                            {c.isActive && !expired && !maxed ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(c)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => setDeleting(c)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            {coupons.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎟️</p>
                <p className="text-gray-500 font-semibold">No coupons yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first coupon to offer discounts to customers.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit — ${editing.code}` : 'Create Coupon'}
        maxWidth="max-w-lg"
      >
        <div className="p-6 space-y-4">

          {/* Code */}
          <Field label="Coupon Code *" error={errors.code} hint="e.g. SUMMER20 — letters, numbers, hyphens only">
            <input
              value={form.code}
              onChange={set('code')}
              placeholder="SAVE10"
              disabled={!!editing} // code cannot change after creation
              className={`form-input text-sm py-2 uppercase tracking-widest font-mono ${errors.code ? 'error' : ''} ${editing ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </Field>

          {/* Description */}
          <Field label="Description (shown to customer)" error={errors.description}>
            <input
              value={form.description}
              onChange={set('description')}
              placeholder="10% off your order"
              className="form-input text-sm py-2"
            />
          </Field>

          {/* Type + Discount on same row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount Type *" error={errors.type}>
              <select value={form.type} onChange={set('type')} className="form-input text-sm py-2">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </Field>

            <Field
              label={form.type === 'percentage' ? 'Discount % *' : 'Amount (₹) *'}
              error={errors.discount}
              hint={form.type === 'percentage' ? '1–100' : 'e.g. 500'}
            >
              <input
                type="number"
                value={form.discount}
                onChange={set('discount')}
                min="0"
                max={form.type === 'percentage' ? 100 : undefined}
                placeholder={form.type === 'percentage' ? '10' : '500'}
                className={`form-input text-sm py-2 ${errors.discount ? 'error' : ''}`}
              />
            </Field>
          </div>

          {/* Min order value + Usage limit */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Order Value (₹)" hint="Leave blank for no minimum">
              <input
                type="number"
                value={form.minOrderValue}
                onChange={set('minOrderValue')}
                min="0"
                placeholder="0"
                className="form-input text-sm py-2"
              />
            </Field>

            <Field label="Usage Limit" hint="Leave blank for unlimited">
              <input
                type="number"
                value={form.usageLimit}
                onChange={set('usageLimit')}
                min="1"
                placeholder="Unlimited"
                className="form-input text-sm py-2"
              />
            </Field>
          </div>

          {/* Expiry date */}
          <Field label="Expiry Date" hint="Leave blank for no expiry">
            <input
              type="date"
              value={form.expiresAt}
              onChange={set('expiresAt')}
              min={new Date().toISOString().slice(0, 10)}
              className="form-input text-sm py-2"
            />
          </Field>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={set('isActive')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {form.isActive ? 'Active — customers can use this coupon' : 'Inactive — coupon is disabled'}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex-1 py-2.5 justify-center text-sm">
              {saving
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {editing ? 'Saving…' : 'Creating…'}
                  </span>
                : editing ? 'Save Changes' : 'Create Coupon'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-outline py-2.5 px-5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ───────────────────────────── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} maxWidth="max-w-sm">
        <div className="p-6 text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Coupon?</h3>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{deleting?.code}</span>
            {' '}will be permanently removed.
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