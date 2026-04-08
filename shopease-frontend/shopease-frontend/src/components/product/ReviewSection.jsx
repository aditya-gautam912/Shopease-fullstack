/**
 * src/components/product/ReviewSection.jsx
 * Complete reviews UI for the product detail page.
 *
 * Features:
 *  - Star rating breakdown bar chart
 *  - Paginated review list with reviewer name, date, stars, title, body
 *  - Write / edit review form (star picker + title + body)
 *  - Edit own review inline
 *  - Delete own review (with confirm)
 *  - Admin can delete any review or toggle visibility
 *  - Optimistic UI updates — no full page reload needed
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { selectCurrentUser, selectIsLoggedIn, selectIsAdmin } from '../../redux/slices/authSlice';
import { reviewService } from '../../services/index';
import { fmtDate, getInitials } from '../../utils/helpers';

// ── Helpers ────────────────────────────────────────────────
const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function StarPicker({ value, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
          style={{ fontSize: size, lineHeight: 1 }}
        >
          <span className={(hovered || value) >= n ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
            ★
          </span>
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center ml-2">
          {STAR_LABELS[hovered || value]}
        </span>
      )}
    </div>
  );
}

function StarDisplay({ rating, size = 14 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={rating >= n ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>★</span>
      ))}
    </span>
  );
}

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-3 text-right">{star}</span>
      <span className="text-yellow-400" style={{ fontSize: 11 }}>★</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-yellow-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: (5 - star) * 0.05 }}
        />
      </div>
      <span className="text-gray-400 w-5">{count}</span>
    </div>
  );
}

// ── Write / Edit form ─────────────────────────────────────
function ReviewForm({ productId, existing, onSuccess, onCancel }) {
  const [rating,    setRating]    = useState(existing?.rating || 0);
  const [title,     setTitle]     = useState(existing?.title  || '');
  const [body,      setBody]      = useState(existing?.body   || '');
  const [errors,    setErrors]    = useState({});
  const [submitting,setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!rating)       e.rating = 'Please select a star rating';
    if (!body.trim())  e.body   = 'Review text is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      let saved;
      if (existing) {
        saved = await reviewService.updateReview(productId, existing._id, { rating, title, body });
        toast.success('Review updated!');
      } else {
        saved = await reviewService.createReview(productId, { rating, title, body });
        toast.success('Review submitted! Thank you.');
      }
      onSuccess(saved, !!existing);
    } catch (err) {
      toast.error(err.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      noValidate
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
    >
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">
        {existing ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      {/* Star picker */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
          Your Rating *
        </label>
        <StarPicker value={rating} onChange={(v) => { setRating(v); if (errors.rating) setErrors((p) => ({ ...p, rating: undefined })); }} />
        {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
          Review Title <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={title}
          maxLength={120}
          placeholder="Summarise your experience…"
          onChange={(e) => setTitle(e.target.value)}
          className="form-input text-sm py-2"
        />
      </div>

      {/* Body */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
          Review *
        </label>
        <textarea
          value={body}
          maxLength={2000}
          rows={4}
          placeholder="Tell others what you think about this product…"
          onChange={(e) => { setBody(e.target.value); if (errors.body) setErrors((p) => ({ ...p, body: undefined })); }}
          className={`form-input text-sm py-2 resize-none ${errors.body ? 'error' : ''}`}
        />
        <div className="flex justify-between mt-1">
          {errors.body
            ? <p className="text-red-500 text-xs">{errors.body}</p>
            : <span />}
          <span className="text-xs text-gray-400">{body.length}/2000</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting}
          className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2">
          {submitting
            ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
            : existing ? 'Update Review' : 'Submit Review'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline text-sm py-2.5 px-5">
            Cancel
          </button>
        )}
      </div>
    </motion.form>
  );
}

