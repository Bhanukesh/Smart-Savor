/**
 * On-device session — the mobile equivalent of the web app's httpOnly cookie set by
 * lib/auth/session.ts in the Next.js app. There is no bearer token: POST /api/invite/redeem
 * never returns one, and the shared /api/patients/[id]/* routes still don't verify a session
 * against the patient :id in the URL (a documented, accepted gap — proxy.ts's
 * PATIENT_SAFE_PATTERNS lets these through without checking the caller *is* that patient).
 * The web app's own /me/* pages no longer have this problem — proxy.ts now requires a real
 * patient session to render them, and each page resolves the patient from that session
 * (lib/data.ts's getSessionPatient()), not a guess. This app's "auth" is still: redeem an
 * invite code, store the returned patientId, use it directly in API calls — real work,
 * deferred, not a new gap introduced here.
 *
 * expo-secure-store (iOS Keychain / Android Keystore) is used anyway, even though the backend
 * doesn't treat this as a real credential yet: whoever holds this patientId can read/write
 * that patient's data against the live API, since nothing else gates it. Worth protecting on
 * the client even though the server-side enforcement is future work.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./api";

const KEY = "smartsavor_patient";

export type StoredSession = { patientId: string; firstName: string };

// expo-secure-store's web implementation isn't functional in this SDK version (it has no
// Keychain/Keystore to back onto) — fall back to localStorage there. Native (iOS/Android)
// still gets the real Keychain/Keystore-backed store.
const isWeb = Platform.OS === "web";

async function storageGet(key: string): Promise<string | null> {
  return isWeb ? (typeof localStorage !== "undefined" ? localStorage.getItem(key) : null) : SecureStore.getItemAsync(key);
}
async function storageSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
async function storageDelete(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(patientId: string, firstName: string): Promise<void> {
  await storageSet(KEY, JSON.stringify({ patientId, firstName }));
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await storageGet(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await storageDelete(KEY);
  // Best-effort — this app never held the httpOnly cookie POST /api/invite/redeem sets, so
  // this is a harmless no-op server-side; kept only for parity with the web app's logout.
  fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" }).catch(() => {});
}
