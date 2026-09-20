import React from "react";
import { PageHeaderSkeleton, SettingsTabsSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SettingsTabsSkeleton />
    </div>
  );
}
