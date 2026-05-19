import { NextRequest, NextResponse } from "next/server";

// ─── In-memory sliding window rate limiter ────────────────────────────────────
// Each entry tracks request count and the timestamp when the window resets.
// Per-instance only (acceptable for single-server / FYP use).
// For multi-instance production: swap the Map for Redis.
const store = new Map<string, { count: number; resetAt: number }>();

interface Tier {
  limit: number;
  windowMs: number;
  label: string;
}

const TIERS: Record<string, Tier> = {
  // AI-powered routes are expensive — strict cap
  strict: { limit: 5, windowMs: 60_000, label: "5 req/min" },
  // Mutating routes (sprint/task writes, messages)
  standard: { limit: 30, windowMs: 60_000, label: "30 req/min" },
  // Read-only / light routes
  relaxed: { limit: 60, windowMs: 60_000, label: "60 req/min" },
};

// Routes that cost AI tokens — keep very tight
const STRICT_PREFIXES = [
  "/api/sprints/ai-populate",
  "/api/process-document",
  "/api/assign-tasks",
  "/api/parse-cv",
  "/api/elaborate",
  "/api/explain-assignment",
  "/api/analytics/velocity",
  "/api/analytics/cost",
];

// Mutating routes — moderate cap
const STANDARD_PREFIXES = [
  "/api/messages/send",
  "/api/sprints/task-create",
  "/api/sprints/close",
  "/api/sprints/create",
  "/api/add-team-member",
  "/api/update-milestone",
  "/api/update-project-data",
  "/api/sprints/task-status",
  "/api/sprints/log-hours",
  "/api/team/milestone-complete",
  "/api/messages/upload",
  "/api/messages/pin",
];

function getTier(pathname: string): Tier {
  if (STRICT_PREFIXES.some((p) => pathname.startsWith(p))) return TIERS.strict;
  if (STANDARD_PREFIXES.some((p) => pathname.startsWith(p))) return TIERS.standard;
  return TIERS.relaxed;
}

// Key = IP + first 4 path segments so each endpoint has its own bucket
function getKey(req: NextRequest, pathname: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const bucket = pathname.split("/").slice(0, 4).join("/");
  return `${ip}::${bucket}`;
}

function consume(
  key: string,
  tier: Tier
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + tier.windowMs });
    return { allowed: true, remaining: tier.limit - 1, resetMs: tier.windowMs };
  }

  if (entry.count >= tier.limit) {
    return { allowed: false, remaining: 0, resetMs: entry.resetAt - now };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: tier.limit - entry.count,
    resetMs: entry.resetAt - now,
  };
}

// Prune stale entries every 2 000 requests to avoid unbounded growth
let pruneCounter = 0;
function maybePrune() {
  if (++pruneCounter % 2000 !== 0) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept API routes (v1 rewrites land here as /api/*)
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const tier = getTier(pathname);
  const key = getKey(req, pathname);
  const rl = consume(key, tier);
  maybePrune();

  const retryAfterSec = Math.ceil(rl.resetMs / 1000);

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit: ${tier.label}. Retry after ${retryAfterSec}s.`,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-API-Version": "1",
          "X-RateLimit-Limit": String(tier.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(retryAfterSec),
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-API-Version", "1");
  res.headers.set("X-RateLimit-Limit", String(tier.limit));
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(retryAfterSec));
  return res;
}

export const config = {
  // Match all /api/* AND /api/v1/* paths
  matcher: ["/api/:path*"],
};
