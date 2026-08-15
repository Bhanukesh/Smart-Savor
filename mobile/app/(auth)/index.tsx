import { useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO, useAuth } from "@clerk/expo";
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

// Both first-time and returning patients land here. Returning patients used to have to tap
// "Sign in" and land on a second screen just to see the Google button — pure friction, since
// that screen had nothing else on it. The Google sign-in lives right here instead: new patients
// use the code field, returning patients use the button below it, no extra screen either way.
export default function InviteCodeScreen() {
  const [code, setCode] = useState("");
  const { startSSOFlow } = useSSO();
  const { getToken } = useAuth();
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
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "smartsavor", path: "continue" }),
      });
      if (!createdSessionId || !setActive) return;
      await setActive({ session: createdSessionId });
      setSigningIn(true);
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
          ? "That Google account isn't linked to a Smart Savor account yet — use your invite code below instead."
          : "Couldn't sign you in — try again in a moment.",
      );
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
