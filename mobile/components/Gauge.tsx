import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";
import DayTrackRow from "./DayTrackRow";
import type { DashboardGauge } from "../lib/types";

/** Mirrors the web app's .gauge/.track/.fill: a labeled progress bar with a target tick,
 * fill running current/target (capped at 100%), turning green once in range. */
export default function Gauge({ gauge }: { gauge: DashboardGauge }) {
  const pct = Math.min(100, Math.max(0, (gauge.current / gauge.target) * 100));
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{gauge.label}</Text>
        <Text style={styles.value}>
          {gauge.current} / {gauge.target} {gauge.unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: gauge.inRange ? colors.success : colors.primary },
          ]}
        />
        <View style={[styles.target, { left: "100%" }]} />
      </View>
      <Text style={styles.caption}>{gauge.caption}</Text>
      <DayTrackRow history={gauge.history} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 12 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  value: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  track: {
    height: 10, borderRadius: 999, backgroundColor: colors.muted,
    overflow: "hidden", position: "relative",
  },
  fill: { height: "100%", borderRadius: 999 },
  target: {
    position: "absolute", top: -2, bottom: -2, width: 2.5, marginLeft: -2.5,
    borderRadius: 2, backgroundColor: colors.primaryDeep,
  },
  caption: { fontSize: 11.5, color: colors.mutedForeground, marginTop: 7 },
});
