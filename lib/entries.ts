import * as Crypto from 'expo-crypto';
import { decryptJSON, encryptJSON } from './crypto';
import { getDb } from './db';
import { ToolType } from '../types/session';

export type EntryType = 'thought' | 'manual_breakdown' | 'ai_breakdown';

export interface ThoughtPayload {
  text: string;
  summary: string;
  pattern: string | null;
  next_step: string;
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
  tags?: string[];
}

export type EntryPayload = ThoughtPayload | ManualBreakdownPayload | AIBreakdownPayload;

export interface EntryMeta {
  id: string;
  type: EntryType;
  created_at: string;
  pinned: boolean;
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
}

export async function saveEntry(type: EntryType, payload: EntryPayload): Promise<EntryMeta> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  const blob = await encryptJSON(payload);
  await db.runAsync(
    'INSERT INTO entries (id, type, created_at, pinned, payload_ct, payload_nonce) VALUES (?, ?, ?, 0, ?, ?)',
    id,
    type,
    created_at,
    blob.ct,
    blob.nonce,
  );
  return { id, type, created_at, pinned: false };
}

export async function listEntries(): Promise<EntryMeta[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Pick<EntryRow, 'id' | 'type' | 'created_at' | 'pinned'>>(
    'SELECT id, type, created_at, pinned FROM entries ORDER BY pinned DESC, created_at DESC',
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    created_at: r.created_at,
    pinned: r.pinned === 1,
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
