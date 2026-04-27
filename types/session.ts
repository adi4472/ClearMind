export type ToolType = 'focus_timer' | 'break_it_down' | 'mental_reset' | null;

export interface AnalyzeThoughtRequest {
  text: string;
  userId?: string;
}

export interface AnalyzeThoughtResponse {
  summary: string;
  pattern: string | null;
  next_step: string;
  tool: ToolType;
}

export interface SessionEntry extends AnalyzeThoughtResponse {
  id: string;
  raw_input?: string;
  created_at: string;
}
