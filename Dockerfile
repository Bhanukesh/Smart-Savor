# Capstone deployment image — Next.js standalone + Prisma migrate-on-start.
#
# Requires next.config.ts to include:  output: 'standalone'
# The entrypoint runs `prisma migrate deploy` BEFORE the server starts — the
# Day 4 rule ("always migrate before deploying new code") encoded in the image.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /src
# node:22-alpine ships libssl.so.3 but no `openssl` binary — without it, Prisma
# can't detect the actual OpenSSL version, silently defaults to guessing
# openssl-1.1.x, and generates a query engine that can't find libssl.so.1.1
# (it doesn't exist, only .so.3 does). Installing openssl lets Prisma detect
# correctly and pick the matching engine.
RUN apk add --no-cache openssl
# --ignore-scripts: this project's package.json runs `prisma generate` as a
# postinstall hook, which would otherwise fire here — before COPY . . brings
# in prisma/schema.prisma — and fail with "schema not found". Generation
# still happens explicitly below, once the schema is actually present.
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime stage ----
FROM node:22-alpine
WORKDIR /app
# Same reason as the build stage: the query engine binary needs the real
# libssl available at runtime too, not just at generate time.
RUN apk add --no-cache openssl
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# Next standalone output + static assets
COPY --from=build /src/.next/standalone ./
COPY --from=build /src/.next/static ./.next/static
COPY --from=build /src/public ./public

# Prisma: schema + migrations + the CLI for `migrate deploy` at startup.
# Invoke the CLI at its real path (not the .bin shim): COPY dereferences the
# .bin symlink into a stray file, and Prisma 7+ loads its WASM engines
# relative to the CLI's own location — the shim copy crashes with
# ENOENT prisma_schema_build_bg.wasm before the server starts.
COPY --from=build /src/prisma ./prisma
COPY --from=build /src/node_modules/prisma ./node_modules/prisma
COPY --from=build /src/node_modules/@prisma ./node_modules/@prisma
# prisma/ensure-dietitian-login.cjs is a plain, un-bundled script — unlike the app's own login
# route, Next's standalone trace never gives it a real bcryptjs to require(). The app's route
# handler works fine without this because bcryptjs gets inlined directly into its compiled
# bundle; this script does a raw require() of the actual package, so it needs the real thing
# present. Pure JS, no native bindings, so a plain copy is enough (this is exactly why bcryptjs
# was chosen over node-bcrypt in the first place).
COPY --from=build /src/node_modules/bcryptjs ./node_modules/bcryptjs

EXPOSE 3000
# ensure-dietitian-login.cjs is intentionally permanent here, unlike the old one-time
# seed-once.cjs — it only ever creates a missing login, never touches existing data, so it's
# safe to run on every startup. Needed because the dietitian login wall shipped after
# production's one-time seed already ran (see that file's comment for the full story).
#
# Run with `&`, not `&&`: it's backgrounded, not chained. The script's own non-fatal error
# handling only protects against it *failing fast* — it does nothing if the process instead
# *hangs* (e.g. a slow/stuck DB connection), and a hang in an && chain means node server.js
# never runs at all, so Container Apps' readiness probe never gets a response and the whole
# revision fails to activate ("Deployment Progress Deadline Exceeded. 0/1 replicas ready.") —
# which is exactly what happened the first time this shipped. Backgrounding it means the
# server starts immediately regardless of what the bootstrap script does.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && (node prisma/ensure-dietitian-login.cjs &) && node server.js"]
