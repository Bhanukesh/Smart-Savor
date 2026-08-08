import { View, Text, StyleSheet } from "react-native";
import { chipColors, radius } from "../lib/theme";

type ChipVariant = keyof typeof chipColors;

export default function Chip({ label, variant = "blue" }: { label: string; variant?: ChipVariant }) {
  const c = chipColors[variant];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  label: { fontSize: 12, fontWeight: "700" },
});
