import React from "react";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <PageHeaderSkeleton withActions={false} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0f]"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-5 w-56" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
