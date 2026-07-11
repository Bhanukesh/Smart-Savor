# Smart Savor — Design System
*Premium Blue & White · shadcn/tweakcn token architecture · Inter (self-hosted) · Phosphor icons*

A self-contained spec for (re)building the Smart Savor website. Hand this — plus the
**Claude Design brief** (`CLAUDE-DESIGN-BRIEF.md`) — to Claude Design.

---

## ▶ 0. Values YOU need to fill in
The system is complete except for these brand decisions (current prototype defaults shown):

| # | Value | Current default | Your input |
|---|---|---|---|
| 1 | **Product name / wordmark** | "Smart Savor" (working name) | `______` |
| 2 | **Logo mark** | Phosphor `ph-leaf` glyph on a blue gradient tile | `______` (SVG? keep glyph?) |
| 3 | **Tagline** | "Your doctor tells your body what it needs — you decide what's on your plate." | `______` |
| 4 | **Primary brand blue** | `#1d4ed8` (blue-700) | `______` (keep / brand hex) |
| 5 | **Type** | **Inter only** (body + display), self-hosted | ✔ decided |
| 6 | **Deploy URL** | GitHub Pages (TBD) | `______` |
| 7 | **Dark mode?** | Light only (v1) | `______` (yes / no) |
| 8 | **Imagery / illustration** | None — pure UI, no photos | `______` (want any?) |
| 9 | **Footer / legal / contact** | None yet | `______` |

Everything below is defined and ready.

---

## 1. Principles — the feel
**Quiet luxury.** Generous whitespace, hairline borders, soft blue radial background washes,
subtle 0.18–0.22s transitions. Nothing loud. **Blue is the brand and every primary/positive
action.** The clinical semantic colors (green/amber/red) are reserved *only* for clinical
states — in-range / flagged / excluded — never for decoration.

---

## 2. Color tokens
All colors are CSS custom properties in `:root`. **Never hardcode hex in HTML.**

```css
/* base */
--background:#f6f8fc;  --foreground:#0f172a;
--card:#ffffff;        --card-foreground:#0f172a;
--muted:#f1f5f9;       --muted-foreground:#64748b;
--border:#e2e8f0;      --ring:rgba(59,130,246,.35);
/* brand blue */
--primary:#1d4ed8;         /* blue-700 — primary actions, brand */
--primary-strong:#1e40af;  /* blue-800 */
--primary-deep:#172554;    /* blue-950 — display headings */
--primary-foreground:#ffffff;
--primary-soft:#dbeafe;    --primary-tint:#eff6ff;
--accent:#3b82f6;          /* blue-500 — hovers, focus, editorial */
/* semantic — CLINICAL STATES ONLY */
--success:#047857; --success-soft:#d1fae5; --success-tint:#ecfdf5;  /* in range / safe */
--warning:#b45309; --warning-soft:#fef3c7; --warning-tint:#fffbeb;  /* flagged / future */
--danger:#dc2626;  --danger-soft:#fee2e2;  --danger-tint:#fef2f2;   /* excluded / critical */
```
**Background wash** (body): two soft blue radial gradients over `--background`. Patient pages
(`body.patient`) get a slightly warmer blue vertical gradient.

---

## 3. Typography — **Inter only** (body + display, no serif)
- **Display (headings):** Inter — `h1` weight **700**, `h2` **600**, both letter-spacing `-.02em`;
  `h1` 34px (`--primary-deep`), `h2` 19px (`--foreground`). Hierarchy comes from **weight + size**,
  not a serif contrast. **Italic `<em>` inside `h1` renders in `--primary` (blue)** — the signature
  editorial accent; preserve it.
- **Body/UI:** Inter, 15px base, line-height 1.5, `--foreground`.
- **Eyebrow:** 11.5px, weight 600, uppercase, `.12em` tracking, `--primary`, with a short
  gradient rule before it.
- **Loading:** self-hosted — `@import "fonts.css";` at the top of `styles.css` → `fonts/`
  (Inter 400/500/600/700 + italics), `font-display: swap`. No Google Fonts.

---

## 4. Space · radius · shadow · motion
```css
--radius:16px; --radius-sm:10px;          /* buttons 12px, chips/pills 999px */
--shadow-xs:0 1px 2px rgba(15,23,42,.05);
--shadow:0 1px 3px rgba(15,23,42,.06),0 4px 12px rgba(30,64,175,.05);
--shadow-lg:0 4px 10px rgba(15,23,42,.05),0 16px 40px rgba(30,64,175,.10);
--shadow-btn:0 1px 2px rgba(29,78,216,.35),0 6px 16px rgba(29,78,216,.28);
```
Transitions **0.18–0.22s**. Layout width: `.wrap` max **980px** (`.narrow` 600px), padding
`32px 28px 48px`. Card link hover = `translateY(-3px)` + `--shadow-lg`.

---

