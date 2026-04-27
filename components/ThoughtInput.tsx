import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../constants/theme';

interface ThoughtInputProps {
  onSubmit: (value: string) => Promise<void>;
  loading?: boolean;
}

export default function ThoughtInput({ onSubmit, loading = false }: ThoughtInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    await onSubmit(trimmed);
    setValue('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>What’s on your mind?</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="I feel scattered and can’t focus on what matters..."
        placeholderTextColor={theme.colors.subtext}
        multiline
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={handleSubmit}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get clarity</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  input: {
    minHeight: 120,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
