import React from "react";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4 rounded-3xl border-2 border-dashed border-slate-300/80 p-8 text-center dark:border-slate-700/80">
        <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
        <Skeleton className="mx-auto h-5 w-72" />
        <Skeleton className="mx-auto h-3 w-96 max-w-full" />
        <div className="flex justify-center gap-3 pt-2">
          <Skeleton className="h-10 w-44 rounded-2xl" />
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
