import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  text: string;
}

export default function InsightCard({ text }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Daily insight</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: theme.colors.text,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
});
