import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'linkedin_bot.db');
const db = new Database(dbPath);

console.log('--- SETTINGS ---');
const settings = db.prepare('SELECT * FROM settings').all();
console.table(settings);

console.log('\n--- LEAD STATS ---');
const stats = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
console.table(stats);

console.log('\n--- RECENT ACTION LOGS ---');
const logs = db.prepare(`
  SELECT a.created_at, l.first_name, l.last_name, a.action_type, a.status, a.details
  FROM action_logs a
  LEFT JOIN leads l ON a.lead_id = l.id
  ORDER BY a.created_at DESC
  LIMIT 10
`).all();
console.table(logs);

db.close();
