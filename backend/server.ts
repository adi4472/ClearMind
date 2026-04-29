import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const GEMINI_API_KEY = requireEnv('GEMINI_API_KEY');
const APP_SHARED_KEY = requireEnv('APP_SHARED_KEY');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const PORT = Number(process.env.PORT || 1234);

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();
app.use(express.json({ limit: '4kb' }));

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Casual abuse deterrent. The shared key ships in the Expo client so it is NOT
// a real secret — it only blocks drive-by scripts. Real per-user auth comes later.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.header('x-app-key') !== APP_SHARED_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

const TOOL_VALUES = ['focus_timer', 'break_it_down', 'mental_reset'] as const;
type Tool = (typeof TOOL_VALUES)[number] | null;

interface AnalyzeResponse {
  summary: string;
  pattern: string | null;
  next_step: string | null;
  tool: Tool;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    pattern: { type: Type.STRING, nullable: true },
    next_step: { type: Type.STRING, nullable: true },
    tool: {
      type: Type.STRING,
      nullable: true,
      enum: [...TOOL_VALUES],
    },
  },
  required: ['summary', 'pattern', 'next_step', 'tool'],
} as const;

const SYSTEM_INSTRUCTION = [
  'You are a cognitive hygiene coach inside a journaling app.',
  'A user shares one raw thought. Reply ONLY in the JSON schema you are given.',
  '',
  'First, decide whether the user wants to be heard or wants help acting:',
  '- REFLECTING mode: they are venting, processing feelings, or just naming what is. Acknowledge them in `summary`. Set `next_step` AND `tool` to null. Do not give advice they did not ask for.',
  '- SUGGESTING mode: they sound stuck, overwhelmed, or are asking for direction. Provide a concrete `next_step` and a `tool` if one fits.',
  '',
  'When in doubt — if the thought is mostly an emotion or observation rather than a problem to solve — choose REFLECTING.',
  '',
  'Fields:',
  '- summary: 1 sentence reflecting what they seem to be experiencing. Warm, non-judgmental.',
  '- pattern: a short label for the cognitive pattern (e.g. "Overwhelm", "Catastrophizing", "Task switching") or null if none is clear.',
  '- next_step: one concrete action they can take in the next 15 minutes — OR null in REFLECTING mode.',
  '- tool: one of focus_timer, break_it_down, mental_reset, or null. Pick focus_timer for scattered/overloaded, break_it_down for vague/big problems, mental_reset for emotional flooding. Use null in REFLECTING mode or when no tool fits.',
  '',
  'Never give medical advice. Never repeat the user\'s text back verbatim.',
].join('\n');

function isValidTool(value: unknown): value is Tool {
  return value === null || (typeof value === 'string' && (TOOL_VALUES as readonly string[]).includes(value));
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    msg.includes('"code":503') ||
    msg.includes('"code":429') ||
    msg.includes('"code":500') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('INTERNAL')
  );
}

interface ChatTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GenerateOptions {
  // Either a plain user prompt string, or a full multi-turn conversation.
  contents: string | ChatTurn[];
  systemInstruction: string;
  // The Gemini SDK's responseSchema accepts a structural object; we hand it through.
  responseSchema: object;
  temperature?: number;
}

async function generateJSON({ contents, systemInstruction, responseSchema, temperature = 0.6 }: GenerateOptions): Promise<string> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature,
        },
      });
      if (!result.text) {
        throw new Error('empty model response');
      }
      return result.text;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts - 1 || !isRetryableError(err)) break;
      const delayMs = 500 * 2 ** attempt + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

const BREAKDOWN_SYSTEM_INSTRUCTION = [
  'You are a cognitive hygiene coach helping someone break a vague or overwhelming task into small concrete steps.',
  'Given the user\'s thought (and optionally a suggested next step), produce 3 to 5 sub-steps.',
  'Each step must be:',
  '- a single concrete action, not a category',
  '- doable in 15 minutes or less',
  '- ordered so doing them in sequence makes sense',
  'Never include emojis, never include numbering in the text (the UI numbers them), never include medical or legal advice.',
].join('\n');

const breakdownSchema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: 3,
      maxItems: 5,
    },
  },
  required: ['steps'],
} as const;

interface BreakdownResponse {
  steps: string[];
}

const EXTRACT_SYSTEM_INSTRUCTION = [
  'You receive a free-form brain dump from a user planning their day.',
  'Extract each distinct task or to-do item as a single short line.',
  '',
  'Each line must be:',
  '- imperative (start with a verb when possible)',
  '- short — fits on one line',
  '- standalone (does not reference another task by position)',
  '- the task itself only — no commentary, no priorities, no times unless the user gave them',
  '',
  'Skip vague intents that are not actionable today. Skip emotional venting that is not a task.',
  'Never include emojis, never include numbering (the UI handles ordering).',
].join('\n');

const extractSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: 1,
      maxItems: 20,
    },
  },
  required: ['tasks'],
} as const;

interface ExtractResponse {
  tasks: string[];
}

function parseExtractResponse(raw: string): ExtractResponse {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.tasks) || parsed.tasks.length < 1 || parsed.tasks.length > 20) {
    throw new Error('Gemini extract response did not match schema');
  }
  if (!parsed.tasks.every((t: unknown) => typeof t === 'string' && t.trim().length > 0)) {
    throw new Error('Gemini extract contained empty task');
  }
  return { tasks: parsed.tasks as string[] };
}

const CHAT_SYSTEM_INSTRUCTION = [
  'You are a cognitive hygiene coach having a conversation with a user about their thoughts and feelings. This is multi-turn — you remember everything the user said earlier in this conversation.',
  '',
  'On each turn, you decide one of four intents:',
  '- "asking": ask one open, gentle question to understand more. Use this when info is sparse, ambiguous, or when the user has shared something emotional that deserves curiosity before advice.',
  '- "reflecting": warmly acknowledge what they\'ve shared. Use this when they\'re venting, processing, or just naming what is. No advice they did not ask for.',
  '- "offering_insight": once you understand enough AND the user seems to want direction, offer a structured insight (summary, optional pattern, optional next_step, optional tool).',
  '- "offering_breakdown": when the situation is large or vague and the user seems ready to act, offer 3-5 concrete sub-steps.',
  '',
  'Defaults: lean toward "asking" or "reflecting" early in a conversation. Move to "offering_insight" or "offering_breakdown" only when the user seems ready or asks for help.',
  '',
  'Always include "reply": the conversational message shown in the chat bubble. Keep it warm and brief — usually 1-3 sentences. End "asking" turns with a real question.',
  '',
  'For "asking" and "reflecting": set insight = null, steps = null. Just reply.',
  'For "offering_insight": fill insight. reply briefly introduces ("Here\'s what I\'m noticing..."). next_step and tool may be null if pure reflection. Tool is one of focus_timer (scattered), break_it_down (vague/big), mental_reset (flooded), or null.',
  'For "offering_breakdown": fill steps with 3-5 concrete actions doable in 15 minutes each. reply briefly introduces.',
  '',
  'Never give medical advice. Never repeat the user\'s text back verbatim. Never use emojis.',
].join('\n');

const CHAT_INTENTS = ['asking', 'reflecting', 'offering_insight', 'offering_breakdown'] as const;
type ChatIntent = (typeof CHAT_INTENTS)[number];

const chatSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    intent: { type: Type.STRING, enum: [...CHAT_INTENTS] },
    insight: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        summary: { type: Type.STRING },
        pattern: { type: Type.STRING, nullable: true },
        next_step: { type: Type.STRING, nullable: true },
        tool: { type: Type.STRING, nullable: true, enum: [...TOOL_VALUES] },
      },
      required: ['summary', 'pattern', 'next_step', 'tool'],
    },
    steps: {
      type: Type.ARRAY,
      nullable: true,
      items: { type: Type.STRING },
      minItems: 3,
      maxItems: 5,
    },
  },
  required: ['reply', 'intent', 'insight', 'steps'],
} as const;

interface ChatInsight {
  summary: string;
  pattern: string | null;
  next_step: string | null;
  tool: Tool;
}

interface ChatResponse {
  reply: string;
  intent: ChatIntent;
  insight: ChatInsight | null;
  steps: string[] | null;
}

function isValidIntent(value: unknown): value is ChatIntent {
  return typeof value === 'string' && (CHAT_INTENTS as readonly string[]).includes(value);
}

function parseChatResponse(raw: string): ChatResponse {
  const parsed = JSON.parse(raw);
  if (typeof parsed?.reply !== 'string' || !isValidIntent(parsed?.intent)) {
    throw new Error('Gemini chat response did not match schema');
  }

  let insight: ChatInsight | null = null;
  if (parsed.insight !== null) {
    const i = parsed.insight;
    if (
      typeof i?.summary !== 'string' ||
      !(i?.pattern === null || typeof i.pattern === 'string') ||
      !(i?.next_step === null || typeof i.next_step === 'string') ||
      !isValidTool(i?.tool)
    ) {
      throw new Error('Gemini chat insight did not match schema');
    }
    insight = i as ChatInsight;
  }

  let steps: string[] | null = null;
  if (parsed.steps !== null) {
    if (
      !Array.isArray(parsed.steps) ||
      parsed.steps.length < 3 ||
      parsed.steps.length > 5 ||
      !parsed.steps.every((s: unknown) => typeof s === 'string' && s.trim().length > 0)
    ) {
      throw new Error('Gemini chat steps did not match schema');
    }
    steps = parsed.steps as string[];
  }

  return { reply: parsed.reply, intent: parsed.intent, insight, steps };
}

