import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';
import { FocusMinutes, ResponseTone } from '../types/user';

const TONES: ResponseTone[] = ['direct', 'gentle', 'analytical'];
const FOCUS_OPTIONS: FocusMinutes[] = [5, 10, 15, 25];

export default function SettingsScreen() {
  const { preferences, updatePreferences } = useUserStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Response tone</Text>
          <View style={styles.rowWrap}>
            {TONES.map((tone) => {
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Default focus duration</Text>
          <Text style={styles.subtext}>Used when you start a focus session.</Text>
          <View style={styles.rowWrap}>
            {FOCUS_OPTIONS.map((minutes) => {
              const active = preferences.defaultFocusMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => updatePreferences({ defaultFocusMinutes: minutes })}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {minutes} min
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.cardRowText}>
            <Text style={styles.sectionTitle}>Save history</Text>
            <Text style={styles.subtext}>
              Keep encrypted entries on this device. Turn off to skip saving.
            </Text>
          </View>
          <Switch
            value={preferences.saveHistory}
            onValueChange={(value) => updatePreferences({ saveHistory: value })}
          />
        </View>

        <View style={styles.cardRow}>
          <View style={styles.cardRowText}>
            <Text style={styles.sectionTitle}>Private mode</Text>
            <Text style={styles.subtext}>
              Skip the AI entirely. Manual breakdowns only — nothing leaves your phone.
            </Text>
          </View>
          <Switch
            value={preferences.privateMode}
            onValueChange={(value) => updatePreferences({ privateMode: value })}
          />
        </View>
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
  cardRowText: { flex: 1 },
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
