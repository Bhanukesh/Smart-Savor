import { NextResponse } from "next/server";
import { z } from "zod";
import { loginDietitian } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const loginBody = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login — dietitian email+password login. Rate-limited per IP: this is the
// one endpoint in the app that turns a guess into a real session, so it's the one worth
// throttling most.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`login:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const parsed = loginBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const result = await loginDietitian(parsed.data.email, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  return NextResponse.json({ dietitianName: result.dietitianName });
}
