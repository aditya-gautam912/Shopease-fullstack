/**
 * src/hooks/index.js
 * Reusable custom React hooks for ShopEase.
 */

import { useState, useEffect, useCallback } from 'react';

// ── useDebounce ────────────────────────────────────────────
/** Returns a debounced version of the given value */
export const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ── useLocalStorage ────────────────────────────────────────
/** useState backed by localStorage */
export const useLocalStorage = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });

  const set = useCallback((val) => {
    setValue(val);
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key]);

  return [value, set];
};

// ── useClickOutside ────────────────────────────────────────
/** Fires callback when a click occurs outside the given ref */
export const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
};

// ── useIntersectionObserver ────────────────────────────────
/** Returns true once the ref element enters the viewport */
export const useIntersection = (ref, options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, options);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);
  return isVisible;
};

// ── useFetch ───────────────────────────────────────────────
/** Generic data fetcher with loading/error state */
export const useFetch = (fetchFn, deps = []) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
};

// ── useScrollTop ───────────────────────────────────────────
/** Scrolls to page top when deps change (e.g. on route change) */
export const useScrollTop = (deps = []) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
