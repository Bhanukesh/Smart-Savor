import { useEffect, useState } from "react";
import { Platform, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO, useAuth } from "@clerk/expo";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Note from "../../components/Note";
import { colors, spacing } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";
import { signInReturningPatient } from "../../lib/api";

WebBrowser.maybeCompleteAuthSession();

// Returning-patient sign-in — the other half of app/(auth)/signup.tsx. A patient's invite code
// is single-use (redeemed the first time they sign up), so logging out here previously left no
// way back in at all: the only screen with no session was this stack's index.tsx, an invite-code
// form, and a redeemed code is permanently rejected. Same Google identity, no code: looks it up
// against an existing account (lib/invite.ts's signInReturningPatient on the server) instead of
// redeeming one.
export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const { getToken } = useAuth();
  const { signIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  async function signInWithGoogle() {
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "smartsavor", path: "continue" }),
      });
      if (!createdSessionId || !setActive) return;
      await setActive({ session: createdSessionId });
      setWorking(true);
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error("Couldn't verify sign-in — try again.");
      const result = await signInReturningPatient(clerkToken);
      await signIn(result.patientId, result.patientFirstName);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Returning-patient sign-in error:", err);
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("No account found")
          ? "That Google account isn't linked to a Smart Savor account yet — if this is your first time, use the invite code your dietitian gave you."
          : "Couldn't sign you in — try again in a moment.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.h1}>Sign in</Text>
        <Text style={styles.sub}>Use the same Google account you signed up with.</Text>
        <Button label="Continue with Google" variant="primary" onPress={signInWithGoogle} disabled={working} />
        {error && <Note>{error}</Note>}
        <Note>First time? Go back and enter your invite code instead.</Note>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
});
