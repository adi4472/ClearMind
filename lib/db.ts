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
      payload_nonce TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
    CREATE TABLE IF NOT EXISTS preferences (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
