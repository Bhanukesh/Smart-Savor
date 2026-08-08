import { View, ViewProps, StyleSheet } from "react-native";
import { colors, radius, shadow, spacing } from "../lib/theme";

export default function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
});
