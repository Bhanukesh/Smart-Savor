/**
 * Typed fetch wrappers — one function per existing Next.js API route (app/api/patients/[id]/*
 * and app/api/invite/* in the web app). Every route this app needs already exists and works;
 * nothing here requires a backend change beyond what the Health Report Analyzer agent added
 * (the lab-reports routes). Plain fetch, no React Query: each screen owns one or two GETs and
 * a handful of POST/PATCHes, the same pattern the web app's own client components already use
 * (POST, then splice the result into local state).
 */
import type {
  Patient, DashboardGauge, ConsumptionEntry, ReceiptSummary, ReceiptDetail, ReceiptLineItemEntry,
  LabReportSummary, LabReportDetail, LabReportFindingEntry, WeightCheckInEntry, NutrientHistory,
  MessageEntry, ApprovedList, ChoiceResult, FocusItem, ShoppingListItem,
} from "./types";

// Same machine's browser (expo start --web) reaches the Next.js dev server directly at
// localhost. A physical device/simulator needs the dev machine's LAN IP or the deployed URL
// instead — override via EXPO_PUBLIC_API_BASE_URL when running on-device.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Invite / identity ------------------------------------------------------------------

/** The Google sign-in path (app/(auth)/signup.tsx + details.tsx) — same endpoint the web app's
 * confirm-details step calls. The web version relies on a cookie-based session; this one sends
 * the Clerk session token as a Bearer header instead (the standard cross-origin pattern —
 * Clerk's own auth() on the server reads either transparently). `clerkToken` comes from the
 * signed-in Clerk session's getToken(), not this app's own patient session (that only exists
 * after this call succeeds). */
export async function finishInviteSignup(
  clerkToken: string,
  data: { code: string; firstName: string; lastName?: string; age: number },
): Promise<{ patientId: string; patientFirstName: string }> {
  return request("/api/invite/finish", {
    method: "POST",
    headers: { Authorization: `Bearer ${clerkToken}` },
    body: JSON.stringify(data),
  });
}

/** Returning-patient sign-in — same Google identity as finishInviteSignup, but for someone who
 * already has an account (logged out, reinstalled, new device — see app/(auth)/signin.tsx).
 * No invite code: looks the Clerk identity up against an existing account instead of redeeming
 * one. Throws (via request()'s !res.ok path) with a 404 if this Google sign-in has never
 * completed a signup — the caller should fall back to the invite-code flow in that case. */
