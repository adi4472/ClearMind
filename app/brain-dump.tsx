import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { extractTasks } from '../services/api';
import { addManyDailyTasks } from '../lib/dailyTasks';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';

type Phase = 'compose' | 'preview';

export default function BrainDumpScreen() {
  const privateMode = useUserStore((state) => state.preferences.privateMode);

  const [phase, setPhase] = useState<Phase>('compose');
  const [text, setText] = useState('');
  const [extracted, setExtracted] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [working, setWorking] = useState(false);

  const handleExtract = async () => {
    if (privateMode) {
      Alert.alert(
        'Private mode is on',
        'Brain dump uses AI, which is disabled in Private mode. Add tasks one at a time instead, or turn off Private mode in Settings.',
      );
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Nothing to extract', 'Type a few things first.');
      return;
    }
    try {
      setWorking(true);
      const result = await extractTasks({ text: trimmed });
      setExtracted(result.tasks);
      setSelected(new Set(result.tasks.map((_, i) => i)));
      setPhase('preview');
    } catch (err) {
      Alert.alert('Extraction failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirm = async () => {
    const chosen = extracted.filter((_, i) => selected.has(i));
    if (chosen.length === 0) {
      Alert.alert('Nothing selected', 'Pick at least one to add, or cancel.');
      return;
    }
    try {
      setWorking(true);
      await addManyDailyTasks(chosen);
      router.replace('/daily-list');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setWorking(false);
    }
  };

  if (phase === 'preview') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View>
            <Text style={styles.title}>Found {extracted.length}</Text>
            <Text style={styles.subtitle}>Uncheck anything you don't want.</Text>
          </View>
          <View style={styles.previewList}>
            {extracted.map((task, idx) => {
              const isOn = selected.has(idx);
              return (
                <Pressable key={idx} style={styles.previewRow} onPress={() => toggle(idx)}>
                  <View style={[styles.checkbox, isOn && styles.checkboxOn]}>
                    {isOn ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  <Text style={[styles.previewText, !isOn && styles.previewTextOff]}>{task}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[styles.primaryButton, working && styles.disabled]}
            disabled={working}
            onPress={handleConfirm}
          >
            <Text style={styles.primaryText}>
              {working ? 'Saving…' : `Add ${selected.size} to today`}
            </Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => setPhase('compose')}>
            <Text style={styles.linkText}>Back to edit</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.title}>Brain dump</Text>
            <Text style={styles.subtitle}>
              Type everything on your mind. Don't worry about formatting — we'll split it into tasks.
            </Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="After work need to grab milk and eggs, also call mom about Sunday, finish the deck for tomorrow…"
            placeholderTextColor={theme.colors.subtext}
            multiline
            style={styles.dumpInput}
            editable={!working}
          />
          <Pressable
            style={[styles.primaryButton, (working || !text.trim()) && styles.disabled]}
            disabled={working || !text.trim()}
            onPress={handleExtract}
          >
            {working ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Extract tasks</Text>
            )}
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => router.back()}>
            <Text style={styles.linkText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 15, color: theme.colors.subtext, marginTop: 4, lineHeight: 21 },
  dumpInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 220,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  previewList: { gap: theme.spacing.xs },
  previewRow: {
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
  checkboxOn: { backgroundColor: theme.colors.primary },
  check: { color: '#fff', fontWeight: '700', fontSize: 14 },
  previewText: { flex: 1, fontSize: 16, lineHeight: 22, color: theme.colors.text },
  previewTextOff: { color: theme.colors.subtext, textDecorationLine: 'line-through' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
  linkButton: { padding: theme.spacing.sm, alignItems: 'center' },
  linkText: { color: theme.colors.subtext, fontSize: 14 },
});
