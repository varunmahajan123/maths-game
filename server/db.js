import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'galti.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_emoji TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    topic TEXT,
    difficulty INTEGER,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    score INTEGER NOT NULL,
    best_streak INTEGER NOT NULL,
    rounds_played INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS daily_results (
    player_id TEXT NOT NULL,
    date TEXT NOT NULL,
    caught INTEGER NOT NULL,
    diagnosed INTEGER NOT NULL DEFAULT 0,
    time_ms INTEGER NOT NULL,
    score INTEGER,
    PRIMARY KEY (player_id, date)
  );
  CREATE TABLE IF NOT EXISTS duels (
    code TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    problem_ids TEXT NOT NULL,
    creator_results TEXT NOT NULL DEFAULT '[]',
    opponent_id TEXT,
    opponent_results TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Problems live as JSON in /content/problems/*.json, loaded into SQLite on boot.
export function loadProblems() {
  const dir = path.join(__dirname, '..', 'content', 'problems');
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO problems (id, topic, difficulty, json) VALUES (?, ?, ?, ?)'
  );
  let count = 0;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const p of Array.isArray(parsed) ? parsed : [parsed]) {
      upsert.run(p.id, p.topic, p.difficulty, JSON.stringify(p));
      count++;
    }
  }
  return count;
}

export function allProblemIds() {
  return db
    .prepare('SELECT id FROM problems ORDER BY id')
    .all()
    .map((r) => r.id);
}

export function getProblem(id) {
  const row = db.prepare('SELECT json FROM problems WHERE id = ?').get(id);
  return row ? JSON.parse(row.json) : null;
}

export function getPlayer(id) {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
}
