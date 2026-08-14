import { Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";

// Mirrors the web app's .brand .mark exactly (app/globals.css): 135deg gradient tile,
// accent -> primary-strong, white glyph, soft blue glow. The glyph itself is
// assets/leaf-mark.png (a trimmed crop of the app icon's foreground layer) rather than an
// icon-font glyph — @expo/vector-icons has no Phosphor set, and Ionicons' "leaf" is a visibly
// different shape from the web app's Phosphor ph-fill ph-leaf, which is why this mark used to
// look like a different logo depending on platform.
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
      <Image
        source={require("../assets/leaf-mark.png")}
        style={{ width: size * 0.53, height: size * 0.53, tintColor: colors.primaryForeground }}
        resizeMode="contain"
      />
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
