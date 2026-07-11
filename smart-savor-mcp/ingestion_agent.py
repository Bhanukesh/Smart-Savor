"""Agent 2 — Ingestion Agent: Receipts + Logs (wraps Skill A, Food Matcher).

Reads BOTH signals:
- receipts -> the PURCHASE habit model (what the patient buys, per week)
- food logs -> CONSUMPTION events (what they actually ate)

Each item is resolved to a reference-table food via Skill A. Non-food items are
skipped; unresolved items are flagged, never fabricated. Code owns the tallies and the
purchase-vs-consumption reconciliation; the model layer (not required for the sample
text inputs) would handle vision for receipt images / photo logs.
"""

from __future__ import annotations

import re

import skills
import store

_RECEIPT_LINE = re.compile(r"^(.+?)\s{2,}(\d+)\s+\$?[\d.]+\s*$")


def ingest_receipt(path: str, patient_id: str, date: str = "2026-06-28") -> dict:
    """Parse a grocery receipt -> resolve each item -> update the PURCHASE habit model."""
    items, skipped = [], []
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = _RECEIPT_LINE.match(line.rstrip("\n"))
            if not m:
                continue
            raw, qty = m.group(1).strip(), int(m.group(2))
            match = skills.food_matcher(raw)
            if not match["matched"]:
                skipped.append(raw)                    # non-food or unresolved -> skip
                continue
            store.log_intake(patient_id, match["food"], float(qty), date)  # freq/week ~ qty
            items.append({"raw": raw, "food": match["food"], "fdc_id": match["fdc_id"],
                          "qty": qty, "match_confidence": match["match_confidence"]})
    return {"source": "receipt", "matched": len(items), "items": items,
            "skipped_nonfood": skipped}


def ingest_log(path: str, patient_id: str) -> dict:
    """Parse a food log -> resolve each item -> write CONSUMPTION events."""
    events = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.upper() == "FOOD LOG":
                continue
            m = re.match(r"^(\d{4}-\d{2}-\d{2})\s+(.+)$", s)
            date, item = (m.group(1), m.group(2)) if m else (None, s)
            match = skills.food_matcher(item)
            event = {"item": match["food"] if match["matched"] else item, "raw": item,
                     "date": date, "source": "text",
                     "confidence": "text", "match_confidence": match["match_confidence"],
                     "flag": "ok" if match["matched"] else "needs_review"}
            store.add_consumption_event(patient_id, event)
            events.append(event)
    return {"source": "log", "count": len(events), "events": events}
