# Smart Savor — Health & Pantry Profile MCP

The **custom MCP** for Smart Savor (capstone Bar 3). It is the bespoke source that:
- stores each patient's **flagged gaps, constraints, dislikes, budget, logged intake, and 3-month cycle**, and
- serves the **stitched price × nutrient reference table** so nutrients attach to price.

This is a **scaffold**: backed by an in-memory seed store (`store.py`) with one demo
patient (Sam Rivera) and a small slice of the reference table. The tool surface is the
real one — in production, swap `store.py` for PostgreSQL (+ pgvector) and the pre-computed
Walmart × USDA join. The MCP tools don't change.

## Run

```bash
cd smart-savor-mcp
python3 -m venv .venv && source .venv/bin/activate   # or use the repo .venv
pip install -r requirements.txt
python server.py                                     # starts the MCP over stdio
```

Then register it with your MCP client / the Claude Agent SDK runner (stdio transport,
command = `python server.py`).

## Tools

| Tool | Purpose | Used by |
|---|---|---|
| `get_patient_profile` | name, conditions, constraints (restrictions, dislikes, budget) | all agents |
| `get_flagged_gaps` | nutrient gaps the **dietitian** flagged from the lab (agent never sets these) | Cycle Prioritization |
| `get_habit_model` | what the patient actually buys (from receipts) | Prioritization, Swap Sourcing |
| `get_cycle` | active 3-month cycle: start, re-test date, confirmed focus set | all |
| `query_nutrient_sources` | **headline** — foods supplying a nutrient, ranked by gap-closing efficiency (price optional via `sort_by="cost"`) | Swap Sourcing (Gap Resolver) |
| `save_focus_set` | persist the dietitian-confirmed 6–10 focus set (from UI D1.5) | Prioritization |
| `log_intake` | update habit model with a newly observed item | Receipt Ingestion |

## Smoke test (no MCP SDK needed)

The deterministic core runs standalone:

```bash
python3 -c "import store; [print(r['food'], r['amount']) for r in store.query_reference('iron', exclude=['White rice'])]"
```

Expected (B2B default, `sort_by='gap_efficiency'`): **Lentils** rank first by mg of iron
per serving — closes the gap fastest. Pass `sort_by='cost'` for the optional affordability
view (B2C path); price is **never enforced** unless `max_cost_per_unit` is supplied.

## Production notes
- Replace `store.py` with Postgres; load the pre-computed join (filtered to Produce,
  Dairy, Meat/Seafood, Frozen) once at build time.
- Add `pgvector` for the Food Matcher's semantic name→FDC matching.
- Keep prices and nutrients **real**; impute only genuinely missing fields (e.g. pack size)
  and flag them.

See `../smart-savor-tech-stack.md` and `../smart-savor-agents.md` for how this MCP fits the
agent architecture.
