import { create } from 'zustand';
import { UserPreferences } from '../types/user';

interface UserState {
  userId: string;
  preferences: UserPreferences;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: 'demo-user-1',
  preferences: {
    tone: 'gentle',
    saveHistory: true,
    privateMode: false,
    goal: 'reduce_overthinking',
  },
  updatePreferences: (preferences) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...preferences,
      },
    })),
}));
