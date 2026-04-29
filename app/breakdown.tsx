import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { requestBreakdown } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { getActiveTask, saveEntry } from '../lib/entries';
import { theme } from '../constants/theme';

// This screen is a brief loader: it fetches the AI breakdown, persists it as an
// `ai_breakdown` entry (with completedSteps starting empty), and forwards to the
// active-task screen which renders one step at a time.
export default function BreakdownScreen() {
  const currentInput = useSessionStore((state) => state.currentInput);
  const currentResult = useSessionStore((state) => state.currentResult);
  const saveHistory = useUserStore((state) => state.preferences.saveHistory);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentInput) {
      setError('No thought to break down. Go back and share one first.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Block stacking a second active task.
        const active = await getActiveTask();
        if (active) {
          if (!cancelled) router.replace('/active-task');
          return;
        }

        const payload = await requestBreakdown({
          text: currentInput,
          next_step: currentResult?.next_step ?? undefined,
        });
        if (cancelled) return;

        if (!saveHistory) {
          // We need persistence to drive the active-task flow. Tell the user.
          setError(
            'Save history is off, so we can\'t keep this breakdown as an active task. Turn save history on and try again.',
          );
          return;
        }

        await saveEntry('ai_breakdown', {
          source_text: currentInput,
          steps: payload.steps,
          completedSteps: [],
        });
        if (!cancelled) router.replace('/active-task');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load breakdown');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentInput, currentResult, saveHistory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>Break it down</Text>
          <Text style={styles.subtitle}>One small thing at a time.</Text>
        </View>

        {error ? (
          <>
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Back</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Generating steps…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg, flex: 1 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 15, color: theme.colors.subtext, marginTop: 4 },
  center: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  muted: { color: theme.colors.subtext },
  errorCard: {
    backgroundColor: theme.colors.warning,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  errorText: { color: theme.colors.text },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
