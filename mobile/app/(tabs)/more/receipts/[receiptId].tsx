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
import { getReceiptDetail, confirmReceiptLineItem } from "../../../../lib/api";
import type { ReceiptDetail, ReceiptLineItemEntry } from "../../../../lib/types";

export default function ReceiptDetailScreen() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const { session } = useSession();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getReceiptDetail(session.patientId, receiptId).then(setReceipt);
  }, [session, receiptId]);

  async function setConfirmed(item: ReceiptLineItemEntry, confirmed: boolean) {
    if (!session || !receipt) return;
    setBusyId(item.id);
    try {
      const updated = await confirmReceiptLineItem(session.patientId, receipt.id, item.id, confirmed);
      setReceipt((prev) => (prev ? { ...prev, lineItems: prev.lineItems.map((i) => (i.id === item.id ? updated : i)) } : prev));
    } finally {
      setBusyId(null);
    }
  }

  if (!receipt) return <Screen><Text style={styles.empty}>Loading…</Text></Screen>;

  if (receipt.parseStatus === "failed") {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Couldn&apos;t read this one</Text>
          <Text style={styles.sub}>Try retaking the photo in better light, or skip it — your other receipts are unaffected.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>{receipt.retailer ?? "Receipt"} items</Text>
        {receipt.lineItems.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle}>{item.matchedFood ?? item.rawText}</Text>
                {item.matchFlag === "needs_review" && <Chip label="Needs review" variant="amber" />}
              </View>
              <Text style={styles.itemMeta}>
                {item.rawText}{item.priceUsd !== undefined ? ` · $${item.priceUsd.toFixed(2)}` : ""}
              </Text>
            </View>
            <View style={styles.itemButtons}>
              <Button label="Mine" onPress={() => setConfirmed(item, true)} disabled={busyId === item.id} />
              <Button label="Not mine" onPress={() => setConfirmed(item, false)} disabled={busyId === item.id} />
            </View>
          </View>
        ))}
        <Note>Only items you confirm feed your habit model — exclude anything a family member bought that you don&apos;t eat.</Note>
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
