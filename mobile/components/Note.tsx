import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "../lib/theme";

type NoteVariant = "default" | "safe" | "warning";

const TONES: Record<NoteVariant, { bg: string; border: string; fg: string }> = {
  default: { bg: colors.primaryTint, border: colors.primary, fg: colors.primaryStrong },
  safe: { bg: colors.successTint, border: colors.success, fg: colors.success },
  warning: { bg: colors.warningTint, border: colors.warning, fg: colors.warning },
};

export default function Note({ children, variant = "default" }: { children: React.ReactNode; variant?: NoteVariant }) {
  const tone = TONES[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: tone.bg, borderLeftColor: tone.border }]}>
      <Text style={[styles.text, { color: colors.foreground }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderLeftWidth: 3, borderRadius: radius.input, padding: 12, marginVertical: 8,
  },
  text: { fontSize: 13, lineHeight: 19 },
});
