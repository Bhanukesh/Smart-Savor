import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../../components/Screen";
import Card from "../../../components/Card";
import ErrorState from "../../../components/ErrorState";
import { colors } from "../../../lib/theme";
import { useSession } from "../../../lib/SessionContext";
import { getShoppingList } from "../../../lib/api";
import type { ShoppingListItem } from "../../../lib/types";

// Mirrors the web app's /me/shopping-list: whichever food is currently picked on Swap for each
// focus area — a standing reference to shop from, not a history. Re-picking a food for the
// same gap replaces its entry here immediately (lib/data.ts's createChoice supersedes the old
// pick), so this always reflects the current selection, nothing stale.
export default function ShoppingListScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setError(false);
    getShoppingList(session.patientId)
      .then((r) => { setItems(r.items); setLoaded(true); })
      .catch(() => setError(true));
  }, [session]);

  useEffect(() => { load(); }, [load]);

  if (error && !loaded) {
    return (
      <Screen>
        <ErrorState onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={load} refreshing={!loaded && !error}>
      <Text style={styles.h1}>What to buy this trip</Text>
      <Text style={styles.sub}>
        Whatever you&apos;ve currently picked on the Swap screen for each focus area — pick
        something else there and this list updates.
      </Text>
      <Card>
        {items.length === 0 ? (
          <Text style={styles.empty}>
            Nothing picked yet — head to Swap and choose a food for each focus area.
          </Text>
        ) : (
          items.map((it) => (
            <View key={it.nutrientGapId} style={styles.row}>
              <Text style={styles.foodName}>{it.foodName}</Text>
              <Text style={styles.meta}>
                {it.servingsText} · for your {it.nutrientLabel} · picked{" "}
                {new Date(it.chosenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: 16, lineHeight: 20 },
  empty: { fontSize: 13, color: colors.mutedForeground },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  foodName: { fontSize: 14.5, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
  meta: { fontSize: 12, color: colors.mutedForeground },
});
