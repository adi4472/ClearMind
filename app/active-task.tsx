import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  AIBreakdownPayload,
  FullEntry,
  ManualBreakdownPayload,
  getActiveTask,
  markAIBreakdownStepComplete,
  markEntryComplete,
} from '../lib/entries';
import { theme } from '../constants/theme';
import { randomFinalMessage, randomStepMessage } from '../constants/encouragement';

export default function ActiveTaskScreen() {
  const [entry, setEntry] = useState<FullEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const active = await getActiveTask();
      setEntry(active);
    } catch (err) {
      console.warn('getActiveTask failed:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const finishAndExit = () => {
    const msg = randomFinalMessage();
    Alert.alert(msg.title, msg.body, [{ text: 'OK', onPress: () => router.replace('/') }]);
  };

  const showStepEncouragement = () => {
    const msg = randomStepMessage();
    Alert.alert(msg.title, msg.body);
  };

  const handleComplete = async () => {
    if (!entry) return;
    try {
      setWorking(true);
      await markEntryComplete(entry.id);
      finishAndExit();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  const handleStepAction = async (stepIndex: number) => {
    if (!entry || entry.type !== 'ai_breakdown') return;
    try {
      setWorking(true);
      await markAIBreakdownStepComplete(entry.id, stepIndex);
      const next = await getActiveTask();
      if (next && next.id === entry.id) {
        setEntry(next);
        showStepEncouragement();
      } else {
        finishAndExit();
      }
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>No active task</Text>
          <Text style={styles.subtitle}>Start a new one when something feels heavy.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/manual-breakdown')}>
            <Text style={styles.primaryText}>Break it down manually</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => router.back()}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (entry.type === 'manual_breakdown') {
    const p = entry.payload as ManualBreakdownPayload;
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View>
            <Text style={styles.kicker}>YOUR ACTIVE TASK</Text>
            <Text style={styles.title}>{p.problem}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>One small step</Text>
            <Text style={styles.body}>{p.step}</Text>
          </View>

          {p.ignore ? (
            <View style={styles.softCard}>
              <Text style={styles.heading}>Set aside for now</Text>
              <Text style={styles.body}>{p.ignore}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryButton, working && styles.buttonDisabled]}
            disabled={working}
            onPress={handleComplete}
          >
            <Text style={styles.primaryText}>{working ? 'Saving…' : 'Mark complete'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ai_breakdown
  const p = entry.payload as AIBreakdownPayload;
  const completed = new Set(p.completedSteps ?? []);
  const nextIndex = p.steps.findIndex((_, i) => !completed.has(i));
  if (nextIndex === -1) {
    // Defensive — if every step is done but completed_at hasn't propagated yet,
    // close out gracefully rather than render a broken screen.
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.body}>All steps done.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text style={styles.kicker}>
            STEP {nextIndex + 1} OF {p.steps.length}
          </Text>
          <Text style={styles.title}>{p.steps[nextIndex]}</Text>
        </View>

        <View style={styles.softCard}>
          <Text style={styles.heading}>Original thought</Text>
          <Text style={styles.body}>{p.source_text}</Text>
        </View>

        <Pressable
          style={[styles.primaryButton, working && styles.buttonDisabled]}
          disabled={working}
          onPress={() => handleStepAction(nextIndex)}
        >
          <Text style={styles.primaryText}>{working ? 'Saving…' : 'Mark complete'}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, working && styles.buttonDisabled]}
          disabled={working}
          onPress={() => handleStepAction(nextIndex)}
        >
          <Text style={styles.secondaryText}>Skip this step</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.subtext,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, lineHeight: 32 },
  subtitle: { fontSize: 15, color: theme.colors.subtext },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  softCard: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  secondaryText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  linkButton: { padding: theme.spacing.sm, alignItems: 'center' },
  linkText: { color: theme.colors.subtext, fontSize: 14 },
});
