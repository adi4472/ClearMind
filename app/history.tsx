import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchHistory } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';

export default function HistoryScreen() {
  const userId = useUserStore((state) => state.userId);
  const history = useSessionStore((state) => state.history);
  const setHistory = useSessionStore((state) => state.setHistory);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await fetchHistory(userId);
        setHistory(data);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [setHistory, userId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.summary}>{item.summary}</Text>
              {item.pattern ? <Text style={styles.pattern}>{item.pattern}</Text> : null}
              <Text style={styles.nextStep}>{item.next_step}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No entries yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summary: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pattern: {
    fontSize: 14,
    color: theme.colors.subtext,
  },
  nextStep: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.subtext,
    marginTop: 48,
  },
});
