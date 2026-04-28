import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ThoughtInput from '../components/ThoughtInput';
import InsightCard from '../components/InsightCard';
import { analyzeThought } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { saveEntry } from '../lib/entries';
import { theme } from '../constants/theme';

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const setCurrentInput = useSessionStore((state) => state.setCurrentInput);
  const setCurrentResult = useSessionStore((state) => state.setCurrentResult);
  const userId = useUserStore((state) => state.userId);
  const preferences = useUserStore((state) => state.preferences);

  const handleSubmit = async (text: string) => {
    if (preferences.privateMode) {
      Alert.alert(
        'Private mode is on',
        'AI analysis is disabled. Try a manual breakdown instead, or turn off Private mode in Settings.',
        [
          { text: 'Manual breakdown', onPress: () => router.push('/manual-breakdown') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    try {
      setLoading(true);
      const result = await analyzeThought({ text, userId });
      setCurrentInput(text);
      setCurrentResult(result);

      if (preferences.saveHistory) {
        try {
          await saveEntry('thought', {
            text,
            summary: result.summary,
            pattern: result.pattern,
            next_step: result.next_step,
            tool: result.tool,
          });
        } catch (err) {
          console.warn('saveEntry failed:', err instanceof Error ? err.message : err);
        }
      }

      router.push('/result');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('analyzeThought failed:', message);
      Alert.alert('Something went wrong', message);
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
        <ThoughtInput onSubmit={handleSubmit} loading={loading} />
        <View style={styles.linkRow}>
          <Pressable onPress={() => router.push('/manual-breakdown')} hitSlop={6}>
            <Text style={styles.linkText}>Break it down manually →</Text>
          </Pressable>
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
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.subtext,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
