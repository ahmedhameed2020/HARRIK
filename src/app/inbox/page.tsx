"use client";

import React from "react";
import { AlertsInbox } from "@/features/alerts/AlertsInbox";
import { useLocale } from "@/contexts/LocaleContext";

export default function InboxPage() {
  const { lang } = useLocale();

  return (
    <div className="container mx-auto px-4 py-6">
      <AlertsInbox lang={lang} />
    </div>
  );
}
