---
name: smart-savor-ds
description: Apply the Smart Savor Premium Blue & White design system — shadcn/tweakcn CSS tokens, self-hosted Inter type, Phosphor icons, .card/.btn/.chip components — to all prototype HTML and styles.css work.
---

# Smart Savor Design System

Use this skill for any UI change to the Smart Savor prototype in
`docs/6 deliverables/prototype/` — 6 static HTML pages (index.html,
dietitian-prioritize.html, dietitian-ratify.html, patient-swap.html,
patient-dashboard.html, patient-freshbox.html) sharing one styles.css.

## Non-negotiables
- All colors come from CSS custom properties in :root of styles.css.
  Never hardcode hex values in HTML.
- Static only: no build step, no frameworks, no npm, single shared
  stylesheet. Pages must open directly as files and deploy to GitHub
  Pages as-is.

## Tokens
--primary:#1d4ed8 · --primary-strong:#1e40af · --primary-deep:#172554
--accent:#3b82f6 · --background:#f6f8fc · --border:#e2e8f0
--muted-foreground:#64748b
Semantic --success / --warning / --danger are reserved for clinical
states (in range / flagged / excluded). Primary actions and brand
moments are always blue.

## Typography
Inter for everything — body AND display (no serif). Display hierarchy comes from
weight + size: h1 Inter 700, h2 600, both letter-spacing -0.02em. Self-hosted via
fonts.css (@import at the top of styles.css) → fonts/ (400/500/600/700 + italics),
font-display: swap; no Google Fonts. Italic <em> inside h1 renders in blue —
preserve this editorial accent.

## Icons
Phosphor web icons only: <i class="ph ph-name">, ph-fill for emphasis,
ph-bold inside buttons. No emojis in UI chrome.

## Components (reuse existing before inventing)
.card (16px radius, layered shadow, hover lift on links),
.btn / .btn.primary (blue gradient, shadow ring, focus-visible ring),
.chip badges, .note callouts, .rank leading icons (ok/warn/bad),
.gauge progress tracks, glass sticky .topbar, pill .protonav.
Any new pattern goes into styles.css, never inline styles.

## Feel
Quiet luxury: generous whitespace, hairline borders, soft blue radial
background washes, subtle 0.18–0.22s transitions. Nothing loud.

## Rules
1. Preserve all copy, seeded data (Sam Rivera / Maria, RD), page
   structure, and the interactive swap-picker JS in patient-swap.html.
2. New UI reuses existing classes/tokens before inventing new ones.
3. Maintain accessibility: focus-visible states, keyboard handling on
   the food picker, sufficient contrast on blue-on-white.
4. After any change, confirm all 6 pages still cross-link correctly
   through the prototype nav.
