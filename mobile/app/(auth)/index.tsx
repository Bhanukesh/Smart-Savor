import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Note from "../../components/Note";
import BrandMark from "../../components/BrandMark";
import { colors, spacing } from "../../lib/theme";

export default function InviteCodeScreen() {
  const [code, setCode] = useState("");

  function submit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push({ pathname: "/(auth)/signup", params: { code: trimmed } });
  }

  return (
    <Screen>
      <View style={styles.brand}>
        <BrandMark size={56} />
        <Text style={styles.brandText}>Smart Savor</Text>
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
          autoFocus
        />
        <Button label="Continue" variant="primary" onPress={submit} disabled={!code.trim()} />
      </Card>
      <Text style={styles.signInLink} onPress={() => router.push("/(auth)/signin")}>
        Already have an account? Sign in
      </Text>
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
  signInLink: {
    textAlign: "center", color: colors.primaryDeep, fontWeight: "700", fontSize: 14,
    marginTop: spacing.lg,
  },
});
