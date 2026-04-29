import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnalyzeThoughtResponse } from '../types/session';
import { theme } from '../constants/theme';

interface Props {
  data: AnalyzeThoughtResponse;
}

export default function AIResponseCard({ data }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.section}>
        <Text style={styles.heading}>What’s happening</Text>
        <Text style={styles.body}>{data.summary}</Text>
      </View>
      {data.pattern ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Pattern</Text>
          <Text style={styles.body}>{data.pattern}</Text>
        </View>
      ) : null}
      {data.next_step ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Next step</Text>
          <Text style={styles.body}>{data.next_step}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  section: {
    gap: theme.spacing.xs,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
});
