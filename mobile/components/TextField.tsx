import { View, Text, TextInput, TextInputProps, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../lib/theme";

export default function TextField({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={styles.row}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.md },
  label: { fontSize: 12.5, fontWeight: "600", color: colors.mutedForeground, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: colors.foreground,
    backgroundColor: colors.card,
  },
});
