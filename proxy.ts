import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// The session cookie name, duplicated from lib/auth/session.ts on purpose: that module reads
// cookies via next/headers' cookies(), which isn't available here — Proxy reads them off the
// request directly (request.cookies). Runs on the Node.js runtime by default (Next 16), so a
// real Prisma lookup is fine here, not just an Edge-safe cookie-presence check.
const COOKIE_NAME = "smartsavor_session";

// API paths that are legitimately called by a *patient* session (web /me/* and the mobile
// app) — these are deliberately left alone. Everything else under /api/patients and
// /api/grocery-items is dietitian-only by construction (verified by grepping every fetch()
// call site in both apps — see the PR description). New patient-facing endpoints must be
// added here explicitly; the default for anything unlisted is "requires a dietitian session,"
// not the other way around, so a forgotten addition here fails closed, not open.
const PATIENT_SAFE_PATTERNS: RegExp[] = [
  /^\/api\/patients\/[^/]+\/approved-lists\/[^/]+$/, // bare GET only, not /items
  /^\/api\/patients\/[^/]+\/choices$/,
  /^\/api\/patients\/[^/]+\/coach$/,
  /^\/api\/patients\/[^/]+\/consumption$/,
  /^\/api\/patients\/[^/]+\/cycle-history$/,
  /^\/api\/patients\/[^/]+\/dashboard$/,
  /^\/api\/patients\/[^/]+\/focus-set$/, // bare GET only, not /available|/confirm|/creatable|/items|/new-item|/reorder
  /^\/api\/patients\/[^/]+\/lab-reports(\/.*)?$/,
  /^\/api\/patients\/[^/]+\/messages$/, // two-way thread; both roles post here
  /^\/api\/patients\/[^/]+\/preferences$/,
  /^\/api\/patients\/[^/]+\/receipts(\/.*)?$/,
  /^\/api\/patients\/[^/]+\/weight-check-ins$/,
];

// GET /api/patients/:id is a patient's own self-lookup (mobile calls it bare); DELETE on the
// same path is "delete this patient," a dietitian-only action. Same path, different method,
// different rule — can't express this as a single pattern.
const BARE_PATIENT_ID = /^\/api\/patients\/[^/]+$/;

function needsDietitianSession(pathname: string, method: string): boolean {
  if (pathname === "/" || pathname.startsWith("/patients/")) return true;

  const isApiPatientsOrGrocery =
    pathname.startsWith("/api/patients") || pathname.startsWith("/api/grocery-items");
  if (!isApiPatientsOrGrocery) return false;

  if (BARE_PATIENT_ID.test(pathname)) return method !== "GET";
  return !PATIENT_SAFE_PATTERNS.some((p) => p.test(pathname));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!needsDietitianSession(pathname, request.method)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token
    ? await prisma.session.findUnique({ where: { token }, include: { user: true } })
    : null;
  const valid = session && session.expiresAt > new Date() && session.user.role === "dietitian";

  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const loginUrl = new URL("/login/dietitian", request.url);
  return NextResponse.redirect(loginUrl);
}

// Only excludes genuine static assets — everything else (including /invite, /login, /me,
// /api/health, etc.) still reaches needsDietitianSession() above, which is the real source of
// truth and already returns false (no-op, no DB call) for all of them. Narrower exclusions
// here would just be a performance micro-optimization with a real risk of a path-prefix bug
// (e.g. a future route that happens to start with the same letters as an excluded segment).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|phosphor/).*)"],
};
