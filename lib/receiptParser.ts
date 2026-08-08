/**
 * Receipt parsing — single-shot structured extraction (forced tool_choice), same pattern
 * as lib/foodLog.ts and smart-savor-mcp/intake_agent.py. The model transcribes what's on
 * the receipt; it never invents an fdcId — that's resolved deterministically afterward by
 * matchFood() in lib/foodLog.ts.
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.SMART_SAVOR_RECEIPT_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the Smart Savor receipt parser. A patient uploaded a photo of a grocery
receipt. Transcribe every food/grocery line item you can read.

RULES:
- For each line item, capture the raw text as printed AND your best guess at the plain food name
  (e.g. "LENTILS DRY 1LB" -> foodNameGuess "lentils"). If you can't tell what a line is, set
  foodNameGuess to null and needsReview=true — never invent a food.
- Skip non-food lines (tax, subtotal, loyalty discounts, bag fees) entirely — don't record them.
- Capture quantity and price if printed; null if not legible.
- Always respond by calling the record_receipt tool. Do not write prose.`;

const RECEIPT_SCHEMA: Anthropic.Tool = {
  name: "record_receipt",
  description: "Record every food/grocery line item transcribed from a receipt photo.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["retailer", "lineItems"],
    properties: {
      retailer: { type: ["string", "null"], description: "Store name if printed on the receipt." },
      lineItems: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rawText", "foodNameGuess", "quantity", "priceUsd", "confidence", "needsReview"],
          properties: {
            rawText: { type: "string" },
            foodNameGuess: { type: ["string", "null"] },
            quantity: { type: ["number", "null"] },
            priceUsd: { type: ["number", "null"] },
            confidence: { type: "number", description: "0.0-1.0" },
            needsReview: { type: "boolean" },
          },
        },
      },
    },
  },
};

export type ParsedReceiptLineItem = {
  rawText: string;
  foodNameGuess: string | null;
  quantity: number | null;
  priceUsd: number | null;
  confidence: number;
  needsReview: boolean;
};

export type ParsedReceipt = { retailer: string | null; lineItems: ParsedReceiptLineItem[] };

export async function parseReceipt(imageBase64: string, mediaType: string): Promise<ParsedReceipt> {
  const client = new Anthropic();
  const fileBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } }
      : { type: "image", source: { type: "base64", media_type: (mediaType as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg", data: imageBase64 } };
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [RECEIPT_SCHEMA],
    tool_choice: { type: "tool", name: "record_receipt" },
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          { type: "text", text: "Extract every food/grocery line item from this receipt using the record_receipt tool." },
        ],
      },
    ],
  });

  const block = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("receipt parse: no tool_use block returned");
  return block.input as ParsedReceipt;
}
