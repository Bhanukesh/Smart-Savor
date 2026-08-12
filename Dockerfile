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
# Clerk's publishable keys are inlined into the client JS bundle at build time — a runtime env
# var on the Container App does nothing for them (see .claude/skills/add-env-var Route C).
# Two separate Clerk apps (dietitian, patient — see CLAUDE.md), two separate keys.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PATIENT_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_PATIENT_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_PATIENT_CLERK_PUBLISHABLE_KEY
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

EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
