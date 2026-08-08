import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../components/Screen";
import Chip from "../../../components/Chip";
import { colors, radius, shadow, spacing } from "../../../lib/theme";
import { useSession } from "../../../lib/SessionContext";
import { getMessages } from "../../../lib/api";

const ITEMS = [
  { href: "/(tabs)/more/messages", label: "Messages", icon: "mail" as const },
  { href: "/(tabs)/more/receipts", label: "Receipts", icon: "receipt" as const },
  { href: "/(tabs)/more/labs", label: "Lab Reports", icon: "flask" as const },
  { href: "/(tabs)/more/swap", label: "Swap", icon: "star" as const },
  { href: "/(tabs)/more/history", label: "History", icon: "time" as const },
  { href: "/(tabs)/more/profile", label: "Profile", icon: "person-circle" as const },
];

export default function MoreHubScreen() {
  const { session } = useSession();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getMessages(session.patientId).then(({ messages }) => {
        setUnread(messages.filter((m) => m.senderRole === "dietitian" && !m.readAt).length);
      });
    }, [session]),
  );

  return (
    <Screen>
      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <Pressable key={item.href} style={styles.tile} onPress={() => router.push(item.href as never)}>
            <Ionicons name={item.icon} size={26} color={colors.primary} />
            <Text style={styles.label}>{item.label}</Text>
            {item.label === "Messages" && unread > 0 && (
              <View style={styles.badge}>
                <Chip label={String(unread)} variant="blue" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "47%", backgroundColor: colors.card, borderRadius: radius.card,
    padding: spacing.lg, alignItems: "flex-start", gap: 10, ...shadow.card,
  },
  label: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  badge: { position: "absolute", top: 10, right: 10 },
});
