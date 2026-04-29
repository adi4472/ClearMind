import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { sendChatMessage } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { ChatInsight, ChatMessage, ToolType } from '../types/session';
import {
  ConversationPayload,
  deriveEntryTitle,
  getActiveTask,
  saveEntry,
  updateConversationMessages,
} from '../lib/entries';
import { theme } from '../constants/theme';

const TOOL_LABEL: Record<Exclude<ToolType, null>, string> = {
  focus_timer: 'Start focus timer',
  break_it_down: 'Break it down',
  mental_reset: 'Start mental reset',
};

const TOOL_ROUTE: Record<Exclude<ToolType, null>, '/focus' | '/breakdown' | '/reset'> = {
  focus_timer: '/focus',
  break_it_down: '/breakdown',
  mental_reset: '/reset',
};

export default function ChatScreen() {
  const messages = useSessionStore((state) => state.messages);
  const appendMessage = useSessionStore((state) => state.appendMessage);
  const updateMessage = useSessionStore((state) => state.updateMessage);
  const currentConversationId = useSessionStore((state) => state.currentConversationId);
  const setCurrentConversationId = useSessionStore((state) => state.setCurrentConversationId);
  const setCurrentInput = useSessionStore((state) => state.setCurrentInput);
  const setCurrentResult = useSessionStore((state) => state.setCurrentResult);
  const saveHistory = useUserStore((state) => state.preferences.saveHistory);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // We render newest-at-bottom with an inverted list, so the data needs reversing.
  const data = [...messages].reverse();

  // Auto-respond if the last message is from the user (e.g., we landed here from
  // the home screen with the first message already in the store).
  const autoSentRef = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') return;
    if (autoSentRef.current === last.id) return;
    autoSentRef.current = last.id;
    void respondTo(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const respondTo = useCallback(
    async (history: ChatMessage[]) => {
      try {
        setSending(true);
        const wire = history.map((m) => ({ role: m.role, text: m.text }));
        const response = await sendChatMessage({ messages: wire });

        const assistantMessage: ChatMessage = {
          id: Crypto.randomUUID(),
          role: 'assistant',
          text: response.reply,
          intent: response.intent,
          insight: response.insight,
          steps: response.steps,
        };
        appendMessage(assistantMessage);

        if (!saveHistory) return;

        const fullTranscript: ChatMessage[] = [...history, assistantMessage];
        try {
          if (currentConversationId) {
            await updateConversationMessages(currentConversationId, fullTranscript);
          } else {
            const firstUser = fullTranscript.find((m) => m.role === 'user');
            const title = firstUser?.text ?? 'Conversation';
            const payload: ConversationPayload = {
              messages: fullTranscript,
              title: deriveEntryTitle({ type: 'conversation', payload: { messages: fullTranscript, title } }),
            };
            const meta = await saveEntry('conversation', payload);
            setCurrentConversationId(meta.id);
          }
        } catch (err) {
          console.warn('persist conversation failed:', err instanceof Error ? err.message : err);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn('chat send failed:', message);
        Alert.alert('Could not send', message);
      } finally {
        setSending(false);
      }
    },
    [appendMessage, saveHistory, currentConversationId, setCurrentConversationId],
  );

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const userMessage: ChatMessage = {
      id: Crypto.randomUUID(),
      role: 'user',
      text,
    };
    appendMessage(userMessage);
    setDraft('');
    // Use the just-appended state. The auto-respond effect will fire,
    // but to avoid the race we kick off the request directly using a
    // freshly composed history.
    autoSentRef.current = userMessage.id;
    await respondTo([...messages, userMessage]);
  };

  const handleToolPress = (msg: ChatMessage, tool: Exclude<ToolType, null>) => {
    if (!msg.insight) return;
    if (tool === 'break_it_down') {
      // The /breakdown route handles the active-task gate itself, but we should
      // hydrate the session-level fields it reads.
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      setCurrentInput(lastUser?.text ?? '');
      setCurrentResult({
        summary: msg.insight.summary,
        pattern: msg.insight.pattern,
        next_step: msg.insight.next_step,
        tool: msg.insight.tool,
      });
    } else if (tool === 'focus_timer') {
      // focus.tsx reads currentResult?.next_step to seed its label.
      setCurrentResult({
        summary: msg.insight.summary,
        pattern: msg.insight.pattern,
        next_step: msg.insight.next_step,
        tool: msg.insight.tool,
      });
    }
    updateMessage(msg.id, { consumed: true });
    router.push(TOOL_ROUTE[tool]);
  };

  const handleAcceptBreakdown = async (msg: ChatMessage) => {
    if (!msg.steps) return;
    const active = await getActiveTask();
    if (active) {
      Alert.alert(
        'You already have an active task',
        'Finish your current task first, then come back.',
        [
          { text: 'Go to active task', onPress: () => router.push('/active-task') },
          { text: 'OK', style: 'cancel' },
        ],
      );
      return;
    }
    if (!saveHistory) {
      Alert.alert(
        'Save history is off',
        "Turn save history on in Settings so we can track your progress through these steps.",
      );
      return;
    }
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    try {
      await saveEntry('ai_breakdown', {
        source_text: lastUser?.text ?? '',
        steps: msg.steps,
        completedSteps: [],
      });
      updateMessage(msg.id, { consumed: true });
      router.replace('/active-task');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantRow}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{item.text}</Text>
        </View>

        {item.insight && !item.consumed ? (
          <View style={styles.offerCard}>
            <Text style={styles.offerKicker}>WHAT I'M NOTICING</Text>
            <Text style={styles.offerBody}>{item.insight.summary}</Text>
            {item.insight.pattern ? (
              <Text style={styles.offerPattern}>Pattern: {item.insight.pattern}</Text>
            ) : null}
            {item.insight.next_step ? (
              <View style={styles.offerSection}>
                <Text style={styles.offerLabel}>Next step</Text>
                <Text style={styles.offerBody}>{item.insight.next_step}</Text>
              </View>
            ) : null}
            {item.insight.tool ? (
              <Pressable
                style={styles.offerButton}
                onPress={() => handleToolPress(item, item.insight!.tool as Exclude<ToolType, null>)}
              >
                <Text style={styles.offerButtonText}>{TOOL_LABEL[item.insight.tool]}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {item.steps && !item.consumed ? (
          <View style={styles.offerCard}>
            <Text style={styles.offerKicker}>SUGGESTED STEPS</Text>
            {item.steps.map((step, idx) => (
              <Text key={idx} style={styles.stepText}>
                {idx + 1}. {step}
              </Text>
            ))}
            <Pressable style={styles.offerButton} onPress={() => handleAcceptBreakdown(item)}>
              <Text style={styles.offerButtonText}>Make this my breakdown</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={data}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            sending ? (
              <View style={styles.thinkingRow}>
                <ActivityIndicator />
                <Text style={styles.thinking}>thinking…</Text>
              </View>
            ) : null
          }
        />
        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say what's on your mind…"
            placeholderTextColor={theme.colors.subtext}
            multiline
            style={styles.input}
            editable={!sending}
          />
          <Pressable
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md, flexGrow: 1 },
  userRow: { alignItems: 'flex-end', marginBottom: theme.spacing.sm },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  assistantRow: { alignItems: 'flex-start', marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  assistantBubble: {
    maxWidth: '90%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assistantText: { color: theme.colors.text, fontSize: 16, lineHeight: 22 },
  offerCard: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    width: '95%',
  },
  offerKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.subtext,
    letterSpacing: 0.6,
  },
  offerSection: { gap: 4 },
  offerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  offerBody: { fontSize: 15, lineHeight: 21, color: theme.colors.text },
  offerPattern: { fontSize: 13, color: theme.colors.subtext, fontStyle: 'italic' },
  stepText: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
  offerButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  offerButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  thinking: { color: theme.colors.subtext, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