export async function signInReturningPatient(
  clerkToken: string,
): Promise<{ patientId: string; patientFirstName: string }> {
  return request("/api/invite/signin", {
    method: "POST",
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
}

// --- Patient / dashboard -----------------------------------------------------------------

export async function getPatient(patientId: string): Promise<Patient> {
  return request(`/api/patients/${patientId}`);
}

export async function getDashboard(patientId: string): Promise<{ gauges: DashboardGauge[] }> {
  return request(`/api/patients/${patientId}/dashboard`);
}

export async function updatePreferences(
  patientId: string,
  prefs: { restrictions?: string[]; dislikes?: string[]; weeklyBudgetUsd?: number; weeklyNudgeEnabled?: boolean },
): Promise<Patient> {
  return request(`/api/patients/${patientId}/preferences`, { method: "PATCH", body: JSON.stringify(prefs) });
}

// --- Consumption / quick log ---------------------------------------------------------------

export async function getRecentConsumption(patientId: string, days = 14): Promise<{ events: ConsumptionEntry[] }> {
  return request(`/api/patients/${patientId}/consumption?days=${days}`);
}

export async function logConsumption(
  patientId: string,
  body: { source: "photo" | "text"; text?: string; imageBase64?: string; mediaType?: string },
): Promise<ConsumptionEntry> {
  return request(`/api/patients/${patientId}/consumption`, { method: "POST", body: JSON.stringify(body) });
}

// --- Receipts --------------------------------------------------------------------------

export async function getReceipts(patientId: string): Promise<{ receipts: ReceiptSummary[] }> {
  return request(`/api/patients/${patientId}/receipts`);
}

export async function getReceiptDetail(patientId: string, receiptId: string): Promise<ReceiptDetail> {
  return request(`/api/patients/${patientId}/receipts/${receiptId}`);
}

export async function uploadReceipt(patientId: string, imageBase64: string, mediaType: string): Promise<ReceiptDetail> {
  return request(`/api/patients/${patientId}/receipts`, { method: "POST", body: JSON.stringify({ imageBase64, mediaType }) });
}

export async function confirmReceiptLineItem(
  patientId: string, receiptId: string, lineItemId: string, confirmed: boolean,
): Promise<ReceiptLineItemEntry> {
  return request(`/api/patients/${patientId}/receipts/${receiptId}/line-items/${lineItemId}`, {
    method: "PATCH", body: JSON.stringify({ confirmed }),
  });
}

export function receiptImageUrl(patientId: string, receiptId: string): string {
  return `${API_BASE_URL}/api/patients/${patientId}/receipts/${receiptId}/image`;
}

// --- Lab reports (Health Report Analyzer) -----------------------------------------------

export async function getLabReports(patientId: string): Promise<{ labReports: LabReportSummary[] }> {
  return request(`/api/patients/${patientId}/lab-reports`);
}

export async function getLabReportDetail(patientId: string, reportId: string): Promise<LabReportDetail> {
  return request(`/api/patients/${patientId}/lab-reports/${reportId}`);
}

export async function uploadLabReport(patientId: string, imageBase64: string, mediaType: string): Promise<LabReportDetail> {
  return request(`/api/patients/${patientId}/lab-reports`, { method: "POST", body: JSON.stringify({ imageBase64, mediaType }) });
}

export async function confirmLabFinding(
  patientId: string, reportId: string, findingId: string, confirmed: boolean,
): Promise<LabReportFindingEntry> {
  return request(`/api/patients/${patientId}/lab-reports/${reportId}/findings/${findingId}`, {
    method: "PATCH", body: JSON.stringify({ confirmed }),
  });
}

// --- Weight check-ins --------------------------------------------------------------------

export async function getWeightCheckIns(patientId: string, weeks = 8): Promise<{ checkIns: WeightCheckInEntry[] }> {
  return request(`/api/patients/${patientId}/weight-check-ins?weeks=${weeks}`);
}

export async function addWeightCheckIn(patientId: string, weightLb: number, note?: string): Promise<WeightCheckInEntry> {
  return request(`/api/patients/${patientId}/weight-check-ins`, { method: "POST", body: JSON.stringify({ weightLb, note }) });
}

// --- Cycle history -----------------------------------------------------------------------

export async function getCycleHistory(patientId: string): Promise<{ history: NutrientHistory[] }> {
  return request(`/api/patients/${patientId}/cycle-history`);
}

// --- Messages ----------------------------------------------------------------------------

export async function getMessages(patientId: string): Promise<{ messages: MessageEntry[] }> {
  return request(`/api/patients/${patientId}/messages`);
}

export async function sendMessage(patientId: string, body: string): Promise<MessageEntry> {
  return request(`/api/patients/${patientId}/messages`, {
    method: "POST", body: JSON.stringify({ body, senderRole: "patient" }),
  });
}

// --- Coach -------------------------------------------------------------------------------

export async function askCoach(
  patientId: string, message: string, history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string }> {
  return request(`/api/patients/${patientId}/coach`, { method: "POST", body: JSON.stringify({ message, history }) });
}

// --- Swap (ratified menu + choice) --------------------------------------------------------

export async function getFocusSet(patientId: string): Promise<FocusItem[]> {
  return request(`/api/patients/${patientId}/focus-set`);
}

export async function getApprovedList(patientId: string, nutrient: string): Promise<ApprovedList> {
  return request(`/api/patients/${patientId}/approved-lists/${nutrient}`);
}

export async function chooseFood(
  patientId: string, approvedListItemId: string, gapRemaining?: number,
): Promise<ChoiceResult> {
  return request(`/api/patients/${patientId}/choices`, {
    method: "POST", body: JSON.stringify({ approvedListItemId, gapRemaining }),
  });
}

export async function getShoppingList(patientId: string): Promise<{ items: ShoppingListItem[] }> {
  return request(`/api/patients/${patientId}/shopping-list`);
}
