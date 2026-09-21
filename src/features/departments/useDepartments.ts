"use client";

import { useEffect, useState } from "react";
import type { DepartmentSummary } from "@/types";

/**
 * Shared access to the tenant's unit list (counts only, member-readable).
 * Cached per page load so the home strip and the "no results" suggestion do not
 * each hit the API.
 */
let cache: DepartmentSummary[] | null = null;
let inflight: Promise<DepartmentSummary[]> | null = null;

function load(): Promise<DepartmentSummary[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/departments")
      .then((res) => res.json())
      .then((json) => {
        cache = json?.success ? (json.departments as DepartmentSummary[]) : [];
        return cache ?? [];
      })
      .catch(() => [])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentSummary[] | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    load().then((list) => {
      if (!alive) return;
      setDepartments(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { departments, loading };
}
