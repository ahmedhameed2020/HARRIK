/**
 * حَرِّك | HARRIK — Shared API query helpers.
 *
 * Server-side pagination + safe filter terms for PostgREST queries.
 */

export interface Pagination {
  /** null means "no limit" (legacy full-fetch behaviour). */
  limit: number | null;
  offset: number;
  /** True when pagination was explicitly requested by the caller. */
  paged: boolean;
}

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

/**
 * Parses `limit` / `offset` query params.
 * When `limit` is absent the caller keeps the legacy "return everything" mode,
 * so existing consumers are unaffected.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  opts: { defaultLimit?: number } = {}
): Pagination {
  const rawLimit = Number(searchParams.get("limit"));
  const rawOffset = Number(searchParams.get("offset"));

  if (Number.isFinite(rawLimit) && rawLimit > 0) {
    return {
      limit: Math.min(Math.floor(rawLimit), MAX_LIMIT),
      offset: Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0,
      paged: true,
    };
  }

  const fallback = opts.defaultLimit ?? null;
  if (fallback !== null) {
    return {
      limit: Math.min(fallback, MAX_LIMIT),
      offset: Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0,
      paged: true,
    };
  }

  return { limit: null, offset: 0, paged: false };
}

export const PAGINATION_DEFAULT_LIMIT = DEFAULT_LIMIT;

/**
 * Makes a user-supplied term safe to embed inside a PostgREST `or=(...)` /
 * `ilike` filter by removing characters that would break the filter grammar.
 */
export function sanitizeTerm(term: string | null | undefined): string {
  if (!term) return "";
  return String(term)
    .replace(/[,()'"\\%*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Builds a `hasMore` flag from a page of results. */
export function computeHasMore<T>(rows: T[] | null | undefined, limit: number | null): boolean {
  if (limit === null) return false;
  return (rows?.length ?? 0) === limit;
}
