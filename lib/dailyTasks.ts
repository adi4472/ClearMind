import * as Crypto from 'expo-crypto';
import { decryptJSON, encryptJSON } from './crypto';
import { getDb } from './db';

export interface DailyTask {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD (local)
  created_at: string;
  completed_at: string | null;
}

interface DailyTaskRow {
  id: string;
  text_ct: string;
  text_nonce: string;
  date: string;
  created_at: string;
  completed_at: string | null;
}

export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function decryptRow(row: DailyTaskRow): Promise<DailyTask | null> {
  try {
    const wrapper = await decryptJSON<{ text: string }>({
      ct: row.text_ct,
      nonce: row.text_nonce,
    });
    return {
      id: row.id,
      text: wrapper.text,
      date: row.date,
      created_at: row.created_at,
      completed_at: row.completed_at,
    };
  } catch {
    return null;
  }
}

export async function addDailyTask(text: string, date: string = todayLocalDate()): Promise<DailyTask> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Task text is empty');
  const db = await getDb();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  const blob = await encryptJSON({ text: trimmed });
  await db.runAsync(
    'INSERT INTO daily_tasks (id, text_ct, text_nonce, date, created_at, completed_at) VALUES (?, ?, ?, ?, ?, NULL)',
    id,
    blob.ct,
    blob.nonce,
    date,
    created_at,
  );
  return { id, text: trimmed, date, created_at, completed_at: null };
}

export async function addManyDailyTasks(
  texts: string[],
  date: string = todayLocalDate(),
): Promise<DailyTask[]> {
  const results: DailyTask[] = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    results.push(await addDailyTask(trimmed, date));
  }
  return results;
}

export async function listDailyTasks(date: string = todayLocalDate()): Promise<DailyTask[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DailyTaskRow>(
    'SELECT * FROM daily_tasks WHERE date = ? ORDER BY created_at ASC',
    date,
  );
  const decrypted = await Promise.all(rows.map(decryptRow));
  return decrypted.filter((t): t is DailyTask => t !== null);
}

export async function toggleDailyTaskComplete(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ completed_at: string | null }>(
    'SELECT completed_at FROM daily_tasks WHERE id = ?',
    id,
  );
  if (!row) throw new Error('Task not found');
  if (row.completed_at) {
    await db.runAsync('UPDATE daily_tasks SET completed_at = NULL WHERE id = ?', id);
  } else {
    await db.runAsync(
      'UPDATE daily_tasks SET completed_at = ? WHERE id = ?',
      new Date().toISOString(),
      id,
    );
  }
}

export async function deleteDailyTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM daily_tasks WHERE id = ?', id);
}
