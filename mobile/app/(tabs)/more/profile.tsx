import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { router } from "expo-router";
import Screen from "../../../components/Screen";
import Card from "../../../components/Card";
import TextField from "../../../components/TextField";
import Button from "../../../components/Button";
import Note from "../../../components/Note";
import ErrorState from "../../../components/ErrorState";
import { colors, spacing } from "../../../lib/theme";
import { useSession } from "../../../lib/SessionContext";
import { getPatient, updatePreferences, getWeightCheckIns, addWeightCheckIn } from "../../../lib/api";
import type { Patient, WeightCheckInEntry } from "../../../lib/types";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [restrictions, setRestrictions] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [budget, setBudget] = useState("");
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [checkIns, setCheckIns] = useState<WeightCheckInEntry[]>([]);
  const [weight, setWeight] = useState("");
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    Promise.all([getPatient(session.patientId), getWeightCheckIns(session.patientId, 8)])
      .then(([p, r]) => {
        setPatient(p);
        setRestrictions(p.restrictions.join(", "));
        setDislikes(p.dislikes.join(", "));
        setBudget(p.weeklyBudgetUsd?.toString() ?? "");
        setNudgeEnabled(p.weeklyNudgeEnabled);
        setCheckIns(r.checkIns);
      })
      .catch(() => setLoadError(true));
  }, [session]);

  useEffect(() => { load(); }, [load]);

  async function savePreferences() {
    if (!session) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updatePreferences(session.patientId, {
        restrictions: restrictions.split(",").map((s) => s.trim()).filter(Boolean),
        dislikes: dislikes.split(",").map((s) => s.trim()).filter(Boolean),
        ...(budget.trim() ? { weeklyBudgetUsd: Number(budget) } : {}),
        weeklyNudgeEnabled: nudgeEnabled,
      });
      setSaved(true);
    } catch {
      setSaveError("Couldn't save your changes — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function logWeight() {
    if (!session) return;
    const weightLb = Number(weight);
    if (!weightLb || weightLb <= 0) return;
    setLoggingWeight(true);
    setWeightError(null);
    try {
      const created = await addWeightCheckIn(session.patientId, weightLb);
      setCheckIns((prev) => [...prev, created]);
      setWeight("");
    } catch {
      setWeightError("Couldn't log that — try again.");
    } finally {
      setLoggingWeight(false);
    }
  }

  async function logOut() {
    await signOut();
    router.replace("/(auth)");
  }

  if (loadError && !patient) return <Screen><ErrorState onRetry={load} /></Screen>;
  if (!patient) return <Screen><Text style={styles.empty}>Loading…</Text></Screen>;

  const latest = checkIns[checkIns.length - 1];
  const previous = checkIns[checkIns.length - 2];
  const suddenChange = latest && previous && Math.abs(latest.weightLb - previous.weightLb) >= 3;

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>{patient.name}, {patient.age}</Text>
        <Text style={styles.sub}>Plan by {patient.dietitianName}</Text>
      </Card>

      <Card>
        <Text style={styles.title}>Your plan</Text>
        <TextField label="Dietary restrictions" placeholder="e.g. vegetarian" value={restrictions} onChangeText={setRestrictions} />
        <TextField label="Dislikes" placeholder="e.g. mushrooms" value={dislikes} onChangeText={setDislikes} />
        <TextField label="Weekly grocery budget (USD)" placeholder="Optional" value={budget} onChangeText={setBudget} keyboardType="numeric" />
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Weekly nudge notifications</Text>
            <Text style={styles.toggleCaption}>One gentle nudge a week, never daily.</Text>
          </View>
          <Switch value={nudgeEnabled} onValueChange={setNudgeEnabled} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.saveRow}>
          <Button label={saving ? "Saving…" : "Save changes"} variant="primary" onPress={savePreferences} disabled={saving} loading={saving} />
          {saved && <Text style={styles.savedText}>✓ Saved</Text>}
        </View>
        {saveError && <Note variant="warning">{saveError}</Note>}
      </Card>

      <Card>
        <Text style={styles.title}>Weight check-ins</Text>
        <Text style={styles.sub}>
          Optional, never a weight-loss target — clinical monitoring. A sudden jump can flag fluid retention, not diet.
        </Text>
        <View style={styles.weightRow}>
          <View style={{ flex: 1 }}>
            <TextField placeholder="lb" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" editable={!loggingWeight} />
          </View>
          <Button label="Log" variant="primary" onPress={logWeight} disabled={loggingWeight || !weight} />
        </View>
        {weightError && <Note variant="warning">{weightError}</Note>}
        {checkIns.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionLabel}>LAST {checkIns.length} {checkIns.length === 1 ? "ENTRY" : "ENTRIES"}</Text>
            {[...checkIns].reverse().map((c) => (
              <View key={c.id} style={styles.checkInRow}>
                <Text style={styles.checkInWeight}>{c.weightLb} lb</Text>
                <Text style={styles.checkInDate}>{new Date(c.checkedInAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
              </View>
            ))}
          </View>
        )}
        {suddenChange && (
          <Note variant="warning">
            That&apos;s a {Math.abs(latest.weightLb - previous.weightLb).toFixed(1)} lb change since your last entry — worth
            mentioning to your dietitian, often fluid, not food.
          </Note>
        )}
      </Card>

      <Button label="Log out" onPress={logOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: colors.mutedForeground },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2, marginBottom: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4, marginBottom: spacing.md },
  toggleLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  toggleCaption: { fontSize: 12, color: colors.mutedForeground },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  savedText: { color: colors.success, fontSize: 13, fontWeight: "700" },
  weightRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  sectionLabel: { fontSize: 12.5, fontWeight: "700", color: colors.mutedForeground, marginBottom: 4 },
  checkInRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  checkInWeight: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  checkInDate: { fontSize: 12, color: colors.mutedForeground },
});
