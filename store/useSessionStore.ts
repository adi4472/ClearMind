import { create } from 'zustand';
import { AnalyzeThoughtResponse, ChatMessage, SessionEntry } from '../types/session';

interface SessionState {
  currentInput: string | null;
  currentResult: AnalyzeThoughtResponse | null;
  messages: ChatMessage[];
  /** DB entry id of the conversation these messages belong to (null = unsaved/new). */
  currentConversationId: string | null;
  history: SessionEntry[];
  setCurrentInput: (text: string | null) => void;
  setCurrentResult: (result: AnalyzeThoughtResponse | null) => void;
  appendMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setCurrentConversationId: (id: string | null) => void;
  setHistory: (history: SessionEntry[]) => void;
  addHistoryItem: (item: SessionEntry) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentInput: null,
  currentResult: null,
  messages: [],
  currentConversationId: null,
  history: [],
  setCurrentInput: (text) => set({ currentInput: text }),
  setCurrentResult: (result) => set({ currentResult: result }),
  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], currentConversationId: null }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setHistory: (history) => set({ history }),
  addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
}));
