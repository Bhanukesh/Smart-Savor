// One-time production bootstrap — plain CommonJS (no tsx in the standalone runtime image,
// same constraint as the old seed-once.cjs). Unlike that script, this one is safe to leave
// wired in or re-run: it only ever *creates* the seeded dietitian's login if one doesn't
// already exist, never overwrites or touches anything else. Needed because proxy.ts's
// dietitian login wall shipped after production's one-time seed already ran, so the live
// database has a Dietitian row with no matching User/password yet.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const EMAIL = "maria@metronutrition.example";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`[ensure-dietitian-login] ${EMAIL} already has a login — nothing to do.`);
    return;
  }

  const password = process.env.DEMO_DIETITIAN_PASSWORD;
  if (!password) {
    console.log("[ensure-dietitian-login] DEMO_DIETITIAN_PASSWORD not set — skipping, no login created.");
    return;
  }

  const dietitian = await prisma.dietitian.findFirst({ where: { email: EMAIL } });
  if (!dietitian) {
    console.log(`[ensure-dietitian-login] No dietitian row for ${EMAIL} — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email: EMAIL, passwordHash, role: "dietitian", dietitianId: dietitian.id },
  });
  console.log(`[ensure-dietitian-login] Created login for ${EMAIL}.`);
}

// Deliberately never exits non-zero: this runs chained with `&&` before `node server.js` in
// the Dockerfile CMD, so a bug or transient DB hiccup here must never block the server itself
// from starting — worst case is just "dietitian login isn't bootstrapped this time," not
// "the whole app is down." Logged loudly either way so a real failure is still visible.
main()
  .catch((err) => {
    console.error("[ensure-dietitian-login] failed (non-fatal, continuing to start the server):", err);
  })
  .finally(() => prisma.$disconnect());