// ── Single review card ─────────────────────────────────────
function ReviewCard({ review, currentUserId, isAdmin, productId, onUpdated, onDeleted }) {
  const [editing,    setEditing]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const isOwner = currentUserId && review.user === currentUserId;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reviewService.deleteReview(productId, review._id);
      toast.success('Review deleted');
      onDeleted(review._id);
    } catch (err) {
      toast.error(err.message || 'Could not delete review');
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      const updated = await reviewService.toggleVisibility(review._id);
      toast.success(updated.isVisible ? 'Review shown' : 'Review hidden');
      onUpdated(updated);
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  if (editing) {
    return (
      <ReviewForm
        productId={productId}
        existing={review}
        onSuccess={(updated) => { onUpdated(updated); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className={`border border-gray-100 dark:border-gray-800 rounded-2xl p-5 transition-all ${
        !review.isVisible ? 'opacity-50' : ''
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(review.userName)}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {review.userName}
              {isOwner && <span className="ml-2 text-xs text-primary-500 font-bold">(You)</span>}
            </p>
            <p className="text-xs text-gray-400">{fmtDate(review.createdAt)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StarDisplay rating={review.rating} />
          {!review.isVisible && (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full font-semibold">Hidden</span>
          )}
          {canEdit && (
            <button onClick={() => setEditing(true)}
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors">
              Edit
            </button>
          )}
          {isAdmin && (
            <button onClick={handleToggleVisibility}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              {review.isVisible ? 'Hide' : 'Show'}
            </button>
          )}
          {canDelete && !confirming && (
            <button onClick={() => setConfirming(true)}
              className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
              Delete
            </button>
          )}
          {confirming && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Sure?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs font-bold text-red-500 hover:text-red-700">
                {deleting ? '…' : 'Yes'}
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs text-gray-400">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{review.title}</p>
      )}

      {/* Body */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
        {review.body}
      </p>
    </motion.div>
  );
}

// ── Main exported component ────────────────────────────────
export default function ReviewSection({ productId, productRating }) {
  const isLoggedIn  = useSelector(selectIsLoggedIn);
  const isAdmin     = useSelector(selectIsAdmin);
  const currentUser = useSelector(selectCurrentUser);

  const [reviews,    setReviews]    = useState([]);
  const [breakdown,  setBreakdown]  = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [showForm,   setShowForm]   = useState(false);
  const [myReview,   setMyReview]   = useState(null); // existing review by current user

  const load = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const data = await reviewService.getReviews(productId, { page: p, limit: 8 });
      setReviews((prev) => append ? [...prev, ...data.reviews] : data.reviews);
      setBreakdown(data.breakdown || []);
      setPagination(data.pagination || {});
      setPage(p);

      // Detect if current user already has a review in this batch
      if (currentUser && !append) {
        const mine = data.reviews.find((r) => r.user === currentUser._id);
        if (mine) setMyReview(mine);
      }
    } catch {
      toast.error('Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [productId, currentUser]);

  useEffect(() => { load(1, false); }, [load]);

  // ── Callbacks passed down to child cards ───────────────
  const handleNewReview = (saved) => {
    setReviews((prev) => [saved, ...prev]);
    setMyReview(saved);
    setShowForm(false);
    setPagination((p) => ({ ...p, total: (p.total || 0) + 1 }));
  };

  const handleUpdated = (updated) => {
    setReviews((prev) => prev.map((r) => r._id === updated._id ? updated : r));
    if (myReview?._id === updated._id) setMyReview(updated);
  };

  const handleDeleted = (deletedId) => {
    setReviews((prev) => prev.filter((r) => r._id !== deletedId));
    if (myReview?._id === deletedId) { setMyReview(null); setShowForm(false); }
    setPagination((p) => ({ ...p, total: Math.max(0, (p.total || 1) - 1) }));
  };

  // Build breakdown map for the bar chart
  const breakdownMap = {};
  breakdown.forEach((b) => { breakdownMap[b._id] = b.count; });
  const totalReviews = pagination.total || 0;
  const avgRating    = productRating?.rate || 0;

  return (
    <section className="mt-14">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
          Customer Reviews
          {totalReviews > 0 && (
            <span className="ml-2 text-sm font-semibold text-gray-400">({totalReviews})</span>
          )}
        </h2>
        {isLoggedIn && !myReview && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-5">
            ✏️ Write a Review
          </button>
        )}
        {isLoggedIn && myReview && (
          <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
            ✓ You reviewed this product
          </span>
        )}
        {!isLoggedIn && (
          <p className="text-sm text-gray-400">
            <a href="/login" className="text-primary-500 font-semibold hover:underline">Sign in</a> to write a review
          </p>
        )}
      </div>

      {/* Rating summary */}
      {totalReviews > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          {/* Big number */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
              {avgRating.toFixed(1)}
            </span>
            <StarDisplay rating={Math.round(avgRating)} size={18} />
            <span className="text-xs text-gray-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
          </div>

          {/* Bar chart */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar
                key={star}
                star={star}
                count={breakdownMap[star] || 0}
                total={totalReviews}
              />
            ))}
          </div>
        </div>
      )}

      {/* Write review form */}
      <AnimatePresence>
        {showForm && (
          <div className="mb-6">
            <ReviewForm
              productId={productId}
              onSuccess={handleNewReview}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Review list */}
      {loading && reviews.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-32 rounded-full" />
                  <div className="skeleton h-3 w-20 rounded-full" />
                </div>
              </div>
              <div className="skeleton h-3 w-full rounded-full" />
              <div className="skeleton h-3 w-3/4 rounded-full" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-semibold text-gray-500 dark:text-gray-400">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to share your experience!</p>
          {isLoggedIn && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm mt-4 py-2 px-5">
              Write the First Review
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                currentUserId={currentUser?._id}
                isAdmin={isAdmin}
                productId={productId}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Load more */}
      {pagination.hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => load(page + 1, true)}
            disabled={loading}
            className="btn-outline px-8 py-2.5 text-sm"
          >
            {loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading…</span>
              : `Load More Reviews (${pagination.total - reviews.length} remaining)`}
          </button>
        </div>
      )}
    </section>
  );
}