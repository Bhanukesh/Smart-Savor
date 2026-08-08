import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TextField from "../../../components/TextField";
import Button from "../../../components/Button";
import { colors, spacing, radius } from "../../../lib/theme";
import { useSession } from "../../../lib/SessionContext";
import { getMessages, sendMessage } from "../../../lib/api";
import type { MessageEntry } from "../../../lib/types";

export default function MessagesScreen() {
  const { session } = useSession();
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session) return;
    getMessages(session.patientId).then((r) => setMessages(r.messages));
  }, [session]);

  async function send() {
    const body = draft.trim();
    if (!body || sending || !session) return;
    setSending(true);
    try {
      const created = await sendMessage(session.patientId, body);
      setMessages((prev) => [...prev, created]);
      setDraft("");
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch {
      // leave draft in place so the patient can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listContent}>
          {messages.length === 0 ? (
            <Text style={styles.empty}>No messages yet — say hello.</Text>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.senderRole === "patient" ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={m.senderRole === "patient" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{m.body}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <TextField placeholder="Type a message…" value={draft} onChangeText={setDraft} editable={!sending} onSubmitEditing={send} />
          </View>
          <Button label="Send" variant="primary" onPress={send} disabled={sending || !draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, gap: 10, flexGrow: 1 },
  empty: { margin: "auto", color: colors.mutedForeground, fontSize: 13 },
  bubble: { maxWidth: "78%", borderRadius: radius.input, padding: 12 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleAssistant: { alignSelf: "flex-start", backgroundColor: colors.muted },
  bubbleTextUser: { color: colors.primaryForeground, fontSize: 14, lineHeight: 20 },
  bubbleTextAssistant: { color: colors.foreground, fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", padding: spacing.lg, paddingTop: spacing.sm },
});
