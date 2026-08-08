import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Screen from "../../components/Screen";
import Card from "../../components/Card";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Chip from "../../components/Chip";
import Note from "../../components/Note";
import { colors, spacing } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";
import { getRecentConsumption, logConsumption } from "../../lib/api";
import type { ConsumptionEntry } from "../../lib/types";

export default function LogScreen() {
  const { session } = useSession();
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [busy, setBusy] = useState<null | "photo" | "text">(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { events } = await getRecentConsumption(session.patientId, 14);
    setEntries(events);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submitLog(body: { source: "photo" | "text"; text?: string; imageBase64?: string; mediaType?: string }) {
    if (!session) return;
    setBusy(body.source);
    setError(null);
    try {
      const created = await logConsumption(session.patientId, body);
      setEntries((prev) => [created, ...prev]);
      setTextDraft("");
    } catch {
      setError("Couldn't log that — try again.");
    } finally {
      setBusy(null);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed to log a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!result.canceled && result.assets[0]?.base64) {
      submitLog({ source: "photo", imageBase64: result.assets[0].base64, mediaType: "image/jpeg" });
    }
  }

  function submitText() {
    if (!textDraft.trim()) return;
    submitLog({ source: "text", text: textDraft.trim() });
  }

  return (
    <Screen onRefresh={load}>
      <Text style={styles.eyebrow}>Quick Log</Text>
      <Text style={styles.h1}>Log what you ate</Text>
      <Text style={styles.sub}>Optional — only when you want. No forms, no daily pressure.</Text>

      <Card>
        <View style={styles.row}>
          <Button label={busy === "photo" ? "Reading photo…" : "Take a photo"} variant="primary" onPress={takePhoto} disabled={busy !== null} />
        </View>
        <TextField
          placeholder="e.g. a cup of lentils with spinach"
          value={textDraft}
          onChangeText={setTextDraft}
          editable={busy === null}
        />
        <Button label="Log it" onPress={submitText} disabled={busy !== null || !textDraft.trim()} loading={busy === "text"} />
        {error && <Note variant="warning">{error}</Note>}
      </Card>

      <Text style={styles.sectionLabel}>RECENT</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>Nothing logged yet — log something whenever you eat.</Text>
      ) : (
        entries.map((e) => (
          <Card key={e.id} style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.entryTitleRow}>
                  <Text style={styles.entryTitle}>{e.foodName}</Text>
                  {e.flag === "needs_review" && <Chip label="Needs review" variant="amber" />}
                </View>
                <Text style={styles.entryMeta}>
                  {new Date(e.consumedDate).toLocaleDateString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · via {e.source}
                </Text>
              </View>
              <Chip label="Logged" variant="green" />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginTop: 4, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  row: { marginBottom: spacing.md },
  sectionLabel: { fontSize: 12.5, fontWeight: "700", color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.mutedForeground },
  entryCard: { paddingVertical: 12 },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  entryTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  entryMeta: { fontSize: 12, color: colors.mutedForeground },
});
