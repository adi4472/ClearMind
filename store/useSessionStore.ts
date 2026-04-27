import { create } from 'zustand';
import { AnalyzeThoughtResponse, SessionEntry } from '../types/session';

interface SessionState {
  currentResult: AnalyzeThoughtResponse | null;
  history: SessionEntry[];
  setCurrentResult: (result: AnalyzeThoughtResponse | null) => void;
  setHistory: (history: SessionEntry[]) => void;
  addHistoryItem: (item: SessionEntry) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentResult: null,
  history: [],
  setCurrentResult: (result) => set({ currentResult: result }),
  setHistory: (history) => set({ history }),
  addHistoryItem: (item) =>
    set((state) => ({ history: [item, ...state.history] })),
}));
