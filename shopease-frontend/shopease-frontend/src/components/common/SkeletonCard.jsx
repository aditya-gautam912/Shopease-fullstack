/**
 * src/components/common/SkeletonCard.jsx
 * Shimmer loading placeholder that matches the ProductCard layout.
 */
import React from 'react';

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-square w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-4 w-full rounded-full" />
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="flex justify-between items-center pt-1">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="grid md:grid-cols-2 gap-8 animate-pulse">
      <div className="skeleton aspect-square rounded-3xl" />
      <div className="space-y-4 py-4">
        <div className="skeleton h-3 w-20 rounded-full" />
        <div className="skeleton h-8 w-3/4 rounded-full" />
        <div className="skeleton h-4 w-full rounded-full" />
        <div className="skeleton h-4 w-5/6 rounded-full" />
        <div className="skeleton h-10 w-1/3 rounded-full mt-4" />
        <div className="flex gap-3 mt-4">
          <div className="skeleton h-12 flex-1 rounded-full" />
          <div className="skeleton h-12 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}