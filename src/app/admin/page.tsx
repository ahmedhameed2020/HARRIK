"use client";

import React, { useState } from "react";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import { Language } from "@/i18n/translations";

export default function AdminDashboardPage() {
  const [lang] = useState<Language>("ar");

  return <DashboardOverview lang={lang} />;
}
