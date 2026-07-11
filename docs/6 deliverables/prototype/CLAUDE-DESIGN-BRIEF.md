# Claude Design brief — Smart Savor website

Paste the block below into **Claude Design**. Fill the `«...»` placeholders first (see the
▶ table in `DESIGN_SYSTEM.md`). Attach `DESIGN_SYSTEM.md` alongside it for the full token spec.

---

**Design and build the Smart Savor marketing + product-walkthrough website — 6 static HTML
pages sharing one `styles.css`, deployable to GitHub Pages with no build step.**

**Product (one line):** an adherence-and-outcomes tool for dietitians. A doctor sets the
nutrient target, the patient chooses the food that hits it, and the app computes how much —
so the diet becomes a menu the patient picks from, not a prescription they endure.

**Brand & feel — "Premium Blue & White, quiet luxury":** generous whitespace, hairline
borders, soft blue radial background washes, subtle 0.18–0.22s transitions. Blue is the brand
and every primary action. Nothing loud.
- Name/wordmark: **«Smart Savor»**  ·  Tagline: **«Your doctor tells your body what it needs — you decide what's on your plate.»**
- Logo mark: «leaf glyph on a blue gradient tile».

**Design system (use exactly — full tokens in DESIGN_SYSTEM.md):**
- Colors from CSS variables only, never hardcoded. Primary blue `«#1d4ed8»`, deep `#172554`,
  accent `#3b82f6`, bg `#f6f8fc`, border `#e2e8f0`. Semantic green/amber/red are for
  **clinical states only** (in-range / flagged / excluded), never decoration.
- Type: **«Fraunces»** (serif, 600) for display headings, **«Inter»** for body — Google Fonts.
  Italic `<em>` inside an `h1` renders in blue (keep this editorial accent).
- Icons: **Phosphor web** (`<i class="ph ph-…">`), no emojis in UI chrome.
- Radius 16px (buttons 12, pills 999), layered soft shadows, `:focus-visible` rings.
- Reuse a small component kit: glass sticky `.topbar`, pill `.protonav`, `.card`
  (+`.featured`), `.btn`/`.btn.primary`, `.chip`, `.note` callouts, `.row`+`.rank`, `.gauge`
  progress tracks, and a `.food` swap-picker. Put every new pattern in `styles.css`.

**Constraints:** static only — no framework, no npm, no build. One shared `styles.css`. Pages
open as files and deploy to GitHub Pages as-is. Fonts + Phosphor via CDN.

**Pages (each with the shared topbar + a pill nav linking all six; ⭐ = hero):**
1. `index.html` — walkthrough map: hero (`h1` with a blue-italic word) + a 2-col grid of 6
   linking cards (5 loop stages + a weekly-nudge card; the swap card is featured).
2. `dietitian-prioritize.html` (Dietitian D1.5) — agent-drafted 6–10 focus set from the
   patient's labs as ranked rows with reasons/pairs/conflicts; Confirm / Override.
3. `dietitian-ratify.html` (Dietitian D2/D3) — comorbidity-screened swap menu per gap;
   approve / edit / remove (excluded items in red).
4. `patient-swap.html` ⭐ (Patient P2 — THE USP) — **interactive**: a grid of iron-closing
   foods; clicking one highlights it and a result panel **recomputes the amount** ("~1½ cups
   … closes your iron gap") with a "still within your dietitian's approved plan" stamp.
   Keyboard-accessible picker.
5. `patient-dashboard.html` (Patient P4) — progress gauges trending toward "in range" (turn
   green when met) + a gentle weekly nudge card + an honesty note ("intake toward target,
   from logged foods — not a blood level").
6. `patient-freshbox.html` (Patient P5 — future) — the "auto-order approved produce to your
   door" differentiator, clearly marked out-of-scope-v1 (amber).

**Seeded data (use verbatim):** patient **Sam Rivera**, 54, Type 2 diabetes + cardiac risk,
BMI 30.3, BP 138/88; dietitian **Maria, RD**. Flagged gaps: iron 9→18 mg, vitamin C 40→90 mg,
magnesium 300→420 mg. Labs: HbA1c 7.2% (high), LDL 151, HDL 34 (low), triglycerides 210,
vitamin D 18 (low). Example iron swaps: super blend, paprika, roasted red peppers, lentils,
spinach. Voice: warm and plain to Sam; clinical-precise to Maria.

**Deliverable:** the 6 HTML files + one `styles.css`, tokens-defined, accessible, and
cross-linked through the nav. Match the "premium blue & white, quiet luxury" feel throughout.

---

*Tip: if Claude Design outputs editable mockups rather than code, the same brief applies —
ask it to then export static HTML/CSS matching the tokens above.*
