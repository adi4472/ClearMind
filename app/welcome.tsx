import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { requestNotificationPermissions } from '../lib/notifications';
import { theme } from '../constants/theme';

export default function WelcomeScreen() {
  const updatePreferences = useUserStore((state) => state.updatePreferences);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [working, setWorking] = useState(false);

  const handleContinue = async () => {
    if (!ageConfirmed || !acknowledged) {
      Alert.alert(
        'A couple more taps',
        'Please confirm you are 16 or older and have read how your data is handled.',
      );
      return;
    }

    try {
      setWorking(true);
      // Ask for notification permission. We continue regardless — denying
      // doesn't block the user from using the app, just from getting reminders.
      // Wrapped so a missing native module (older dev build) doesn't trap the user.
      let status: 'granted' | 'denied' | 'undetermined' = 'undetermined';
      try {
        status = await requestNotificationPermissions();
      } catch (err) {
        console.warn('Notifications module unavailable:', err instanceof Error ? err.message : err);
      }
      if (status !== 'granted') {
        Alert.alert(
          'Notifications off',
          'You can turn them on later in Settings if you want daily check-in reminders.',
        );
      }
      updatePreferences({ onboarded: true });
      router.replace('/');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandWrap}>
          <Text style={styles.brand}>ClearMind</Text>
          <Text style={styles.tagline}>A quiet place to think.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>How your data is handled</Text>
          <Text style={styles.bullet}>
            • Your thoughts and tasks are stored <Text style={styles.bold}>encrypted on this device</Text>. They are not synced or backed up.
          </Text>
          <Text style={styles.bullet}>
            • The text of a thought is sent to Google's Gemini API for AI processing. We attach no other identifying data.
          </Text>
          <Text style={styles.bullet}>
            • You can delete any entry at any time from History, or wipe everything from Settings.
          </Text>
          <Text style={styles.bullet}>
            • In Private Mode, AI is disabled and nothing leaves the device.
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <Switch value={ageConfirmed} onValueChange={setAgeConfirmed} />
          <Text style={styles.toggleText}>I am 16 years of age or older.</Text>
        </View>

        <View style={styles.toggleRow}>
          <Switch value={acknowledged} onValueChange={setAcknowledged} />
          <Text style={styles.toggleText}>
            I've read how my data is handled and I'd like to continue.
          </Text>
        </View>

        <View style={styles.notifyCard}>
          <Text style={styles.notifyHeading}>One quick permission</Text>
          <Text style={styles.notifyBody}>
            We'll ask for notification permission next so we can send you a daily check-in reminder. You can decline — the app still works.
          </Text>
        </View>

        <Pressable
          style={[styles.continueButton, (working || !ageConfirmed || !acknowledged) && styles.disabled]}
          disabled={working || !ageConfirmed || !acknowledged}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>{working ? 'Setting up…' : 'Continue'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  brandWrap: { alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xl },
  brand: { fontSize: 36, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: theme.colors.subtext },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardHeading: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  bullet: { fontSize: 14, lineHeight: 21, color: theme.colors.text },
  bold: { fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  toggleText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  notifyCard: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  notifyHeading: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  notifyBody: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  continueButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  disabled: { opacity: 0.5 },
  continueText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
