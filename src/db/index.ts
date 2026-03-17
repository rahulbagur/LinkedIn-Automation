import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure db directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const db = new Database(path.join(dbDir, 'linkedin_bot.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initDb() {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Initialize default settings if not exists
  const defaultSettings = {
    daily_connect_limit: '20',
    daily_message_limit: '15',
    min_delay_seconds: '30',
    max_delay_seconds: '120',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    linkedin_cookie: '', // User must provide li_at
    linkedin_jsessionid: '', // User must provide JSESSIONID
    simulation_mode: 'true', // Default to true for safety/demo
    browser_path: '', // Optional: Path to Brave/Chrome executable
  };

  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insert.run(key, value);
  }

  // Leads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      linkedin_url TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      status TEXT DEFAULT 'NEW', -- NEW, CONNECT_QUEUED, CONNECT_SENT, CONNECTED, MSG_QUEUED, MSG_SENT, COMPLETED, FAILED
      notes TEXT,
      message TEXT, -- Personalized connection message
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_action_at DATETIME,
      next_action_at DATETIME
    )
  `);

  // Action Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT,
      action_type TEXT, -- CONNECT, MESSAGE, CHECK_STATUS
      status TEXT, -- SUCCESS, FAILED
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add message column if it doesn't exist
  const tableInfo = db.pragma('table_info(leads)') as any[];
  const hasMessage = tableInfo.some(col => col.name === 'message');
  if (!hasMessage) {
    console.log('[DB] Migration: Adding message column to leads table');
    db.exec('ALTER TABLE leads ADD COLUMN message TEXT');
  }
}

export default db;
