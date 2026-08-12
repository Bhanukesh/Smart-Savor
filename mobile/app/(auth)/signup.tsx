import { useEffect } from "react";
import { Platform, Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO } from "@clerk/expo";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Note from "../../components/Note";
import { colors, spacing } from "../../lib/theme";

WebBrowser.maybeCompleteAuthSession();

// Same identity step as web's app/invite/signup: real Google sign-in through the patient
// Clerk app (a separate, unrestricted app from the dietitian one — see the web app's
// CLAUDE.md), not the old mocked {phone, firstName, lastName} path. That path accepted
// whatever was typed in with no verification at all; this is the real thing, same as desktop.
export default function SignupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { startSSOFlow } = useSSO();

  useEffect(() => {
    if (Platform.OS !== "android") return;
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  async function signInWithGoogle() {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "smartsavor", path: "continue" }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.push({ pathname: "/(auth)/details", params: { code } });
      }
    } catch (err) {
      console.error("Google sign-in error:", JSON.stringify(err, null, 2));
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.h1}>Sign up with Google</Text>
        <Text style={styles.sub}>
          Same sign-in as the web app — your invite code already confirmed who you are, this
          just verifies it&apos;s really you.
        </Text>
        <Button label="Continue with Google" variant="primary" onPress={signInWithGoogle} />
        <Note>You&apos;ll confirm your name and age on the next screen.</Note>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
});
