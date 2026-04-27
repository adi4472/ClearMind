import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';
import { ResponseTone } from '../types/user';

export default function SettingsScreen() {
  const { preferences, updatePreferences } = useUserStore();
  const tones: ResponseTone[] = ['direct', 'gentle', 'analytical'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Response tone</Text>
          <View style={styles.rowWrap}>
            {tones.map((tone) => {
              const active = preferences.tone === tone;
              return (
                <Pressable
                  key={tone}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => updatePreferences({ tone })}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{tone}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.sectionTitle}>Save history</Text>
            <Text style={styles.subtext}>Keep entries for personalized insights.</Text>
          </View>
          <Switch
            value={preferences.saveHistory}
            onValueChange={(value) => updatePreferences({ saveHistory: value })}
          />
        </View>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.sectionTitle}>Private mode</Text>
            <Text style={styles.subtext}>Do not save sensitive entries.</Text>
          </View>
          <Switch
            value={preferences.privateMode}
            onValueChange={(value) => updatePreferences({ privateMode: value })}
          />
        </View>
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
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardRow: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subtext: {
    fontSize: 14,
    color: theme.colors.subtext,
    marginTop: 4,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
});
