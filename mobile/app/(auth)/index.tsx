import { useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO, useAuth, useClerk } from "@clerk/expo";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Note from "../../components/Note";
import BrandMark from "../../components/BrandMark";
import { colors, spacing } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";
import { signInReturningPatient } from "../../lib/api";

WebBrowser.maybeCompleteAuthSession();

// Clerk errors carry structured detail (a ClerkAPIResponseError's `.errors` array, each with a
// `code` and `longMessage`) that `.message` alone doesn't surface — this is what actually says
// *why* a sign-in failed (expired ticket, disallowed redirect, etc.) instead of just "it did."
function describeError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const list = (err as { errors?: unknown }).errors;
    if (Array.isArray(list) && list.length > 0) {
      const first = list[0] as { code?: string; longMessage?: string; message?: string };
      return [first.code, first.longMessage ?? first.message].filter(Boolean).join(": ") || "unknown error";
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

// Both first-time and returning patients land here. Returning patients used to have to tap
// "Sign in" and land on a second screen just to see the Google button — pure friction, since
// that screen had nothing else on it. The Google sign-in lives right here instead: new patients
// use the code field, returning patients use the button below it, no extra screen either way.
export default function InviteCodeScreen() {
  const [code, setCode] = useState("");
  const { startSSOFlow } = useSSO();
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { signIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  function submit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push({ pathname: "/(auth)/signup", params: { code: trimmed } });
  }

  async function signInWithGoogle() {
    setError(null);
    // Clerk's own docs (the <ClerkLoaded> component) exist specifically because its hooks
    // aren't safe to call until the client has finished its async init — startSSOFlow on a
    // cold launch, tapped before that finishes, fails before ever opening the Google screen.
    // This is the very first screen in the app, so that race is real in a way it wasn't back
    // when this button only existed on a later screen (reached after typing an invite code,
    // which gave Clerk time to load in the background).
    if (!authLoaded) {
      setError("Still getting ready — try again in a second.");
      return;
    }
    // Disabling the button has to happen before the first await, not after startSSOFlow
    // resolves — otherwise it stays tappable for the entire OAuth round-trip (opening the
    // browser, the user completing Google's screen, the redirect back), and a second tap
    // fires a second, conflicting SSO attempt on top of the first.
    setSigningIn(true);
    try {
      // Defensive, on top of SessionContext's signOut() also calling Clerk's own signOut():
      // this app's Clerk instance is single-session-mode, so starting a *new* SSO flow while
      // Clerk still considers any session active — however that happened — is exactly the
      // shape of bug a returning patient hits. Force a clean slate right before every attempt
      // here, not just on the way out at logout.
      if (isSignedIn) {
        await clerkSignOut().catch((err) => console.error("Pre-signin Clerk sign-out failed:", err));
      }
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "smartsavor", path: "continue" }),
      });
      if (!createdSessionId || !setActive) return;
      await setActive({ session: createdSessionId });
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error("Couldn't verify sign-in — try again.");
      const result = await signInReturningPatient(clerkToken);
      await signIn(result.patientId, result.patientFirstName);
      router.replace("/(tabs)");
    } catch (err) {
      // Full error, not just .message — Clerk errors carry structured detail
      // (err.errors[].longMessage/code) that .message alone won't surface, and this is the
      // only way to actually diagnose a failure that only reproduces on a real device.
      console.error("Returning-patient sign-in error:", JSON.stringify(err, null, 2));
      const message = err instanceof Error ? err.message : "";
      if (message.includes("No account found")) {
        setError("That Google account isn't linked to a Smart Savor account yet — use your invite code below instead.");
      } else {
        // Shown on-device on purpose (not just console.error) — there's no way to pull device
        // logs from a preview APK, so this is the only path to a real diagnosis if this still
        // fails. Safe to revert to a plain message once this is confirmed working.
        setError(`Couldn't sign you in — ${describeError(err)}`);
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <Screen>
      <View style={styles.brand}>
        <BrandMark size={56} />
        <Text style={styles.brandText}>Smart Savor</Text>
      </View>

      <Card>
        <Text style={styles.h1}>Already have an account?</Text>
        <Text style={styles.sub}>Sign in with the same Google account you signed up with.</Text>
        <Button label="Continue with Google" variant="primary" onPress={signInWithGoogle} disabled={signingIn} loading={signingIn} />
        {error && <Note variant="warning">{error}</Note>}
      </Card>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <Card>
        <Text style={styles.h1}>Enter your invite code</Text>
        <Text style={styles.sub}>Your dietitian gave you a one-time code after your visit.</Text>
        <TextField
          label="Invite code"
          placeholder="e.g. SAM-7XQK-2026"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <Button label="Continue" variant="secondary" onPress={submit} disabled={!code.trim()} />
      </Card>

      <Note>
        Private &amp; dietitian-backed — nothing reaches you without your dietitian&apos;s sign-off.
      </Note>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: 10, marginBottom: spacing.xl, marginTop: spacing.lg },
  brandText: { fontSize: 22, fontWeight: "800", color: colors.primaryDeep, letterSpacing: -0.3 },
  h1: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground },
});
