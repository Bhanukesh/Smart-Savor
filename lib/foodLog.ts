/**
 * Quick Log parsing — turns a raw photo/voice/text food log into a structured entry.
 *
 * Single-shot structured extraction (forced tool_choice), same pattern as
 * smart-savor-mcp/intake_agent.py's Agent 1: one Claude call, schema-constrained output,
 * never asked to invent an fdcId — that's resolved deterministically afterward by
 * matchFood() against the patient's own approved-list items (falling back to the broader
 * grocery_items table), not guessed by the model.
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";

const MODEL = process.env.SMART_SAVOR_FOODLOG_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the Smart Savor Quick Log parser. A patient just logged something they ate —
by photo, voice transcript, or typed text. Extract ONE structured entry.

RULES:
- Identify the single most prominent food item. If multiple foods are mentioned/shown, pick the
  main one and note the rest can't be captured yet (lower confidence).
- Estimate quantityServings as a plain multiplier of a typical serving (e.g. "a cup of lentils" = 1,
  "two bananas" = 2, "just a bite" = 0.5). Default to 1 if you can't tell.
- Be honest: if the image is unclear or the text is ambiguous, set a low confidence and
  needsReview=true rather than guessing a specific food.
- Always respond by calling the record_food_log tool. Do not write prose.`;

const FOOD_LOG_SCHEMA: Anthropic.Tool = {
  name: "record_food_log",
  description: "Record one structured food log entry extracted from a patient's photo, voice, or text log.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["foodName", "quantityServings", "confidence", "needsReview"],
    properties: {
      foodName: { type: "string", description: "Plain food name, e.g. 'lentils', 'grilled chicken breast'." },
      quantityServings: { type: "number", description: "Multiplier of a typical serving." },
      confidence: { type: "number", description: "0.0-1.0" },
      needsReview: { type: "boolean" },
    },
  },
};

export type ParsedFoodLog = {
  foodName: string;
  quantityServings: number;
  confidence: number;
  needsReview: boolean;
};

export async function parseFoodLog(input: { text?: string; imageBase64?: string; mediaType?: string }): Promise<ParsedFoodLog> {
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [];

  if (input.imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: (input.mediaType as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg", data: input.imageBase64 },
    });
    content.push({ type: "text", text: "Extract the food log entry from this photo using the record_food_log tool." });
  } else {
    content.push({
      type: "text",
      text: `Extract the food log entry from this patient log using the record_food_log tool:\n\n"${input.text ?? ""}"`,
    });
  }

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tools: [FOOD_LOG_SCHEMA],
    tool_choice: { type: "tool", name: "record_food_log" },
    messages: [{ role: "user", content }],
  });

  const block = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("food log parse: no tool_use block returned");
  return block.input as ParsedFoodLog;
}

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[(),]/g, "").split(/\s+/).filter(Boolean));
}

/**
 * Resolve a parsed food name to an fdcId, deterministically (never via the LLM).
 * Prefers a match against the patient's own ratified approved-list items — that's what
 * computeDashboard() reads, so a food that matches there immediately counts toward a gauge.
 * Falls back to a broader grocery_items lookup for foods that aren't gap-relevant.
 */
export async function matchFood(
  patientId: string,
  foodName: string,
): Promise<{ fdcId: string | null; matchConfidence: number; matchedApproved: boolean }> {
  const approvedItems = await prisma.approvedListItem.findMany({
    where: { approvedList: { patientId }, status: "approved", fdcId: { not: null } },
    select: { foodName: true, fdcId: true },
  });

  const inputTokens = tokens(foodName);
  let best: { fdcId: string; overlap: number } | null = null;
  for (const item of approvedItems) {
    if (!item.fdcId) continue;
    const overlap = [...inputTokens].filter((t) => tokens(item.foodName).has(t)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { fdcId: item.fdcId, overlap };
  }
  if (best) return { fdcId: best.fdcId, matchConfidence: Math.min(0.95, 0.6 + best.overlap * 0.15), matchedApproved: true };

  const row = await prisma.groceryItem.findFirst({
    where: { productName: { contains: foodName, mode: "insensitive" } },
    select: { fdcId: true },
  });
  if (row) return { fdcId: row.fdcId, matchConfidence: 0.5, matchedApproved: false };

  return { fdcId: null, matchConfidence: 0, matchedApproved: false };
}
