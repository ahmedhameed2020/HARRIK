import React from "react";
import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton cards={3} />
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}
