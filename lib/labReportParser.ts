/**
 * Lab report parsing — single-shot structured extraction (forced tool_choice), same pattern
 * as lib/receiptParser.ts and lib/foodLog.ts. The model only transcribes what's on the page;
 * it never computes a target value or clinical severity — that's deterministic Typescript in
 * lib/data.ts's confirmLabFinding(), not something trusted to the model.
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.SMART_SAVOR_LAB_REPORT_MODEL || "claude-haiku-4-5-20251001";

const NUTRIENT_KEYS = [
  "iron", "vitamin_c", "magnesium", "calcium", "potassium", "zinc",
  "fiber", "protein", "folate", "vitamin_d", "vitamin_b12", "sodium",
] as const;

const SYSTEM_PROMPT = `You are the Smart Savor lab report parser. A patient uploaded a photo or scan of a
bloodwork/lab report. Transcribe every analyte result you can read that maps to one of these
tracked nutrients: ${NUTRIENT_KEYS.join(", ")}.

RULES:
- Only record a finding if you can confidently match it to one of the tracked nutrients above
  (e.g. "Ferritin" or "Serum Iron" -> "iron", "25-OH Vitamin D" -> "vitamin_d"). Skip anything
  that doesn't map cleanly — never guess or invent a value.
- Record the value and unit exactly as printed. Do not convert units, do not compute a target,
  do not judge severity — that is handled deterministically after extraction, not by you.
- Skip reference-range text, patient demographics, and unrelated panels (e.g. lipids, glucose)
  entirely — only the tracked nutrients above.
- Always respond by calling the record_lab_report tool. Do not write prose.`;

const LAB_REPORT_SCHEMA: Anthropic.Tool = {
  name: "record_lab_report",
  description: "Record every tracked-nutrient analyte result transcribed from a lab report.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["findings"],
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["nutrient", "label", "currentValue", "unit", "confidence"],
          properties: {
            nutrient: { type: "string", enum: [...NUTRIENT_KEYS] },
            label: { type: "string", description: "As printed on the report, e.g. 'Ferritin'." },
            currentValue: { type: "number" },
            unit: { type: "string", description: "As printed, e.g. 'ng/mL', 'mg/dL'." },
            confidence: { type: "number", description: "0.0-1.0" },
          },
        },
      },
    },
  },
};

export type ParsedLabFinding = {
  nutrient: (typeof NUTRIENT_KEYS)[number];
  label: string;
  currentValue: number;
  unit: string;
  confidence: number;
};

export type ParsedLabReport = { findings: ParsedLabFinding[] };

export async function parseLabReport(imageBase64: string, mediaType: string): Promise<ParsedLabReport> {
  const client = new Anthropic();
  const fileBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } }
      : { type: "image", source: { type: "base64", media_type: (mediaType as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg", data: imageBase64 } };
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [LAB_REPORT_SCHEMA],
    tool_choice: { type: "tool", name: "record_lab_report" },
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          { type: "text", text: "Extract every tracked-nutrient lab result from this report using the record_lab_report tool." },
        ],
      },
    ],
  });

  const block = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("lab report parse: no tool_use block returned");
  return block.input as ParsedLabReport;
}
