import { Stack } from "expo-router";
import { colors } from "../../../lib/theme";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "More" }} />
      <Stack.Screen name="messages" options={{ title: "Messages" }} />
      <Stack.Screen name="swap" options={{ title: "Swap" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="receipts/index" options={{ title: "Receipts" }} />
      <Stack.Screen name="receipts/[receiptId]" options={{ title: "Review Receipt" }} />
      <Stack.Screen name="labs/index" options={{ title: "Lab Reports" }} />
      <Stack.Screen name="labs/[reportId]" options={{ title: "Review Report" }} />
    </Stack>
  );
}
