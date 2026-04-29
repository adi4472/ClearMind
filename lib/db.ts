import * as SQLite from 'expo-sqlite';

const DB_NAME = 'clearmind.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS entries (
      id            TEXT PRIMARY KEY,
      type          TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      pinned        INTEGER NOT NULL DEFAULT 0,
      payload_ct    TEXT NOT NULL,
      payload_nonce TEXT NOT NULL,
      completed_at  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
    CREATE TABLE IF NOT EXISTS preferences (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id           TEXT PRIMARY KEY,
      text_ct      TEXT NOT NULL,
      text_nonce   TEXT NOT NULL,
      date         TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks(date, created_at);
  `);

  // Older installs created entries without completed_at — add it and backfill
  // (treating legacy entries as already complete so they don't block new tasks).
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(entries)');
  if (!cols.some((c) => c.name === 'completed_at')) {
    await db.execAsync(`
      ALTER TABLE entries ADD COLUMN completed_at TEXT;
      UPDATE entries SET completed_at = created_at WHERE completed_at IS NULL;
    `);
  }
}
