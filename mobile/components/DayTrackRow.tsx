import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import type { DashboardGaugeDay } from "../lib/types";

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

/** Mirrors the web app's components/DayTrackRow.tsx: last-7-days on-track/off-track dots, one
 * per day, green if that day's running total (baseline + everything logged through that day)
 * had reached target, red if not. */
export default function DayTrackRow({ history }: { history: DashboardGaugeDay[] }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return (
    <View style={styles.row}>
      {history.map((day) => {
        const isToday = day.date === todayKey;
        const letter = DAY_LETTER[new Date(`${day.date}T00:00:00`).getDay()];
        return (
          <View key={day.date} style={styles.col}>
            <View
              style={[
                styles.dot,
                { backgroundColor: day.onTrack ? colors.success : colors.danger },
                isToday && styles.dotToday,
              ]}
            >
              <Ionicons name={day.onTrack ? "checkmark" : "close"} size={12} color={colors.primaryForeground} />
            </View>
            <Text style={[styles.letter, isToday && styles.letterToday]}>{letter}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginTop: 8 },
  col: { alignItems: "center", gap: 4 },
  dot: { width: 20, height: 20, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  dotToday: { borderWidth: 2, borderColor: colors.foreground },
  letter: { fontSize: 10.5, fontWeight: "500", color: colors.mutedForeground },
  letterToday: { fontWeight: "700" },
});
