import React from "react";
import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton cards={4} />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}
