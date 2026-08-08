/**
 * Food Coach Agent — a conversational, patient-facing agent Sam can talk to about his
 * own gaps, focus set, and ratified swap menus, and use to make the USP choice by chat
 * instead of tapping a card on /me/swap.
 *
 * A genuine agent loop (multiple uncertain steps + tool calls), unlike Agent 1's
 * single-shot extraction — the model decides which reads it needs and whether the
 * patient's request maps to a real, ratified choice.
 *
 * Boundaries (same clinical-authority rules as the rest of the product):
 *  - Read-only over profile/focus-set/approved-list — never sets flagged_gaps or targets.
 *  - The only write is choose_food, which calls the exact same recompute path
 *    (createChoice -> computeChoice) as the swap screen — no separate logic, so a
 *    chat-driven choice and a tap-driven choice are guaranteed to agree.
 *  - Can only surface items already on a RATIFIED approved list — never invents foods
 *    or proposes anything the dietitian hasn't approved.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getPatient, getFocusSet, getApprovedList, createChoice } from "./data";

const MODEL = process.env.SMART_SAVOR_COACH_MODEL || "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 6;

export type CoachMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are the Smart Savor Food Coach, chatting directly with a patient (not the dietitian).

Your job: help the patient understand their nutrient focus areas and pick a food from
their dietitian-ratified approved list — the same "choose a food, we compute the amount"
moment as the swap screen, just conversational.

RULES:
- You do NOT decide gaps or targets — those are the dietitian's. Never suggest a target
  changed or that you're overriding her plan.
- Only ever offer foods that come back from get_approved_list for that patient. Never
  invent a food, a nutrient amount, or a substitute that isn't on the ratified list.
- If the patient wants something not on the list (an allergy, a dislike, "what about X"),
  say it's not on their ratified menu and suggest they raise it with their dietitian —
  don't improvise a workaround.
- When the patient picks a food, call choose_food with its approvedListItemId. Report
  back the recomputed servings and confirm it's still within the dietitian's approved plan
  (this is the USP: same target, food they'll actually eat).
- Warm, brief, plain language — this is a person managing a chronic condition, not a
  lab report. No medical jargon, no diagnosing, no clinical claims beyond what the tools
  return.
- If you don't have enough information yet, call a tool rather than guessing.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_profile",
    description: "The patient's conditions, dietary restrictions, dislikes, and weekly budget.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_focus_set",
    description: "The dietitian's ranked nutrient focus set for this cycle, with the why for each.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_approved_list",
    description: "The dietitian-ratified swap menu for one nutrient gap the patient can choose from.",
    input_schema: {
      type: "object",
      properties: {
        nutrient: {
          type: "string",
          description: "Nutrient key from the focus set, e.g. iron, vitamin_c, magnesium.",
        },
      },
      required: ["nutrient"],
      additionalProperties: false,
    },
  },
  {
    name: "choose_food",
    description:
      "Record the patient's pick from an approved list and recompute the serving amount that closes their gap (the USP moment). Only call with an approvedListItemId returned by get_approved_list.",
    input_schema: {
      type: "object",
      properties: {
        approvedListItemId: { type: "string", description: "id of the item from get_approved_list" },
        gapRemaining: { type: "number", description: "optional override; omit to use the current gap" },
      },
      required: ["approvedListItemId"],
      additionalProperties: false,
    },
  },
];

async function runTool(patientId: string, name: string, input: Record<string, unknown>) {
  switch (name) {
    case "get_profile": {
      const p = await getPatient(patientId);
      if (!p) return { error: "patient not found" };
      const { id, name: patientName, ...rest } = p;
      return { id, name: patientName, ...rest };
    }
    case "get_focus_set":
      return { focusSet: await getFocusSet(patientId) };
    case "get_approved_list": {
      const nutrient = String(input.nutrient ?? "");
      const list = await getApprovedList(patientId, nutrient);
      if (!list) return { error: `no approved list for ${nutrient}` };
      return { ...list, items: list.items.filter((i) => i.status === "approved") };
    }
    case "choose_food": {
      const itemId = String(input.approvedListItemId ?? "");
      const gapRemaining = typeof input.gapRemaining === "number" ? input.gapRemaining : undefined;
      const result = await createChoice(patientId, itemId, gapRemaining);
      if (!result) return { error: "that item isn't on an approved list I can find" };
      return result;
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}

/** Run one conversational turn: prior history + the new user message -> the coach's reply. */
export async function runCoachTurn(
  patientId: string,
  history: CoachMessage[],
  message: string,
): Promise<string> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: message },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) {
      return resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    }

    messages.push({ role: "assistant", content: resp.content });
    const toolResults = await Promise.all(
      toolUses.map(async (tu) => ({
        type: "tool_result" as const,
        tool_use_id: tu.id,
        content: JSON.stringify(await runTool(patientId, tu.name, tu.input as Record<string, unknown>)),
      })),
    );
    messages.push({ role: "user", content: toolResults });
  }

  return "Sorry — I'm having trouble pulling that up right now. Try again in a moment?";
}
