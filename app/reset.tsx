import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../constants/theme';

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Notice your breath',
    body: 'Take three slow breaths. Inhale for four counts, hold for four, exhale for six. No need to change anything else — just notice.',
  },
  {
    title: 'Name what you can sense',
    body: 'Look around. Quietly name three things you can see, two things you can hear, and one thing you can feel against your skin.',
  },
  {
    title: 'One small re-entry',
    body: 'You don\'t need to fix everything now. Choose one small thing you can do in the next two minutes — drink water, stand up, open one tab. Then do it.',
  },
];

export default function ResetScreen() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.back();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>Mental reset</Text>
          <Text style={styles.subtitle}>
            Step {index + 1} of {STEPS.length}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryText}>{isLast ? 'Done' : 'Next'}</Text>
          </Pressable>
          {!isLast ? (
            <Pressable style={styles.linkButton} onPress={() => router.back()}>
              <Text style={styles.linkText}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.subtext, marginTop: 4 },
  card: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  stepTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  stepBody: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
  controls: { gap: theme.spacing.sm, marginTop: 'auto' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  linkButton: { padding: theme.spacing.sm, alignItems: 'center' },
  linkText: { color: theme.colors.subtext, fontSize: 14 },
});
