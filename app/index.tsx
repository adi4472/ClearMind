import React, { useCallback, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import ThoughtInput from '../components/ThoughtInput';
import InsightCard from '../components/InsightCard';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { FullEntry, ManualBreakdownPayload, AIBreakdownPayload, getActiveTask } from '../lib/entries';
import { DailyTask, listDailyTasks } from '../lib/dailyTasks';
import { ChatMessage } from '../types/session';
import { theme } from '../constants/theme';

function activeTaskHeadline(entry: FullEntry): string {
  if (entry.type === 'manual_breakdown') {
    return (entry.payload as ManualBreakdownPayload).problem;
  }
  const p = entry.payload as AIBreakdownPayload;
  const completed = new Set(p.completedSteps ?? []);
  const idx = p.steps.findIndex((_, i) => !completed.has(i));
  return idx >= 0 ? p.steps[idx] : p.steps[0];
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<FullEntry | null>(null);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const appendMessage = useSessionStore((state) => state.appendMessage);
  const clearMessages = useSessionStore((state) => state.clearMessages);
  const preferences = useUserStore((state) => state.preferences);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [t, daily] = await Promise.all([getActiveTask(), listDailyTasks()]);
        if (cancelled) return;
        setActiveTask(t);
        setTodayTasks(daily);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleSubmit = async (text: string) => {
    if (preferences.privateMode) {
      Alert.alert(
        'Private mode is on',
        'AI is disabled. Try a manual breakdown, or turn off Private mode in Settings.',
        [
          { text: 'Manual breakdown', onPress: () => router.push('/manual-breakdown') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    try {
      setLoading(true);
      // Start a fresh conversation. The chat screen will auto-trigger the first
      // assistant turn because the last message is from the user.
      clearMessages();
      const userMessage: ChatMessage = {
        id: Crypto.randomUUID(),
        role: 'user',
        text,
      };
      appendMessage(userMessage);
      router.push('/chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Good evening</Text>
          <Text style={styles.subtitle}>Let’s make your mind feel lighter.</Text>
        </View>

        {activeTask ? (
          <Pressable style={styles.activeCard} onPress={() => router.push('/active-task')}>
            <Text style={styles.activeKicker}>YOUR ACTIVE TASK</Text>
            <Text style={styles.activeText} numberOfLines={2}>
              {activeTaskHeadline(activeTask)}
            </Text>
            <Text style={styles.activeAction}>Resume →</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.dailyCard} onPress={() => router.push('/daily-list')}>
          <View style={styles.dailyHeader}>
            <Text style={styles.dailyKicker}>TODAY</Text>
            {todayTasks.length > 0 ? (
              <Text style={styles.dailyMeta}>
                {todayTasks.filter((t) => t.completed_at).length} of {todayTasks.length} done
              </Text>
            ) : null}
          </View>
          <Text style={styles.dailyText}>
            {todayTasks.length === 0
              ? 'Nothing on your list yet — tap to add.'
              : `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} on your list`}
          </Text>
        </Pressable>

        <ThoughtInput onSubmit={handleSubmit} loading={loading} />
        <View style={styles.linkRow}>
          {!activeTask ? (
            <Pressable onPress={() => router.push('/manual-breakdown')} hitSlop={6}>
              <Text style={styles.linkText}>Break it down manually →</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push('/focus')} hitSlop={6}>
            <Text style={styles.linkText}>Start a focus session →</Text>
          </Pressable>
        </View>
        <InsightCard text="You usually think more clearly when the next step is concrete and small." />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  header: { gap: theme.spacing.xs, marginTop: theme.spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 16, color: theme.colors.subtext },
  activeCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  activeKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.6,
  },
  activeText: { fontSize: 17, fontWeight: '600', color: '#fff', lineHeight: 23 },
  activeAction: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: theme.spacing.xs },
  dailyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  dailyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.subtext,
    letterSpacing: 0.6,
  },
  dailyMeta: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  dailyText: { fontSize: 15, color: theme.colors.text },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg },
  linkText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
});
