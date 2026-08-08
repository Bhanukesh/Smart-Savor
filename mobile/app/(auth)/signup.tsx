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

export default function SignupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!firstName.trim() || !code) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await redeemInvite(code, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
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
        <Text style={styles.h1}>A couple details</Text>
        <Text style={styles.sub}>
          This stands in for Google or phone sign-in until real Auth0 is wired in — for now,
          just tell us who you are.
        </Text>
        <TextField label="First name" value={firstName} onChangeText={setFirstName} autoFocus />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} />
        <TextField label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Mobile number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {error && <Note variant="warning">{error}</Note>}
        <Button
          label={submitting ? "Activating…" : "Activate my account"}
          variant="primary"
          onPress={submit}
          disabled={submitting || !firstName.trim()}
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
