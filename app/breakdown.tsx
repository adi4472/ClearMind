import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { requestBreakdown } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { saveEntry } from '../lib/entries';
import { theme } from '../constants/theme';

export default function BreakdownScreen() {
  const currentInput = useSessionStore((state) => state.currentInput);
  const currentResult = useSessionStore((state) => state.currentResult);
  const saveHistory = useUserStore((state) => state.preferences.saveHistory);

  const [steps, setSteps] = useState<string[] | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentInput) {
      setError('No thought to break down. Go back and share one first.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const payload = await requestBreakdown({
          text: currentInput,
          next_step: currentResult?.next_step,
        });
        if (cancelled) return;
        setSteps(payload.steps);
        if (saveHistory) {
          try {
            await saveEntry('ai_breakdown', { source_text: currentInput, steps: payload.steps });
          } catch (err) {
            console.warn('saveEntry failed:', err instanceof Error ? err.message : err);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load breakdown');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentInput, currentResult, saveHistory]);

  const toggle = (idx: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text style={styles.title}>Break it down</Text>
          <Text style={styles.subtitle}>One small thing at a time.</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Generating steps…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : steps ? (
          <View style={styles.stepsList}>
            {steps.map((step, idx) => {
              const isDone = done.has(idx);
              return (
                <Pressable key={idx} style={styles.stepRow} onPress={() => toggle(idx)}>
                  <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                    {isDone ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.stepText, isDone && styles.stepTextDone]}>{step}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
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
  stepsList: { gap: theme.spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: { backgroundColor: theme.colors.primary },
  checkboxMark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 22, color: theme.colors.text },
  stepTextDone: { textDecorationLine: 'line-through', color: theme.colors.subtext },
  doneButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
