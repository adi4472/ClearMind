import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSessionStore } from '../store/useSessionStore';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../constants/theme';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function FocusScreen() {
  const suggestedNextStep = useSessionStore((state) => state.currentResult?.next_step);
  const defaultMinutes = useUserStore((state) => state.preferences.defaultFocusMinutes);

  const totalSeconds = defaultMinutes * 60;
  const [label, setLabel] = useState(suggestedNextStep ?? '');
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If the AI's suggestion arrives after mount (rare, but possible), seed the
  // label only when the user hasn't typed anything of their own yet.
  useEffect(() => {
    if (!label && suggestedNextStep) {
      setLabel(suggestedNextStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedNextStep]);

  // Keep timer aligned with the user's preferred default while not running and unedited.
  useEffect(() => {
    if (!running && remaining === 0) return;
    if (!running) setRemaining(totalSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMinutes]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setRemaining(totalSeconds);
  };

  const giveUp = () => {
    Alert.alert(
      'Give up early?',
      "You're still in the middle of your focus session.",
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Give up',
          style: 'destructive',
          onPress: reset,
        },
      ],
    );
  };

  const finished = remaining === 0;
  const idle = !running && remaining === totalSeconds;
  const locked = strictMode && running;

  // Block Android hardware back while locked.
  useEffect(() => {
    if (!locked) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      giveUp();
      return true;
    });
    return () => sub.remove();
  }, [locked]);

  // Detect leaving the app during a strict run; prompt on return.
  useEffect(() => {
    if (!locked) return;
    let wasBackgrounded = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        wasBackgrounded = true;
      } else if (state === 'active' && wasBackgrounded) {
        wasBackgrounded = false;
        Alert.alert(
          'You left the session',
          'Strict focus was interrupted.',
          [
            { text: 'Resume', style: 'cancel' },
            { text: 'Count as failed', style: 'destructive', onPress: reset },
          ],
        );
      }
    });
    return () => sub.remove();
  }, [locked]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerBackVisible: !locked,
          gestureEnabled: !locked,
        }}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>Focus timer</Text>
            <Text style={styles.subtitle}>{defaultMinutes} minutes. One thing.</Text>
          </View>

          <View style={styles.labelCard}>
            <Text style={styles.labelHeading}>YOUR FOCUS</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="What are you focusing on?"
              placeholderTextColor={theme.colors.subtext}
              multiline
              editable={idle}
              style={styles.labelInput}
            />
          </View>

          {idle ? (
            <View style={styles.strictCard}>
              <View style={styles.strictRow}>
                <View style={styles.strictTextWrap}>
                  <Text style={styles.strictTitle}>Strict mode</Text>
                  <Text style={styles.strictSub}>
                    No pause. No back. Tap "Give up" to end early.
                  </Text>
                </View>
                <Switch value={strictMode} onValueChange={setStrictMode} />
              </View>
              {strictMode ? (
                <Text style={styles.dndTip}>
                  Tip: enable Do Not Disturb on your phone for the cleanest run.
                </Text>
              ) : null}
            </View>
          ) : null}

          {locked ? (
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>Strict mode • Locked</Text>
            </View>
          ) : null}

          <View style={styles.timerWrap}>
            <Text style={styles.timer}>{formatTime(remaining)}</Text>
            {finished ? <Text style={styles.doneNote}>Time's up. Nicely done.</Text> : null}
          </View>

          <View style={styles.controls}>
            {finished ? null : locked ? (
              <Pressable style={styles.giveUpButton} onPress={giveUp}>
                <Text style={styles.giveUpText}>Give up early</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.primaryButton} onPress={() => setRunning((r) => !r)}>
                  <Text style={styles.primaryText}>
                    {running ? 'Pause' : idle ? 'Start' : 'Resume'}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={reset}>
                  <Text style={styles.secondaryText}>Reset</Text>
                </Pressable>
              </>
            )}
            {locked ? null : (
              <Pressable style={styles.linkButton} onPress={() => router.back()}>
                <Text style={styles.linkText}>Back</Text>
              </Pressable>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 15, color: theme.colors.subtext, marginTop: 4 },
  labelCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  labelHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.subtext,
    letterSpacing: 0.6,
  },
  labelInput: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.text,
    minHeight: 48,
    textAlignVertical: 'top',
    padding: 0,
  },
  strictCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  strictTextWrap: { flex: 1 },
  strictTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  strictSub: { fontSize: 13, color: theme.colors.subtext, marginTop: 2 },
  dndTip: { fontSize: 13, color: theme.colors.subtext, fontStyle: 'italic' },
  lockBadge: {
    alignSelf: 'center',
    backgroundColor: theme.colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  lockBadgeText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  timerWrap: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  timer: {
    fontSize: 64,
    fontWeight: '700',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  doneNote: { color: theme.colors.primary, fontWeight: '600' },
  controls: { gap: theme.spacing.sm, marginTop: 'auto' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  secondaryText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
  giveUpButton: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B33A3A',
  },
  giveUpText: { color: '#B33A3A', fontWeight: '600', fontSize: 15 },
  linkButton: { padding: theme.spacing.sm, alignItems: 'center' },
  linkText: { color: theme.colors.subtext, fontSize: 14 },
});
