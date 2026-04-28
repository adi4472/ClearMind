import { getDb } from './db';
import { UserPreferences } from '../types/user';

const PREFS_KEY = 'user_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  tone: 'gentle',
  saveHistory: true,
  privateMode: false,
  goal: 'reduce_overthinking',
  defaultFocusMinutes: 15,
};

export async function loadPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    PREFS_KEY,
  );
  if (!row) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(row.value) as Partial<UserPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    PREFS_KEY,
    JSON.stringify(prefs),
  );
}
