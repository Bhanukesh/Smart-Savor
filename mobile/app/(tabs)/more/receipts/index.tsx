import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Screen from "../../../../components/Screen";
import Card from "../../../../components/Card";
import Button from "../../../../components/Button";
import Chip from "../../../../components/Chip";
import Note from "../../../../components/Note";
import { colors, spacing } from "../../../../lib/theme";
import { useSession } from "../../../../lib/SessionContext";
import { getReceipts, uploadReceipt } from "../../../../lib/api";
import type { ReceiptSummary } from "../../../../lib/types";

const STATUS_VARIANT: Record<string, "green" | "ghost" | "red" | "amber"> = {
  parsed: "green", pending: "ghost", failed: "red", needs_review: "amber",
};
const STATUS_LABEL: Record<string, string> = {
  parsed: "Read", pending: "Reading…", failed: "Couldn't read", needs_review: "Needs review",
};

export default function ReceiptsScreen() {
  const { session } = useSession();
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getReceipts(session.patientId)
      .then((r) => setReceipts(r.receipts))
      .catch(() => setError("Couldn't load your receipts — you can still upload a new one."));
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function upload() {
    if (!session) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed to upload a receipt.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (result.canceled || !result.assets[0]?.base64) return;
    setBusy(true);
    setError(null);
    try {
      const created = await uploadReceipt(session.patientId, result.assets[0].base64, "image/jpeg");
      setReceipts((prev) => [
        {
          id: created.id, uploadDate: created.uploadDate, retailer: created.retailer,
          parseStatus: created.parseStatus, itemCount: created.lineItems.length,
          pendingReviewCount: created.lineItems.filter((li) => li.confirmed === null).length,
        },
        ...prev,
      ]);
    } catch {
      setError("Couldn't upload that receipt — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onRefresh={load}>
      <Card>
        <Text style={styles.title}>Grocery receipts</Text>
        <Text style={styles.sub}>Last few months, if you have them — helps us see what you already buy.</Text>
        <Button label={busy ? "Reading receipt…" : "Upload a receipt"} variant="primary" onPress={upload} disabled={busy} loading={busy} />
        {error && <Note variant="warning">{error}</Note>}
      </Card>

      {receipts.length === 0 ? (
        <Text style={styles.empty}>No receipts uploaded yet.</Text>
      ) : (
        receipts.map((r) => {
          const clickable = r.parseStatus === "parsed" || r.parseStatus === "needs_review";
          return (
            <Pressable
              key={r.id}
              disabled={!clickable}
              onPress={() => router.push({ pathname: "/(tabs)/more/receipts/[receiptId]", params: { receiptId: r.id } })}
            >
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.rowTitle}>{r.retailer ?? "Receipt"}</Text>
                    <Chip label={STATUS_LABEL[r.parseStatus] ?? r.parseStatus} variant={STATUS_VARIANT[r.parseStatus] ?? "ghost"} />
                    {r.pendingReviewCount > 0 && <Chip label={`${r.pendingReviewCount} to review`} variant="amber" />}
                  </View>
                  <Text style={styles.meta}>
                    {new Date(r.uploadDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {r.itemCount} item{r.itemCount === 1 ? "" : "s"}
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  meta: { fontSize: 12, color: colors.mutedForeground },
});
