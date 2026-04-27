import { AnalyzeThoughtRequest, AnalyzeThoughtResponse, SessionEntry } from '../types/session';

const API_BASE_URL = 'http://localhost:1234';

export async function analyzeThought(payload: AnalyzeThoughtRequest): Promise<AnalyzeThoughtResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze-thought`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze thought');
  }

  return response.json();
}

export async function fetchHistory(userId?: string): Promise<SessionEntry[]> {
  const url = userId
    ? `${API_BASE_URL}/history?userId=${encodeURIComponent(userId)}`
    : `${API_BASE_URL}/history`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }

  return response.json();
}
