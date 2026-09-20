"use client";

import React from "react";
import { PlateSearchHero } from "@/features/search/PlateSearchHero";
import { useLocale } from "@/contexts/LocaleContext";

export default function HomePage() {
  const { lang } = useLocale();

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <PlateSearchHero lang={lang} />
    </div>
  );
}
