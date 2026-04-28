import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PRESET_TAGS, PresetTag, TAG_LABELS } from '../constants/tags';
import { theme } from '../constants/theme';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function TagSelector({ selected, onChange, disabled }: Props) {
  const toggle = (tag: PresetTag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <View style={styles.row}>
      {PRESET_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <Pressable
            key={tag}
            disabled={disabled}
            onPress={() => toggle(tag)}
            style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {TAG_LABELS[tag]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  disabled: { opacity: 0.5 },
});
