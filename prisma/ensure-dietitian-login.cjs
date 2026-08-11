// Production bootstrap/sync for the seeded dietitian's login — plain CommonJS (no tsx in the
// standalone runtime image, same constraint as the old seed-once.cjs). Safe to leave wired in
// permanently and re-run on every startup: it only ever touches this one User row, never
// anything else. Needed because proxy.ts's dietitian login wall shipped after production's
// one-time seed already ran, so the live database had a Dietitian row with no matching
// User/password at all.
//
// Upserts, not create-once-and-skip: whatever DEMO_DIETITIAN_PASSWORD currently is becomes the
// current password, every deploy. The first version only ever *created* the row and skipped
// forever after that — which meant once a row existed, changing the secret later had no
// effect, silently. That's a much more confusing failure mode than "the password is whatever
// the secret currently says" is worth avoiding.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const EMAIL = "maria@metronutrition.example";

async function main() {
  const password = process.env.DEMO_DIETITIAN_PASSWORD;
  if (!password) {
    console.log("[ensure-dietitian-login] DEMO_DIETITIAN_PASSWORD not set — skipping.");
    return;
  }

  const dietitian = await prisma.dietitian.findFirst({ where: { email: EMAIL } });
  if (!dietitian) {
    console.log(`[ensure-dietitian-login] No dietitian row for ${EMAIL} — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await prisma.user.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, passwordHash, role: "dietitian", dietitianId: dietitian.id },
    update: { passwordHash },
  });
  console.log(`[ensure-dietitian-login] Synced login for ${EMAIL} (user id ${result.id}).`);
}

// Deliberately never exits non-zero: this runs backgrounded (not chained with &&) before
// node server.js in the Dockerfile CMD anyway, but stays non-fatal too as defense in depth —
// a bug or transient DB hiccup here must never be able to affect the server itself.
main()
  .catch((err) => {
    console.error("[ensure-dietitian-login] failed (non-fatal):", err);
  })
  .finally(() => prisma.$disconnect());
