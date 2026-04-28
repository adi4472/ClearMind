import {
  AnalyzeThoughtRequest,
  AnalyzeThoughtResponse,
  BreakdownRequest,
  BreakdownResponse,
  SessionEntry,
} from '../types/session';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY;

if (!API_BASE_URL || !APP_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_APP_KEY. Copy .env.example to .env and restart Expo.',
  );
}

const baseHeaders = {
  'Content-Type': 'application/json',
  'x-app-key': APP_KEY,
};

export async function analyzeThought(payload: AnalyzeThoughtRequest): Promise<AnalyzeThoughtResponse> {
  const url = `${API_BASE_URL}/analyze-thought`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    throw new Error(`Network unreachable at ${url} (${detail})`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Backend returned ${response.status} from ${url}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

export async function requestBreakdown(payload: BreakdownRequest): Promise<BreakdownResponse> {
  const url = `${API_BASE_URL}/breakdown`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    throw new Error(`Network unreachable at ${url} (${detail})`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Backend returned ${response.status} from ${url}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

export async function fetchHistory(userId?: string): Promise<SessionEntry[]> {
  const url = userId
    ? `${API_BASE_URL}/history?userId=${encodeURIComponent(userId)}`
    : `${API_BASE_URL}/history`;

  const response = await fetch(url, { headers: baseHeaders });

  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }

  return response.json();
}
