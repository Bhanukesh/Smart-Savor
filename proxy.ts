import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { findLinkedDietitianUser, claimOpenSeat } from "@/lib/auth/dietitian";
import { PATIENT_CLERK_PUBLISHABLE_KEY, PATIENT_CLERK_SECRET_KEY } from "@/lib/patientClerk";

// The patient session cookie name, duplicated from lib/auth/session.ts on purpose: that module
// reads cookies via next/headers' cookies(), which isn't available here — Proxy reads them off
// the request directly (request.cookies). Runs on the Node.js runtime by default (Next 16), so
// a real Prisma lookup is fine here, not just an Edge-safe cookie-presence check. Dietitian
// auth is Clerk-managed (see lib/auth/dietitian.ts) — this cookie is patient-only now.
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
  /^\/api\/patients\/[^/]+\/shopping-list$/,
  /^\/api\/patients\/[^/]+\/weight-check-ins$/,
];

// GET /api/patients/:id is a patient's own self-lookup (mobile calls it bare); DELETE on the
// same path is "delete this patient," a dietitian-only action. Same path, different method,
// different rule — can't express this as a single pattern.
const BARE_PATIENT_ID = /^\/api\/patients\/[^/]+$/;

// Public by construction — Clerk calls this with no session, and the webhook signature (not a
// cookie or a Clerk session) is what actually authenticates it. Also /team/join... no such
// route exists (invites are by email now, not a link a stranger could stumble onto), so
// nothing else needs a public carve-out here.
function needsDietitianSession(pathname: string, method: string): boolean {
  if (pathname === "/" || pathname.startsWith("/patients/")) return true;
  if (pathname === "/team") return true;
  if (pathname.startsWith("/api/team/invites")) return true;

  const isApiPatientsOrGrocery =
    pathname.startsWith("/api/patients") || pathname.startsWith("/api/grocery-items");
  if (!isApiPatientsOrGrocery) return false;

  if (BARE_PATIENT_ID.test(pathname)) return method !== "GET";
  return !PATIENT_SAFE_PATTERNS.some((p) => p.test(pathname));
}

// The patient app (/me/*) previously rendered with zero auth at all — every page pulled
// getDemoPatient() (whichever patient row was created first) instead of checking who's
// actually signed in. This closes that: any /me/* request needs a real, unexpired session
// belonging to a patient. The pages themselves still do their own getSessionUser() lookup
// downstream (same division of labor as the dietitian side) to resolve *which* patient.
function needsPatientSession(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

// Two separate Clerk applications share this one middleware: the dietitian app (default env
// vars, CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — Restricted mode) everywhere
// except /invite/* and /api/invite/* (pages and their API routes), which resolve to the
// patient app instead (lib/patientClerk.ts, unrestricted — patients are already gated by
// their invite code, not by Clerk). This is Clerk's own documented multi-tenant pattern (a
// key-resolver as clerkMiddleware's second argument), not a workaround — see proxy.ts's PR
// description for the doc link.
function resolveClerkKeys(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isInvite = pathname.startsWith("/invite") || pathname.startsWith("/api/invite");
  if (isInvite && PATIENT_CLERK_PUBLISHABLE_KEY && PATIENT_CLERK_SECRET_KEY) {
    return { publishableKey: PATIENT_CLERK_PUBLISHABLE_KEY, secretKey: PATIENT_CLERK_SECRET_KEY };
  }
  // The dietitian app's own keys, explicit rather than implicit — this callback must always
  // return a real options object (its type doesn't allow "just use the ambient env vars").
  return { publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!, secretKey: process.env.CLERK_SECRET_KEY! };
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (needsPatientSession(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token
      ? await prisma.session.findUnique({ where: { token }, include: { user: true } })
      : null;
    const valid = session && session.expiresAt > new Date() && session.user.role === "patient";
    if (valid) return NextResponse.next();
    return NextResponse.redirect(new URL("/invite", request.url));
  }

  if (!needsDietitianSession(pathname, request.method)) return NextResponse.next();

  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const returnTo = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login/dietitian?returnTo=${returnTo}`, request.url));
  }

  // A valid Clerk session only proves *authentication* — Restricted mode keeps sign-up
  // invite-only, but this is the app-side check that it's actually linked to a dietitian
  // seat, re-verified every request the same way the old session-row check was (no cached
  // claim to trust). Fast path first (no Clerk API call); the slow path (fetch email, try to
  // claim an open seat) only runs once, on a brand-new account's first request.
  let dietitianUser = await findLinkedDietitianUser(userId);
  if (!dietitianUser) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
    if (email) dietitianUser = await claimOpenSeat(userId, email);
  }

  if (dietitianUser) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No dietitian account is linked to this sign-in." }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/login/dietitian/no-access", request.url));
}, resolveClerkKeys);

// Only excludes genuine static assets — everything else (including /invite, /login, /me,
// /api/health, etc.) still reaches needsDietitianSession() above, which is the real source of
// truth and already returns false (no-op, no DB call) for all of them. Narrower exclusions
// here would just be a performance micro-optimization with a real risk of a path-prefix bug
// (e.g. a future route that happens to start with the same letters as an excluded segment).
// Also broad enough to satisfy Clerk's own requirement that its middleware run on effectively
// every route (session handshake/refresh), not just ones we explicitly gate.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|phosphor/).*)"],
};
