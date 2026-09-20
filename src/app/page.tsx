"use client";

import React from "react";
import { PlateSearchHero } from "@/features/search/PlateSearchHero";
import { useLocale } from "@/contexts/LocaleContext";

export default function HomePage() {
  const { lang } = useLocale();

  return (
    // Balanced hero: the content is centred in the space left between the app
    // bar and the floating navigation island, so the first screen never looks
    // top-heavy on tall phones.
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-5xl flex-col justify-center px-4 py-8 sm:py-12">
      <PlateSearchHero lang={lang} />
    </div>
  );
}
