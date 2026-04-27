import React from 'react';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';
import AIResponseCard from '../components/AIResponseCard';
import QuickActionButton from '../components/QuickActionButton';
import { useSessionStore } from '../store/useSessionStore';
import { theme } from '../constants/theme';

export default function ResultScreen() {
  const result = useSessionStore((state) => state.currentResult);

  if (!result) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  const actionTitle =
    result.tool === 'focus_timer'
      ? 'Start focus timer'
      : result.tool === 'break_it_down'
      ? 'Break it down'
      : result.tool === 'mental_reset'
      ? 'Start mental reset'
      : 'Done';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AIResponseCard data={result} />
        <QuickActionButton title={actionTitle} onPress={() => Alert.alert('Coming soon', actionTitle)} />
      </View>
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
});
