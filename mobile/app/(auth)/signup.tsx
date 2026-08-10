import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Note from "../../components/Note";
import { colors, spacing } from "../../lib/theme";
import { redeemInvite } from "../../lib/api";

// Mobile signup path (er-design.md §Part 1, Decisions 2-3): phone number + name, no email or
// age asked here — that's the web/Google-OAuth path's shape, not this one. Real SMS OTP delivery
// needs Auth0 wired in; verifyIdentity() is mocked and accepts whatever's submitted, so this
// collects the phone number honestly without pretending a code was actually texted.
export default function SignupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!phone.trim() || !firstName.trim() || !code) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await redeemInvite(code, {
        phone: phone.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
      router.push({
        pathname: "/(auth)/welcome",
        params: { patientId: result.patientId, firstName: result.patientFirstName },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't activate your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.h1}>Sign up with your number</Text>
        <Text style={styles.sub}>
          We&apos;ll text a one-time code to verify it&apos;s you — real SMS delivery isn&apos;t
          wired up yet, so this activates right away for now.
        </Text>
        <TextField
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoFocus
          placeholder="(555) 555-0100"
        />
        <TextField label="First name" value={firstName} onChangeText={setFirstName} />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} />
        {error && <Note variant="warning">{error}</Note>}
        <Button
          label={submitting ? "Activating…" : "Activate my account"}
          variant="primary"
          onPress={submit}
          disabled={submitting || !phone.trim() || !firstName.trim()}
          loading={submitting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
});
