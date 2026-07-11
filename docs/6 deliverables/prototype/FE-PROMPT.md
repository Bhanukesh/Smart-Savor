# FE build prompt — paste into Claude Design

Start a **new design** in Claude Design (not the design-system view), paste the block below,
and when asked, select the **Smart Savor Design System**. The generated site appears under
your designs/projects.

---

Build the **Smart Savor** product-walkthrough website using the **Smart Savor Design System** —
reuse its components (TopBar, Navigation, Card, Button, Chip, Note, Row, Gauge, FoodPicker) and
its ColorTokens / Typography / Icons. **Inter for all type (body + display).** Static,
GitHub-Pages-ready, one shared `styles.css`, no build step.

Six pages, each with the TopBar + a Navigation linking all six:

1. **index** — walkthrough hero (h1 with a blue-italic word) + a 2-col grid of Cards for the 5
   loop stages; the swap card is featured.
2. **dietitian-prioritize** (D1.5) — a ranked focus set as Rows with rank tiles, reasons,
   pairs/conflicts; Confirm / Override Buttons.
3. **dietitian-ratify** (D2/D3) — a comorbidity-screened swap menu; approve / edit / remove
   (excluded items in red).
4. **patient-swap** ⭐ (THE USP) — a FoodPicker: clicking an iron food highlights it and a result
   panel **recomputes the amount** ("~1½ cups closes your iron gap") with a "still within your
   dietitian's approved plan" stamp. Keyboard-accessible.
5. **patient-dashboard** — Gauges trending toward "in range" (green when met) + a weekly nudge
   Note + an honesty Note ("intake toward target, from logged foods — not a blood level").
6. **patient-freshbox** (future) — auto-order approved produce; marked out-of-scope-v1 (amber).

**Feel:** premium blue & white, quiet luxury; hierarchy from weight + size (Inter 700/600), not a
serif. **Seeded data (verbatim):** Sam Rivera, 54, Type 2 + cardiac, BMI 30.3, BP 138/88;
dietitian Maria, RD; gaps iron 9→18, vitamin C 40→90, magnesium 300→420; labs HbA1c 7.2%,
LDL 151, HDL 34, triglycerides 210, vitamin D 18. **Voice:** warm to Sam, clinical-precise to Maria.

---

*Tip: if it stalls on all 6, ask for one page at a time (start with `index`, then `patient-swap`).
If the FoodPicker renders static, follow up: "wire the FoodPicker so selecting a food updates the
result panel with the recomputed amount and the approved stamp."*
