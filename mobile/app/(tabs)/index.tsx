import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import Gauge from "../../components/Gauge";
import Note from "../../components/Note";
import ErrorState from "../../components/ErrorState";
import { colors, spacing } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";
import { getDashboard, getPatient, getWeightCheckIns } from "../../lib/api";
import type { DashboardGauge, Patient, WeightCheckInEntry } from "../../lib/types";

export default function DashboardScreen() {
  const { session } = useSession();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [gauges, setGauges] = useState<DashboardGauge[]>([]);
  const [checkIns, setCheckIns] = useState<WeightCheckInEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(false);
    try {
      const [p, d, w] = await Promise.all([
        getPatient(session.patientId),
        getDashboard(session.patientId),
        getWeightCheckIns(session.patientId, 4),
      ]);
      setPatient(p);
      setGauges(d.gauges);
      setCheckIns(w.checkIns);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !patient) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error && !patient) {
    return (
      <Screen>
        <ErrorState onRetry={load} />
      </Screen>
    );
  }

  const inRangeCount = gauges.filter((g) => g.inRange).length;

  return (
    <Screen onRefresh={load} refreshing={loading}>
      <Text style={styles.eyebrow}>Your week</Text>
      <Text style={styles.h1}>You&apos;re trending up{patient ? `, ${patient.name.split(" ")[0]}` : ""}</Text>
      {patient && (
        <Text style={styles.sub}>
          {gauges.length} target{gauges.length === 1 ? "" : "s"} from {patient.dietitianName.split(",")[0]}&apos;s focus
          set.{" "}
          {inRangeCount === 0
            ? "Still moving toward range on all of them."
            : inRangeCount === gauges.length
              ? "All of them are already in range."
              : `${inRangeCount} already in range — the rest are moving the right way.`}
        </Text>
      )}

      <Card>
        <Text style={styles.cardTitle}>Intake toward target</Text>
        {gauges.length === 0 ? (
          <Text style={styles.emptyText}>Nothing ratified for your focus set yet.</Text>
        ) : (
          gauges.map((g) => <Gauge key={g.label} gauge={g} />)
        )}
      </Card>

      {checkIns.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Weight check-ins</Text>
          <Text style={styles.cardSubtitle}>Last 4 weeks</Text>
          <WeightBars checkIns={checkIns} />
          <Text style={styles.caption}>
            {checkIns[0].weightLb} lb → {checkIns[checkIns.length - 1].weightLb} lb, logged {checkIns.length} time
            {checkIns.length === 1 ? "" : "s"} in the last 4 weeks.
          </Text>
        </Card>
      )}

      <Note>
        Intake toward target, from logged foods — not a blood level. Your next panel with your
        care team is what confirms the real change.
      </Note>
    </Screen>
  );
}

function WeightBars({ checkIns }: { checkIns: WeightCheckInEntry[] }) {
  const max = Math.max(...checkIns.map((c) => c.weightLb));
  const min = Math.min(...checkIns.map((c) => c.weightLb));
  const span = Math.max(1, max - min);
  return (
    <View style={styles.bars}>
      {checkIns.map((c, i) => {
        const pct = 30 + ((c.weightLb - min) / span) * 70;
        const isLast = i === checkIns.length - 1;
        return (
          <View
            key={c.id}
            style={[
              styles.bar,
              { height: `${pct}%`, backgroundColor: isLast ? colors.primary : colors.muted },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 12, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginTop: 4, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg, lineHeight: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  cardSubtitle: { fontSize: 12, color: colors.mutedForeground, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.mutedForeground, marginTop: 8 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 64, marginVertical: 10 },
  bar: { flex: 1, borderRadius: 4 },
  caption: { fontSize: 11.5, color: colors.mutedForeground, marginTop: 4 },
});
