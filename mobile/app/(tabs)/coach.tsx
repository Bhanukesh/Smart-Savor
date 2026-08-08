import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { colors, spacing, radius } from "../../lib/theme";
import { useSession } from "../../lib/SessionContext";
import { askCoach, getPatient } from "../../lib/api";

type Message = { role: "user" | "assistant"; content: string };

export default function CoachScreen() {
  const { session } = useSession();
  const [firstName, setFirstName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session) return;
    getPatient(session.patientId).then((p) => {
      const name = p.name.split(" ")[0];
      setFirstName(name);
      setMessages([
        {
          role: "assistant",
          content: `Hi ${name} — I'm your food coach. Ask me about your focus areas this cycle, or tell me what you'd like to eat and I'll find it on your approved list.`,
        },
      ]);
    });
  }, [session]);

  async function send() {
    const text = draft.trim();
    if (!text || sending || !session) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setDraft("");
    setSending(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const { reply } = await askCoach(session.patientId, text, history);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't reach the coach just now — try again in a moment." }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <Text style={styles.header}>Talk to your food coach{firstName ? `, ${firstName}` : ""}</Text>
        <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listContent}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{m.content}</Text>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <TextField
              placeholder="Ask about a gap, or say what you'd like to eat…"
              value={draft}
              onChangeText={setDraft}
              editable={!sending}
              onSubmitEditing={send}
            />
          </View>
          <Button label="Send" variant="primary" onPress={send} disabled={sending || !draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 17, fontWeight: "800", color: colors.foreground, padding: spacing.lg, paddingBottom: spacing.sm },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, paddingTop: 0, gap: 10 },
  bubble: { maxWidth: "80%", borderRadius: radius.input, padding: 12 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleAssistant: { alignSelf: "flex-start", backgroundColor: colors.muted },
  bubbleTextUser: { color: colors.primaryForeground, fontSize: 14.5, lineHeight: 20 },
  bubbleTextAssistant: { color: colors.foreground, fontSize: 14.5, lineHeight: 20 },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", padding: spacing.lg, paddingTop: spacing.sm },
});
