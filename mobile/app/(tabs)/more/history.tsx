import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../../components/Screen";
import Card from "../../../components/Card";
import Chip from "../../../components/Chip";
import { colors } from "../../../lib/theme";
import { useSession } from "../../../lib/SessionContext";
import { getCycleHistory } from "../../../lib/api";
import type { NutrientHistory } from "../../../lib/types";

const STATUS_VARIANT: Record<string, "blue" | "green" | "amber" | "ghost"> = {
  in_progress: "blue", closed: "green", carried_forward: "amber", deferred: "ghost",
};
const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress", closed: "Closed", carried_forward: "Carried forward", deferred: "Deferred",
};

export default function HistoryScreen() {
  const { session } = useSession();
  const [history, setHistory] = useState<NutrientHistory[]>([]);

  useEffect(() => {
    if (!session) return;
    getCycleHistory(session.patientId).then((r) => setHistory(r.history));
  }, [session]);

  if (history.length === 0) {
    return (
      <Screen>
        <Card>
          <Text style={styles.empty}>No cycle history yet — this fills in once your first 3-month cycle wraps up.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {history.map((h) => (
        <Card key={h.nutrient}>
          <Text style={styles.title}>{h.label}</Text>
          <Text style={styles.sub}>Target: {h.targetValue} {h.unit}/day</Text>
          {h.cycles.map((c, i) => (
            <View key={c.cycleId} style={styles.row}>
              <View style={styles.rank}><Text style={styles.rankText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cycleLabel}>{c.cycleSlug ? c.cycleSlug.split("-").pop()?.toUpperCase() : `Cycle ${i + 1}`}</Text>
                  <Chip label={STATUS_LABEL[c.outcomeStatus] ?? c.outcomeStatus} variant={STATUS_VARIANT[c.outcomeStatus] ?? "ghost"} />
                  {c.improved !== undefined && <Chip label={c.improved ? "Improved" : "No change"} variant={c.improved ? "green" : "amber"} />}
                </View>
                <Text style={styles.meta}>
                  {c.retestValue !== undefined
                    ? `Baseline ${c.baselineValue} ${h.unit} → retest ${c.retestValue} ${h.unit}${c.delta !== undefined ? ` (${c.delta >= 0 ? "+" : ""}${c.delta} ${h.unit})` : ""}`
                    : `Baseline ${c.baselineValue} ${h.unit} → retest not taken yet`}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: colors.mutedForeground },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 12, color: colors.mutedForeground, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  cycleLabel: { fontSize: 13.5, fontWeight: "700", color: colors.foreground },
  meta: { fontSize: 12, color: colors.mutedForeground },
});
