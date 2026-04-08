/**
 * src/components/common/PageSpinner.jsx
 * Full-page centered loading spinner for Suspense fallback.
 */
import React from 'react';
export default function PageSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-primary-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
    </div>
  );
}