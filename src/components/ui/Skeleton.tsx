import React from "react";

/**
 * حَرِّك | HARRIK — Loading skeleton primitives (§11.2).
 *
 * Server-safe (no client hooks) so they can be used from route-level
 * `loading.tsx` files as well as inside client components.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageHeaderSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-3 w-80" />
      </div>
      {withActions && (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
      )}
    </div>
  );
}

export function FilterBarSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-12 flex-1 rounded-2xl" />
      {Array.from({ length: Math.max(0, fields - 1) }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-2xl sm:w-48" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-surface-card"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-11 w-32 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-surface-card">
      <div className="border-b border-slate-100 bg-slate-100/70 p-4 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 p-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? "max-w-[90px]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-surface-card"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SettingsTabsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-surface-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
