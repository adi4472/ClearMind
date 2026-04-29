import * as Crypto from 'expo-crypto';
import { decryptJSON, encryptJSON } from './crypto';
import { getDb } from './db';
import { ChatMessage, ToolType } from '../types/session';

export type EntryType = 'thought' | 'manual_breakdown' | 'ai_breakdown' | 'conversation';

export interface ThoughtPayload {
  text: string;
  summary: string;
  pattern: string | null;
  next_step: string | null;
  tool: ToolType;
  tags?: string[];
}

export interface ManualBreakdownPayload {
  problem: string;
  step: string;
  ignore: string;
  tags?: string[];
}

export interface AIBreakdownPayload {
  source_text: string;
  steps: string[];
  /** Indices of `steps` the user has marked complete or skipped. */
  completedSteps?: number[];
  tags?: string[];
}

export interface ConversationPayload {
  messages: ChatMessage[];
  /** Derived from the first user message at creation time. */
  title: string;
  tags?: string[];
}

export type EntryPayload =
  | ThoughtPayload
  | ManualBreakdownPayload
  | AIBreakdownPayload
  | ConversationPayload;

export interface EntryMeta {
  id: string;
  type: EntryType;
  created_at: string;
  pinned: boolean;
  completed_at: string | null;
}

export interface FullEntry<T extends EntryPayload = EntryPayload> extends EntryMeta {
  payload: T;
}

interface EntryRow {
  id: string;
  type: EntryType;
  created_at: string;
  pinned: number;
  payload_ct: string;
  payload_nonce: string;
  completed_at: string | null;
}

export async function saveEntry(type: EntryType, payload: EntryPayload): Promise<EntryMeta> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  const blob = await encryptJSON(payload);
  await db.runAsync(
    'INSERT INTO entries (id, type, created_at, pinned, payload_ct, payload_nonce, completed_at) VALUES (?, ?, ?, 0, ?, ?, NULL)',
    id,
    type,
    created_at,
    blob.ct,
    blob.nonce,
  );
  return { id, type, created_at, pinned: false, completed_at: null };
}

export async function listEntries(): Promise<EntryMeta[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<
    Pick<EntryRow, 'id' | 'type' | 'created_at' | 'pinned' | 'completed_at'>
  >(
    'SELECT id, type, created_at, pinned, completed_at FROM entries ORDER BY pinned DESC, created_at DESC',
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    created_at: r.created_at,
    pinned: r.pinned === 1,
    completed_at: r.completed_at,
  }));
}

export async function getEntry<T extends EntryPayload = EntryPayload>(
  id: string,
): Promise<FullEntry<T> | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  if (!row) return null;
  const payload = await decryptJSON<T>({ ct: row.payload_ct, nonce: row.payload_nonce });
  return {
    id: row.id,
    type: row.type,
    created_at: row.created_at,
    pinned: row.pinned === 1,
    completed_at: row.completed_at,
    payload,
  };
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function togglePin(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE entries SET pinned = 1 - pinned WHERE id = ?', id);
}

export async function clearAllEntries(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries');
  await db.execAsync('VACUUM');
}

// Decrypts every entry. Used when we need full payloads (e.g. to render tag pills
// or filter by tag). At expected scale (hundreds of entries) this is cheap;
// if it ever isn't, add a plaintext tag column with care for privacy tradeoffs.
export async function listFullEntries(): Promise<FullEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY pinned DESC, created_at DESC',
  );
  const decrypted = await Promise.all(
    rows.map(async (r): Promise<FullEntry | null> => {
      try {
        const payload = await decryptJSON<EntryPayload>({
          ct: r.payload_ct,
          nonce: r.payload_nonce,
        });
        return {
          id: r.id,
          type: r.type,
          created_at: r.created_at,
          pinned: r.pinned === 1,
          completed_at: r.completed_at,
          payload,
        };
      } catch {
        // Undecryptable entries (e.g. key rotated) shouldn't crash the list.
        return null;
      }
    }),
  );
  return decrypted.filter((e): e is FullEntry => e !== null);
}

