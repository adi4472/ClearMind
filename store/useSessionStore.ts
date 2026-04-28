import { create } from 'zustand';
import { AnalyzeThoughtResponse, SessionEntry } from '../types/session';

interface SessionState {
  currentInput: string | null;
  currentResult: AnalyzeThoughtResponse | null;
  history: SessionEntry[];
  setCurrentInput: (text: string | null) => void;
  setCurrentResult: (result: AnalyzeThoughtResponse | null) => void;
  setHistory: (history: SessionEntry[]) => void;
  addHistoryItem: (item: SessionEntry) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentInput: null,
  currentResult: null,
  history: [],
  setCurrentInput: (text) => set({ currentInput: text }),
  setCurrentResult: (result) => set({ currentResult: result }),
  setHistory: (history) => set({ history }),
  addHistoryItem: (item) =>
    set((state) => ({ history: [item, ...state.history] })),
}));
