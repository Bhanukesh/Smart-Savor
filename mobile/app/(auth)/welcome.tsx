import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Note from "../../components/Note";
import { colors, spacing, radius } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";

export default function WelcomeScreen() {
  const { patientId, firstName } = useLocalSearchParams<{ patientId: string; firstName: string }>();
  const { signIn } = useSession();
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToApp() {
    setContinuing(true);
    setError(null);
    try {
      await signIn(patientId, firstName);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Couldn't get your plan ready — try again.");
      setContinuing(false);
    }
  }

  return (
    <Screen>
      <Card>
        <View style={styles.center}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={30} color={colors.primaryForeground} />
          </View>
          <Text style={styles.h1}>You&apos;re in{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={styles.sub}>Your account is active — here&apos;s your plan.</Text>
          <Button
            label="Continue to your plan" variant="primary" onPress={continueToApp}
            disabled={continuing} loading={continuing}
          />
          {error && <Note variant="warning">{error}</Note>}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: spacing.lg },
  checkBadge: {
    width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.success,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
    shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  h1: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg, textAlign: "center" },
});
