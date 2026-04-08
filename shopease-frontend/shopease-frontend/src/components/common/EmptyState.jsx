/**
 * src/components/common/EmptyState.jsx
 * Reusable empty state with icon, title, subtitle, and optional CTA.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon = '📭', title, subtitle, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <span className="text-6xl mb-5">{icon}</span>
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">{subtitle}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary text-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}