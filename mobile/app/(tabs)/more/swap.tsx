import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Screen from "../../../components/Screen";
import Card from "../../../components/Card";
import { colors, radius, spacing } from "../../../lib/theme";
import { useSession } from "../../../lib/SessionContext";
import { getFocusSet, getApprovedList, chooseFood } from "../../../lib/api";
import type { FocusItem, ApprovedList, ChoiceResult } from "../../../lib/types";

export default function SwapScreen() {
  const { session } = useSession();
  const [sections, setSections] = useState<{ gap: FocusItem["gap"]; list: ApprovedList }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const focus = await getFocusSet(session.patientId);
      const active = focus.filter((f) => !f.excluded);
      const withLists = await Promise.all(
        active.map(async (f) => ({ gap: f.gap, list: await getApprovedList(session.patientId, f.gap.nutrient) })),
      );
      setSections(withLists);
      setLoading(false);
    })();
  }, [session]);

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.h1}>What&apos;s on your plate?</Text>
      <Text style={styles.sub}>{sections.length} focus area{sections.length === 1 ? "" : "s"} — pick a food and we&apos;ll recompute the amount for you.</Text>
      {sections.map((s) => (
        <GapSection key={s.gap.id} patientId={session!.patientId} gap={s.gap} list={s.list} />
      ))}
    </Screen>
  );
}

function GapSection({ patientId, gap, list }: { patientId: string; gap: FocusItem["gap"]; list: ApprovedList }) {
  const items = list.items.filter((i) => i.status !== "excluded");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ChoiceResult | null>(null);
  const [picking, setPicking] = useState(false);

  async function pick(itemId: string) {
    setSelectedId(itemId);
    setPicking(true);
    try {
      const r = await chooseFood(patientId, itemId, gap.targetValue - gap.currentValue);
      setResult(r);
    } finally {
      setPicking(false);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <Text style={styles.cardTitle}>{gap.label}</Text>
        <Text style={styles.emptyText}>No approved foods yet — check back once your dietitian ratifies this menu.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>Pick your {gap.label} food</Text>
      {items.map((it) => {
        const active = it.id === selectedId;
        return (
          <Pressable key={it.id} onPress={() => pick(it.id)} style={[styles.food, active && styles.foodActive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{it.foodName}{it.prep ? ` (${it.prep})` : ""}</Text>
              <Text style={styles.foodMeta}>{it.servingDescription} · ~{it.amountPerServing} {it.unit} {gap.label.toLowerCase()}</Text>
            </View>
            {active && (picking ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.check}>✓</Text>)}
          </Pressable>
        );
      })}
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultBig}>{result.servingsText}</Text>
          <Text style={styles.resultCaption}>Closes {result.gapClosedPct}% of your remaining {gap.label.toLowerCase()} gap.</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.mutedForeground },
  food: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.input, padding: 12, marginBottom: 8, gap: 8,
  },
  foodActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  foodName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  foodMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  check: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  resultBox: { marginTop: 8, padding: 12, backgroundColor: colors.primaryTint, borderRadius: radius.input },
  resultBig: { fontSize: 15, fontWeight: "800", color: colors.primaryStrong },
  resultCaption: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
});
