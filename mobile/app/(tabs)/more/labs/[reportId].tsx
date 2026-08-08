import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Screen from "../../../../components/Screen";
import Card from "../../../../components/Card";
import Button from "../../../../components/Button";
import Chip from "../../../../components/Chip";
import Note from "../../../../components/Note";
import { colors, spacing } from "../../../../lib/theme";
import { useSession } from "../../../../lib/SessionContext";
import { getLabReportDetail, confirmLabFinding } from "../../../../lib/api";
import type { LabReportDetail, LabReportFindingEntry } from "../../../../lib/types";

export default function LabReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { session } = useSession();
  const [report, setReport] = useState<LabReportDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getLabReportDetail(session.patientId, reportId).then(setReport);
  }, [session, reportId]);

  async function setConfirmed(finding: LabReportFindingEntry, confirmed: boolean) {
    if (!session || !report) return;
    setBusyId(finding.id);
    try {
      const updated = await confirmLabFinding(session.patientId, report.id, finding.id, confirmed);
      setReport((prev) => (prev ? { ...prev, findings: prev.findings.map((f) => (f.id === finding.id ? updated : f)) } : prev));
    } finally {
      setBusyId(null);
    }
  }

  if (!report) return <Screen><Text style={styles.empty}>Loading…</Text></Screen>;

  if (report.parseStatus === "failed") {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Couldn&apos;t read this one</Text>
          <Text style={styles.sub}>Try retaking the photo in better light, or skip it — your other reports are unaffected.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Lab report results</Text>
        {report.findings.length === 0 ? (
          <Text style={styles.sub}>Nothing on this report matched a nutrient we track.</Text>
        ) : (
          report.findings.map((f) => (
            <View key={f.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle}>{f.label}</Text>
                  {f.confirmed === true && <Chip label="Confirmed" variant="green" />}
                  {f.confirmed === false && <Chip label="Rejected" variant="red" />}
                </View>
                <Text style={styles.itemMeta}>{f.currentValue} {f.unit}</Text>
              </View>
              <View style={styles.itemButtons}>
                <Button label="Confirm" onPress={() => setConfirmed(f, true)} disabled={busyId === f.id} />
                <Button label="Reject" onPress={() => setConfirmed(f, false)} disabled={busyId === f.id} />
              </View>
            </View>
          ))
        )}
        <Note>
          Confirming a result adds it to your dietitian&apos;s focus set options — rejecting it
          (e.g. a misread value) leaves your plan unchanged.
        </Note>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
  sub: { fontSize: 13, color: colors.mutedForeground },
  empty: { fontSize: 13, color: colors.mutedForeground },
  itemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  itemMeta: { fontSize: 12, color: colors.mutedForeground },
  itemButtons: { flexDirection: "row", gap: spacing.sm },
});
