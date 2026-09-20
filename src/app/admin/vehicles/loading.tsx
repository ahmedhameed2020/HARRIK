import React from "react";
import { PageHeaderSkeleton, FilterBarSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FilterBarSkeleton fields={2} />
      <CardGridSkeleton cards={6} />
    </div>
  );
}
