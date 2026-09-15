"use client";

import React, { useState } from "react";
import { AlertsInbox } from "@/features/alerts/AlertsInbox";
import { Language } from "@/i18n/translations";

export default function InboxPage() {
  const [lang] = useState<Language>("ar");

  return (
    <div className="container mx-auto px-4 py-6">
      <AlertsInbox lang={lang} />
    </div>
  );
}
