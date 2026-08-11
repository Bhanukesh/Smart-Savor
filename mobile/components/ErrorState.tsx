import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import { colors, spacing } from "../lib/theme";

// Shared "couldn't load" state for any screen whose data fetch can fail (server down, no
// network) — every screen used to just leave the loading spinner running forever or show a
// blank list with no explanation. One component, one message, one retry action.
export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedForeground} />
      <Text style={styles.title}>Couldn&apos;t load this</Text>
      <Text style={styles.sub}>Check your connection and try again.</Text>
      <Button label="Try again" variant="primary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10, paddingVertical: spacing.xxl },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 13.5, color: colors.mutedForeground, textAlign: "center", marginBottom: 6 },
});
