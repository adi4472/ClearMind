export type ToolType = 'focus_timer' | 'break_it_down' | 'mental_reset' | null;

export interface AnalyzeThoughtRequest {
  text: string;
  userId?: string;
}

export interface AnalyzeThoughtResponse {
  summary: string;
  pattern: string | null;
  next_step: string | null;
  tool: ToolType;
}

export interface SessionEntry extends AnalyzeThoughtResponse {
  id: string;
  raw_input?: string;
  created_at: string;
}

export interface BreakdownRequest {
  text: string;
  next_step?: string;
}

export interface BreakdownResponse {
  steps: string[];
}

export interface ExtractTasksRequest {
  text: string;
}

export interface ExtractTasksResponse {
  tasks: string[];
}

export type ChatRole = 'user' | 'assistant';

export type ChatIntent = 'asking' | 'reflecting' | 'offering_insight' | 'offering_breakdown';

export interface ChatInsight {
  summary: string;
  pattern: string | null;
  next_step: string | null;
  tool: ToolType;
}

// Wire shape sent to the backend.
export interface ChatTurnRequest {
  role: ChatRole;
  text: string;
}

export interface ChatRequest {
  messages: ChatTurnRequest[];
}

export interface ChatResponse {
  reply: string;
  intent: ChatIntent;
  insight: ChatInsight | null;
  steps: string[] | null;
}

// Local stored shape — extends server response with id, role, and any actions
// the user has taken on it (e.g., dismissed an offer).
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  intent?: ChatIntent;
  insight?: ChatInsight | null;
  steps?: string[] | null;
  // Set when the user has consumed the offer attached to this message
  // (started focus, accepted breakdown, etc.) so we don't re-show the action.
  consumed?: boolean;
}
