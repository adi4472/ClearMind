import React, { useState } from 'react';
import {
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
import { saveEntry } from '../lib/entries';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';
import TagSelector from '../components/TagSelector';

const QUESTIONS: { key: 'problem' | 'step' | 'ignore'; label: string; placeholder: string; required: boolean }[] = [
  {
    key: 'problem',
    label: "What's the problem?",
    placeholder: 'In one sentence — the heart of what feels stuck.',
    required: true,
  },
  {
    key: 'step',
    label: "What's one small step?",
    placeholder: 'Something you could do in the next 15 minutes.',
    required: true,
  },
  {
    key: 'ignore',
    label: 'What can you ignore for now?',
    placeholder: "Anything pulling at you that doesn't need attention today.",
    required: false,
  },
];

export default function ManualBreakdownScreen() {
  const saveHistory = useUserStore((state) => state.preferences.saveHistory);
  const [answers, setAnswers] = useState({ problem: '', step: '', ignore: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!answers.problem.trim() || !answers.step.trim()) {
      Alert.alert(
        'A couple more words',
        'Please answer the first two — the problem and one small step.',
      );
      return;
    }
    try {
      setSaving(true);
      if (saveHistory) {
        await saveEntry('manual_breakdown', {
          problem: answers.problem.trim(),
          step: answers.step.trim(),
          ignore: answers.ignore.trim(),
          tags: tags.length ? tags : undefined,
        });
      }
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.title}>Break it down</Text>
            <Text style={styles.subtitle}>Three short questions. Answer in your own words.</Text>
          </View>

          {QUESTIONS.map((q) => (
            <View key={q.key} style={styles.field}>
              <Text style={styles.label}>
                {q.label}
                {q.required ? null : <Text style={styles.optional}>  optional</Text>}
              </Text>
              <TextInput
                value={answers[q.key]}
                onChangeText={(v) => update(q.key, v)}
                placeholder={q.placeholder}
                placeholderTextColor={theme.colors.subtext}
                multiline
                style={styles.input}
                editable={!saving}
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>
              Tags<Text style={styles.optional}>  optional</Text>
            </Text>
            <TagSelector selected={tags} onChange={setTags} disabled={saving} />
          </View>

          {!saveHistory ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Save history is off. This breakdown will be visible now but not saved.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : saveHistory ? 'Save' : 'Done'}</Text>
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
  subtitle: { fontSize: 15, color: theme.colors.subtext, marginTop: 4 },
  field: { gap: theme.spacing.xs },
  label: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  optional: { fontSize: 13, fontWeight: '400', color: theme.colors.subtext },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notice: {
    backgroundColor: theme.colors.warning,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  noticeText: { color: theme.colors.text, fontSize: 14 },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
