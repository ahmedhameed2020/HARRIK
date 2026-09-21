"use client";

import { useCallback, useEffect, useState } from "react";
import type { DepartmentSummary } from "@/types";

const VISITS_KEY = "harrik_dept_visits";

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

/** Device-local visit counts — which units this operator actually uses. */
export type DepartmentVisits = Record<string, number>;

function readVisits(): DepartmentVisits {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VISITS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as DepartmentVisits) : {};
  } catch {
    return {};
  }
}

function writeVisits(visits: DepartmentVisits) {
  try {
    window.localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  } catch {
    /* storage disabled — ordering simply falls back to the defaults */
  }
}

export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentSummary[] | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [visits, setVisits] = useState<DepartmentVisits>({});

  useEffect(() => {
    let alive = true;
    setVisits(readVisits());
    load().then((list) => {
      if (!alive) return;
      setDepartments(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Counts a visit so the units an operator uses most rise to the top. */
  const recordVisit = useCallback((id: string) => {
    const next = { ...readVisits() };
    next[id] = (next[id] ?? 0) + 1;
    writeVisits(next);
    setVisits(next);
  }, []);

  const clearVisits = useCallback(() => {
    writeVisits({});
    setVisits({});
  }, []);

  return { departments, loading, visits, recordVisit, clearVisits };
}
