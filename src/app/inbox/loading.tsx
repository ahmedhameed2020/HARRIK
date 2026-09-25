import React from "react";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <PageHeaderSkeleton withActions={false} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="space-y-4 rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
