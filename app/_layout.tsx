import { useEffect } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { useSessionStore } from '../store/useSessionStore';
import { theme } from '../constants/theme';

function HomeHeaderRight() {
  return (
    <View style={styles.headerRight}>
      <Pressable hitSlop={8} onPress={() => router.push('/history')}>
        <Text style={styles.headerLink}>History</Text>
      </Pressable>
      <Pressable hitSlop={8} onPress={() => router.push('/settings')}>
        <Text style={styles.headerLink}>Settings</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const hydrated = useUserStore((state) => state.hydrated);
  const onboarded = useUserStore((state) => state.preferences.onboarded);
  const pathname = usePathname();

  useEffect(() => {
    useUserStore.getState().hydrate();
  }, []);

  // After preferences are loaded, send first-time users to /welcome.
  useEffect(() => {
    if (!hydrated) return;
    if (!onboarded && pathname !== '/welcome') {
      router.replace('/welcome');
    }
  }, [hydrated, onboarded, pathname]);

  // When the app goes to background, clear in-memory thought + result.
  // Mental-health data shouldn't linger across foregrounding sessions.
  // Persisted entries (in SQLite) are unaffected — user can re-open from history.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        const session = useSessionStore.getState();
        session.setCurrentInput(null);
        session.setCurrentResult(null);
        session.clearMessages();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen
        name="index"
        options={{
          title: 'ClearMind',
          headerRight: () => <HomeHeaderRight />,
        }}
      />
      <Stack.Screen name="chat" options={{ title: 'ClearMind' }} />
      <Stack.Screen name="breakdown" options={{ title: 'Break it down' }} />
      <Stack.Screen name="manual-breakdown" options={{ title: 'Break it down' }} />
      <Stack.Screen name="active-task" options={{ title: 'Active task' }} />
      <Stack.Screen name="daily-list" options={{ title: 'Today' }} />
      <Stack.Screen name="brain-dump" options={{ title: 'Brain dump' }} />
      <Stack.Screen name="focus" options={{ title: 'Focus timer' }} />
      <Stack.Screen name="reset" options={{ title: 'Mental reset' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="history/[id]" options={{ title: 'Entry' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 12,
  },
  headerLink: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
