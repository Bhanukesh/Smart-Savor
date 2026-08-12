import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Note from "../../components/Note";
import { colors, spacing } from "../../lib/theme";
import { finishInviteSignup } from "../../lib/api";

// Lands here straight from signup.tsx's Google sign-in — a real Clerk session already exists
// by this point (same shape as web's app/invite/claim). Just confirms name (pre-filled from
// Google when available) and age — Google never provides birthdate, so age is always asked,
// and it always overrides whatever the dietitian estimated at "Add patient" time.
export default function DetailsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [age, setAge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const ageNum = Number(age);
    if (!firstName.trim() || !Number.isFinite(ageNum) || ageNum <= 0 || !code) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in expired — try again.");
      const result = await finishInviteSignup(token, {
        code,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        age: ageNum,
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
        {(user?.firstName || user?.lastName) && (
          <Note>Pulled from your Google account — change anything that&apos;s not right.</Note>
        )}
        <TextField label="First name" value={firstName} onChangeText={setFirstName} autoFocus={!firstName} />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} />
        <TextField label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
        {error && <Note variant="warning">{error}</Note>}
        <Button
          label={submitting ? "Activating…" : "Activate my account"}
          variant="primary"
          onPress={submit}
          disabled={submitting || !firstName.trim() || !age}
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
