import React from "react";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-56 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="mt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[24px] border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-surface-card"
          >
            <div className="flex items-center justify-between">
              <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="mt-4 h-4 w-full animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
