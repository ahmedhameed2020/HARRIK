"use client";

import React from "react";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdminDashboardPage() {
  const { lang } = useLocale();

  return <DashboardOverview lang={lang} />;
}
