import { Text, View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { colors, spacing } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";

export default function WelcomeScreen() {
  const { patientId, firstName } = useLocalSearchParams<{ patientId: string; firstName: string }>();
  const { signIn } = useSession();

  async function continueToApp() {
    await signIn(patientId, firstName);
    router.replace("/(tabs)");
  }

  return (
    <Screen>
      <Card>
        <View style={styles.center}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.h1}>You&apos;re in{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={styles.sub}>Your account is active — here&apos;s your plan.</Text>
          <Button label="Continue to your plan" variant="primary" onPress={continueToApp} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: spacing.lg },
  check: {
    fontSize: 40, color: colors.success, fontWeight: "900", marginBottom: 8,
  },
  h1: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg, textAlign: "center" },
});
