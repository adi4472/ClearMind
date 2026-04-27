import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ThoughtInput from '../components/ThoughtInput';
import InsightCard from '../components/InsightCard';
import { analyzeThought } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const setCurrentResult = useSessionStore((state) => state.setCurrentResult);
  const userId = useUserStore((state) => state.userId);

  const handleSubmit = async (text: string) => {
    try {
      setLoading(true);
      const result = await analyzeThought({ text, userId });
      setCurrentResult(result);
      router.push('/result');
    } catch (error) {
      Alert.alert('Something went wrong', 'Please try again.');
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
});
