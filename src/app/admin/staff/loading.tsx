import React from "react";
import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FilterBarSkeleton fields={3} />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