function parseBreakdownResponse(raw: string): BreakdownResponse {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.steps) || parsed.steps.length < 3 || parsed.steps.length > 5) {
    throw new Error('Gemini breakdown response did not match schema');
  }
  if (!parsed.steps.every((s: unknown) => typeof s === 'string' && s.trim().length > 0)) {
    throw new Error('Gemini breakdown contained empty step');
  }
  return { steps: parsed.steps as string[] };
}

function parseAnalyzeResponse(raw: string): AnalyzeResponse {
  const parsed = JSON.parse(raw);
  if (
    typeof parsed?.summary !== 'string' ||
    !(parsed?.next_step === null || typeof parsed.next_step === 'string') ||
    !(parsed?.pattern === null || typeof parsed.pattern === 'string') ||
    !isValidTool(parsed?.tool)
  ) {
    throw new Error('Gemini response did not match schema');
  }
  return parsed as AnalyzeResponse;
}

app.post('/analyze-thought', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'text too long' });
  }

  try {
    const raw = await generateJSON({
      contents: text,
      systemInstruction: SYSTEM_INSTRUCTION,
      responseSchema,
    });
    const payload = parseAnalyzeResponse(raw);
    return res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('analyze-thought failed:', message);
    if (isRetryableError(err)) {
      return res.status(503).json({
        error: 'model_busy',
        message: 'AI service is temporarily overloaded. Please try again in a moment.',
      });
    }
    return res.status(502).json({ error: 'analysis_failed' });
  }
});

app.post('/breakdown', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const nextStep = typeof req.body?.next_step === 'string' ? req.body.next_step.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 2000 || nextStep.length > 500) {
    return res.status(400).json({ error: 'input too long' });
  }

  const contents = nextStep
    ? `User's thought:\n${text}\n\nSuggested next step (use as orientation, expand into a sequence):\n${nextStep}`
    : `User's thought:\n${text}`;

  try {
    const raw = await generateJSON({
      contents,
      systemInstruction: BREAKDOWN_SYSTEM_INSTRUCTION,
      responseSchema: breakdownSchema,
      temperature: 0.5,
    });
    const payload = parseBreakdownResponse(raw);
    return res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('breakdown failed:', message);
    if (isRetryableError(err)) {
      return res.status(503).json({
        error: 'model_busy',
        message: 'AI service is temporarily overloaded. Please try again in a moment.',
      });
    }
    return res.status(502).json({ error: 'breakdown_failed' });
  }
});

app.post('/extract-tasks', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 4000) {
    return res.status(400).json({ error: 'text too long' });
  }

  try {
    const raw = await generateJSON({
      contents: text,
      systemInstruction: EXTRACT_SYSTEM_INSTRUCTION,
      responseSchema: extractSchema,
      temperature: 0.3,
    });
    const payload = parseExtractResponse(raw);
    return res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('extract-tasks failed:', message);
    if (isRetryableError(err)) {
      return res.status(503).json({
        error: 'model_busy',
        message: 'AI service is temporarily overloaded. Please try again in a moment.',
      });
    }
    return res.status(502).json({ error: 'extract_failed' });
  }
});

app.post('/chat', async (req: Request, res: Response) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }
  if (messages.length > 40) {
    return res.status(400).json({ error: 'too many messages' });
  }

  // Validate + map to Gemini's contents format. Skip empty messages.
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (!m || typeof m.text !== 'string') continue;
    const text = m.text.trim();
    if (!text) continue;
    if (text.length > 2000) {
      return res.status(400).json({ error: 'message too long' });
    }
    if (m.role === 'user') {
      turns.push({ role: 'user', parts: [{ text }] });
    } else if (m.role === 'assistant') {
      turns.push({ role: 'model', parts: [{ text }] });
    }
  }
  if (turns.length === 0) {
    return res.status(400).json({ error: 'no valid messages' });
  }
  if (turns[turns.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'last message must be from user' });
  }

  try {
    const raw = await generateJSON({
      contents: turns,
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      responseSchema: chatSchema,
      temperature: 0.7,
    });
    const payload = parseChatResponse(raw);
    return res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('chat failed:', message);
    if (isRetryableError(err)) {
      return res.status(503).json({
        error: 'model_busy',
        message: 'AI service is temporarily overloaded. Please try again in a moment.',
      });
    }
    return res.status(502).json({ error: 'chat_failed' });
  }
});

app.get('/history', async (_req: Request, res: Response) => {
  res.json([
    {
      id: '1',
      summary: 'You felt scattered because too many priorities were competing.',
      pattern: 'Overwhelm',
      next_step: 'Define one task for the next 15 minutes.',
      tool: 'focus_timer',
      created_at: new Date().toISOString(),
    },
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