export async function updateEntryTags(id: string, tags: string[]): Promise<void> {
  const db = await getDb();
  const existing = await getEntry(id);
  if (!existing) throw new Error('Entry not found');
  const updated: EntryPayload = { ...existing.payload, tags };
  const blob = await encryptJSON(updated);
  await db.runAsync(
    'UPDATE entries SET payload_ct = ?, payload_nonce = ? WHERE id = ?',
    blob.ct,
    blob.nonce,
    id,
  );
}

// Returns the most recent uncompleted manual_breakdown or ai_breakdown, or null.
// Thoughts are never tasks.
export async function getActiveTask(): Promise<FullEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE completed_at IS NULL
       AND type IN ('manual_breakdown', 'ai_breakdown')
     ORDER BY created_at DESC
     LIMIT 1`,
  );
  if (!row) return null;
  try {
    const payload = await decryptJSON<EntryPayload>({
      ct: row.payload_ct,
      nonce: row.payload_nonce,
    });
    return {
      id: row.id,
      type: row.type,
      created_at: row.created_at,
      pinned: row.pinned === 1,
      completed_at: row.completed_at,
      payload,
    };
  } catch {
    return null;
  }
}

export async function markEntryComplete(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE entries SET completed_at = ? WHERE id = ?',
    new Date().toISOString(),
    id,
  );
}

export async function updateConversationMessages(
  id: string,
  messages: ChatMessage[],
): Promise<void> {
  const db = await getDb();
  const existing = await getEntry<ConversationPayload>(id);
  if (!existing) throw new Error('Conversation not found');
  if (existing.type !== 'conversation') throw new Error('Not a conversation');
  const updated: ConversationPayload = { ...existing.payload, messages };
  const blob = await encryptJSON(updated);
  await db.runAsync(
    'UPDATE entries SET payload_ct = ?, payload_nonce = ? WHERE id = ?',
    blob.ct,
    blob.nonce,
    id,
  );
}

// Builds a short, meaningful preview for any entry type. Used in the history
// list so users can identify which conversation is which without opening it.
export function deriveEntryTitle(entry: { type: EntryType; payload: EntryPayload }): string {
  const max = 70;
  const truncate = (s: string) => (s.length > max ? `${s.slice(0, max).trimEnd()}…` : s);
  switch (entry.type) {
    case 'conversation': {
      const p = entry.payload as ConversationPayload;
      if (p.title?.trim()) return truncate(p.title.trim());
      const firstUser = p.messages.find((m) => m.role === 'user');
      return firstUser ? truncate(firstUser.text.trim()) : 'Conversation';
    }
    case 'thought':
      return truncate((entry.payload as ThoughtPayload).text.trim());
    case 'manual_breakdown':
      return truncate((entry.payload as ManualBreakdownPayload).problem.trim());
    case 'ai_breakdown':
      return truncate((entry.payload as AIBreakdownPayload).source_text.trim());
    default:
      return 'Entry';
  }
}

// Marks one step of an ai_breakdown as completed (or skipped — same effect).
// When all steps are accounted for, the entry's completed_at is also set.
export async function markAIBreakdownStepComplete(id: string, stepIndex: number): Promise<void> {
  const db = await getDb();
  const existing = await getEntry<AIBreakdownPayload>(id);
  if (!existing) throw new Error('Entry not found');
  if (existing.type !== 'ai_breakdown') throw new Error('Not an AI breakdown');

  const completed = new Set(existing.payload.completedSteps ?? []);
  completed.add(stepIndex);
  const updated: AIBreakdownPayload = {
    ...existing.payload,
    completedSteps: Array.from(completed).sort((a, b) => a - b),
  };
  const blob = await encryptJSON(updated);
  const allDone = updated.completedSteps!.length >= existing.payload.steps.length;

  if (allDone) {
    await db.runAsync(
      'UPDATE entries SET payload_ct = ?, payload_nonce = ?, completed_at = ? WHERE id = ?',
      blob.ct,
      blob.nonce,
      new Date().toISOString(),
      id,
    );
  } else {
    await db.runAsync(
      'UPDATE entries SET payload_ct = ?, payload_nonce = ? WHERE id = ?',
      blob.ct,
      blob.nonce,
      id,
    );
  }
}
