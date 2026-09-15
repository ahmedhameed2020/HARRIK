"use client";

import React, { useState } from "react";
import { PlateSearchHero } from "@/features/search/PlateSearchHero";
import { Language } from "@/i18n/translations";

export default function HomePage() {
  // Read language from document.documentElement or default to 'ar'
  const [lang] = useState<Language>("ar");

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <PlateSearchHero lang={lang} />
    </div>
  );
}