## 5. Icons — Phosphor only
`<i class="ph ph-name">`, `ph-fill` for emphasis, `ph-bold` inside buttons. Color helpers
`.ic-primary/.ic-success/.ic-warning/.ic-danger`. **No emojis in UI chrome.** Load
`@phosphor-icons/web@2.1.1` from CDN.

---

## 6. Components (reuse before inventing)
| Class | What it is |
|---|---|
| `.topbar` | Glass sticky header (blur + hairline bottom border); holds `.brand` + `.who` |
| `.brand .mark` | 32px rounded tile, blue gradient, white icon — the logo lockup |
| `.protonav` | Pill nav; `.here` = active (blue gradient fill) |
| `.eyebrow` | Uppercase kicker with gradient tick |
| `.card` | 16px radius, layered shadow, 22px pad; `a.card` lifts on hover; `.card.featured` = accent ring + tint (the USP card) |
| `.grid.two` | 2-col, collapses to 1 under 680px |
| `.chip` | Pill badge: `.blue/.green/.amber/.red/.ghost` |
| `.btn` / `.btn.primary` / `.btn.sm` | shadcn-style; primary = blue gradient + shadow ring; `:focus-visible` ring |
| `.note` | Left-border callout: default (blue), `.honesty` (accent), `.future` (amber), `.safe` (green) |
| `.row` + `.rank` | List row with a 32px leading rank tile: `.ok/.warn/.bad` map to clinical colors |
| `.gauge` (`.track`/`.fill`/`.fill.done`/`.target`/`.cap`) | Progress toward a target mark; `.done` turns green |
| `.food` grid (`.foodgrid`/`.food`/`.food.active`/`.pick`/`.result`/`.stamp`) | The USP swap picker (see §9) |

Any **new** pattern goes into `styles.css` — never inline styles.

---

## 7. Accessibility
`:focus-visible` rings on all interactives; keyboard support on the food picker
(arrow/enter, `.kbd` hint); sufficient contrast for blue-on-white; semantic color never the
*only* signal (pair with icon/label).

---

## 8. Constraints (non-negotiable)
Static only — **no build step, no framework, no npm**. One shared `styles.css`. Pages open
directly as files and deploy to **GitHub Pages** as-is. Fonts + Phosphor via CDN `<link>`/`<script>`.

---

## 9. Pages (6 static HTML, one stylesheet)
Stage numbers map to the product loop; ⭐ = the USP moment.

1. **`index.html`** — walkthrough map. Topbar (brand + "Seeded patient: Sam Rivera · dietitian Maria, RD"), eyebrow "Product walkthrough", `h1` "The Smart Savor flow, *screen by screen*", then a `.grid.two` of 6 linking cards (the 5 stages + the weekly-nudge card). The swap card is `.card.featured`.
2. **`dietitian-prioritize.html`** — *Dietitian · D1.5.* Agent-drafted 6–10 focus set from Sam's labs, each `.row` with a `.rank`, reasons, pairs & conflicts; Confirm/Override buttons. Maria stays in control.
3. **`dietitian-ratify.html`** — *Dietitian · D2/D3.* Comorbidity-screened swap menu per gap; approve / edit / **remove** (excluded items use `.rank.bad` / `.chip.red`). Shows the hybrid safety (hard-exclude + flag).
4. **`patient-swap.html`** ⭐ — *Patient · P2 · THE USP.* **Interactive:** a `.foodgrid` of iron-closing foods; clicking one sets `.food.active`, and the `.result` panel recomputes the amount ("~1½ cups… closes your iron gap") with a `.stamp` "still within Maria's approved plan." Keep the picker JS + keyboard support.
5. **`patient-dashboard.html`** — *Patient · P4.* `.gauge` per target trending toward "in range" (green `.fill.done` when met) + the weekly **nudge** card. `.note.honesty`: *intake toward target, driven by logged foods — not a blood level.*
6. **`patient-freshbox.html`** — *Patient · P5 · future.* The Fresh Box differentiator (auto-order approved produce). Marked out-of-scope-v1 with `.chip.amber` + `.note.future`.

Every page: same `.topbar`, and a `.protonav` linking all 6 (active = `.here`). **Re-verify all
6 cross-link after any change.**

---

## 10. Seeded data (preserve — do not change the numbers)
- **Patient:** Sam Rivera, 54, male, Type 2 diabetes + elevated cardiac risk. BMI 30.3, BP 138/88.
- **Dietitian:** Maria, RD.
- **Flagged gaps (targets):** iron 9 → 18 mg · vitamin C 40 → 90 mg · magnesium 300 → 420 mg.
- **Other labs (from the report):** HbA1c 7.2% (High), LDL 151, HDL 34 (Low), triglycerides 210, vitamin D 18 (Low), ferritin 22 (Low).
- **Approved iron swaps (example):** super blend, paprika, roasted red peppers, lentils, spinach.
- **Voice/copy:** warm, plain, second-person to Sam; clinical-precise to Maria. Nudges are gentle, weekly, never nagging.
