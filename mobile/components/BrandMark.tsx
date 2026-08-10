import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

// Mirrors the web app's .brand .mark exactly (app/globals.css): 135deg gradient tile,
// accent -> primary-strong, white glyph, soft blue glow. Same brand mark, same math, ported
// to React Native's LinearGradient since CSS gradients don't exist here.
export default function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[colors.accent, colors.primaryStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3125, // 10/32
          shadowRadius: size * 0.19,
          shadowOffset: { width: 0, height: size * 0.06 },
        },
      ]}
    >
      <Ionicons name="leaf" size={size * 0.53} color={colors.primaryForeground} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.35,
    elevation: 4,
  },
});
