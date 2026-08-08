import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import Screen from "../../../../components/Screen";
import Card from "../../../../components/Card";
import Button from "../../../../components/Button";
import Chip from "../../../../components/Chip";
import Note from "../../../../components/Note";
import { colors, spacing } from "../../../../lib/theme";
import { useSession } from "../../../../lib/SessionContext";
import { getLabReports, uploadLabReport } from "../../../../lib/api";
import type { LabReportSummary } from "../../../../lib/types";

const STATUS_VARIANT: Record<string, "green" | "ghost" | "red"> = { parsed: "green", pending: "ghost", failed: "red" };
const STATUS_LABEL: Record<string, string> = { parsed: "Read", pending: "Reading…", failed: "Couldn't read" };

export default function LabsScreen() {
  const { session } = useSession();
  const [reports, setReports] = useState<LabReportSummary[]>([]);
  const [busy, setBusy] = useState<null | "camera" | "library" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getLabReports(session.patientId).then((r) => setReports(r.labReports));
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit(source: "camera" | "library" | "pdf", imageBase64: string, mediaType: string) {
    if (!session) return;
    setBusy(source);
    setError(null);
    try {
      const created = await uploadLabReport(session.patientId, imageBase64, mediaType);
      setReports((prev) => [
        {
          id: created.id, uploadDate: created.uploadDate, parseStatus: created.parseStatus,
          findingCount: created.findings.length,
          pendingReviewCount: created.findings.filter((f) => f.confirmed === null).length,
        },
        ...prev,
      ]);
    } catch {
      setError("Couldn't upload that report — try again.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed to upload a lab report.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (result.canceled || !result.assets[0]?.base64) return;
    submit("camera", result.assets[0].base64, "image/jpeg");
  }

  async function uploadFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is needed to upload a lab report.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ["images"] });
    if (result.canceled || !result.assets[0]?.base64) return;
    submit("library", result.assets[0].base64, result.assets[0].mimeType || "image/jpeg");
  }

  async function uploadFromDocument() {
    // base64: true is required on web (defaults to false there); native ignores the option
    // and always returns a file:// uri instead, read separately via expo-file-system below.
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", base64: true });
    if (result.canceled || !result.assets[0]) return;
    setBusy("pdf");
    setError(null);
    try {
      const asset = result.assets[0];
      // On web, asset.base64 is a data: URL ("data:application/pdf;base64,...") — strip the
      // prefix down to raw base64, matching what the API expects.
      const base64 = asset.base64 ? asset.base64.split(",")[1] ?? "" : await new File(asset.uri).base64();
      await submit("pdf", base64, "application/pdf");
    } catch {
      setError("Couldn't read that PDF — try again.");
      setBusy(null);
    }
  }

  return (
    <Screen onRefresh={load}>
      <Card>
        <Text style={styles.title}>Lab reports</Text>
        <Text style={styles.sub}>A photo or PDF of your bloodwork is enough — we&apos;ll pull out anything relevant.</Text>
        <View style={styles.buttonRow}>
          <Button label={busy === "camera" ? "Reading…" : "Take a photo"} variant="primary" onPress={uploadFromCamera} disabled={busy !== null} loading={busy === "camera"} />
        </View>
        <View style={styles.buttonRow}>
          <Button label={busy === "library" ? "Reading…" : "Choose from library"} onPress={uploadFromLibrary} disabled={busy !== null} loading={busy === "library"} />
        </View>
        <View style={styles.buttonRow}>
          <Button label={busy === "pdf" ? "Reading…" : "Choose a PDF"} onPress={uploadFromDocument} disabled={busy !== null} loading={busy === "pdf"} />
        </View>
        {error && <Note variant="warning">{error}</Note>}
      </Card>

      {reports.length === 0 ? (
        <Text style={styles.empty}>No lab reports uploaded yet.</Text>
      ) : (
        reports.map((r) => {
          const clickable = r.parseStatus === "parsed";
          return (
            <Pressable
              key={r.id}
              disabled={!clickable}
              onPress={() => router.push({ pathname: "/(tabs)/more/labs/[reportId]", params: { reportId: r.id } })}
            >
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.rowTitle}>Lab report</Text>
                    <Chip label={STATUS_LABEL[r.parseStatus] ?? r.parseStatus} variant={STATUS_VARIANT[r.parseStatus] ?? "ghost"} />
                    {r.pendingReviewCount > 0 && <Chip label={`${r.pendingReviewCount} to review`} variant="amber" />}
                  </View>
                  <Text style={styles.meta}>
                    {new Date(r.uploadDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {r.findingCount} result{r.findingCount === 1 ? "" : "s"}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, marginVertical: spacing.sm },
  empty: { fontSize: 13, color: colors.mutedForeground },
  row: { paddingVertical: 14 },
  buttonRow: { marginBottom: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  meta: { fontSize: 12, color: colors.mutedForeground },
});
