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
  next_step: string;
  tool: Tool;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    pattern: { type: Type.STRING, nullable: true },
    next_step: { type: Type.STRING },
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
  'Fields:',
  '- summary: 1 sentence reflecting what they seem to be experiencing. Warm, non-judgmental.',
  '- pattern: a short label for the cognitive pattern (e.g. "Overwhelm", "Catastrophizing", "Task switching") or null if none is clear.',
  '- next_step: one concrete action they can take in the next 15 minutes.',
  '- tool: one of focus_timer, break_it_down, mental_reset, or null. Pick focus_timer for scattered/overloaded, break_it_down for vague/big problems, mental_reset for emotional flooding, null when no tool fits.',
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

interface GenerateOptions {
  contents: string;
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
    typeof parsed?.next_step !== 'string' ||
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
