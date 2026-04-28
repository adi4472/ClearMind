import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AIResponseCard from '../components/AIResponseCard';
import QuickActionButton from '../components/QuickActionButton';
import { useSessionStore } from '../store/useSessionStore';
import { theme } from '../constants/theme';
import { ToolType } from '../types/session';

const TOOL_LABEL: Record<Exclude<ToolType, null>, string> = {
  focus_timer: 'Start focus timer',
  break_it_down: 'Break it down',
  mental_reset: 'Start mental reset',
};

const TOOL_ROUTE: Record<Exclude<ToolType, null>, '/focus' | '/breakdown' | '/reset'> = {
  focus_timer: '/focus',
  break_it_down: '/breakdown',
  mental_reset: '/reset',
};

export default function ResultScreen() {
  const result = useSessionStore((state) => state.currentResult);

  if (!result) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  const handleAction = () => {
    if (result.tool) {
      router.push(TOOL_ROUTE[result.tool]);
    } else {
      router.back();
    }
  };

  const actionTitle = result.tool ? TOOL_LABEL[result.tool] : 'Done';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AIResponseCard data={result} />
        <QuickActionButton title={actionTitle} onPress={handleAction} />
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
