import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, isUuid, num } from "@/lib/db";
import { parseFoodLog, matchFood } from "@/lib/foodLog";

export const dynamic = "force-dynamic";

const CONFIDENCE_TIER: Record<string, number> = { photo: 1, voice: 2, text: 3 };

const consumptionBody = z
  .object({
    source: z.enum(["photo", "voice", "text"]),
    text: z.string().min(1).max(2000).optional(),
    imageBase64: z.string().optional(),
    mediaType: z.string().optional(),
  })
  .refine((b) => (b.source === "photo" ? !!b.imageBase64 : !!b.text), {
    message: "photo logs need imageBase64; voice/text logs need text",
  });

// POST /api/patients/:id/consumption — Quick Log: photo/voice/text -> a real ConsumptionEvent.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = consumptionBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "patient not found" }, { status: 404 });

  let extraction;
  try {
    extraction = await parseFoodLog({ text: body.text, imageBase64: body.imageBase64, mediaType: body.mediaType });
  } catch {
    return NextResponse.json({ error: "couldn't read that log — try again" }, { status: 502 });
  }

  const match = await matchFood(id, extraction.foodName);
  const flag = extraction.needsReview || !match.fdcId ? "needs_review" : "ok";

  const event = await prisma.consumptionEvent.create({
    data: {
      patientId: id,
      foodName: extraction.foodName,
      fdcId: match.fdcId,
      quantityServings: extraction.quantityServings,
      rawInput: body.text ?? null,
      consumedDate: new Date(),
      source: body.source,
      confidenceTier: CONFIDENCE_TIER[body.source],
      matchConfidence: match.matchConfidence,
      flag,
    },
  });

  return NextResponse.json({
    id: event.id,
    foodName: event.foodName,
    quantityServings: num(event.quantityServings),
    consumedDate: event.consumedDate,
    source: event.source,
    flag: event.flag,
    matchedApproved: match.matchedApproved,
  });
}

// GET /api/patients/:id/consumption?days=14 — recent entries for Quick Log's history list.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const days = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 14));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.consumptionEvent.findMany({
    where: { patientId: id, consumedDate: { gte: since } },
    orderBy: { consumedDate: "desc" },
  });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id, foodName: e.foodName, quantityServings: num(e.quantityServings),
      consumedDate: e.consumedDate, source: e.source, flag: e.flag,
    })),
  });
}
