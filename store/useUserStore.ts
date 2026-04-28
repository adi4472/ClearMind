import { create } from 'zustand';
import { UserPreferences } from '../types/user';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '../lib/preferences';

interface UserState {
  userId: string;
  preferences: UserPreferences;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userId: 'demo-user-1',
  preferences: DEFAULT_PREFERENCES,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const loaded = await loadPreferences();
    set({ preferences: loaded, hydrated: true });
  },
  updatePreferences: (preferences) => {
    set((state) => {
      const merged = { ...state.preferences, ...preferences };
      savePreferences(merged).catch((err) =>
        console.warn('savePreferences failed:', err instanceof Error ? err.message : err),
      );
      return { preferences: merged };
    });
  },
}));
