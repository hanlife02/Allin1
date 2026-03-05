import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const DB_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DB_DIR, "allin1.sqlite")

declare global {
  var __allin1SqliteDb: DatabaseSync | undefined
}

function getDb(): DatabaseSync {
  if (globalThis.__allin1SqliteDb) return globalThis.__allin1SqliteDb

  mkdirSync(DB_DIR, { recursive: true })
  const db = new DatabaseSync(DB_PATH)
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_storage (
      storage_key TEXT PRIMARY KEY,
      storage_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  globalThis.__allin1SqliteDb = db
  return db
}

interface StorageRow {
  storage_value: string
}

export function getStorageValue(key: string): string | null {
  const row = getDb()
    .prepare("SELECT storage_value FROM app_storage WHERE storage_key = ?")
    .get(key) as StorageRow | undefined
  return row?.storage_value ?? null
}

export function setStorageValue(key: string, value: string): void {
  getDb()
    .prepare(`
      INSERT INTO app_storage (storage_key, storage_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(storage_key) DO UPDATE SET
        storage_value = excluded.storage_value,
        updated_at = excluded.updated_at
    `)
    .run(key, value, new Date().toISOString())
}

export function deleteStorageValue(key: string): void {
  getDb().prepare("DELETE FROM app_storage WHERE storage_key = ?").run(key)
}

