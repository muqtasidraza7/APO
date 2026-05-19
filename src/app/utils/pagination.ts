/**
 * Parse standard pagination query params from a URL.
 * Clamps page ≥ 1 and limit within [1, maxLimit].
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { limit?: number; maxLimit?: number } = {}
) {
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || String(defaults.limit ?? 20), 10) || (defaults.limit ?? 20)),
    defaults.maxLimit ?? 100
  );
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Standard paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Parse a cursor (ISO timestamp string) for keyset / cursor-based pagination.
 * Returns a Date or null if the cursor is absent / invalid.
 */
export function parseCursor(searchParams: URLSearchParams, key = "before"): Date | null {
  const raw = searchParams.get(key);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}
