import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'linkedin_bot.db');
const db = new Database(dbPath);

db.prepare("UPDATE leads SET status = 'NEW' WHERE status IN ('CONNECT_SENT', 'FAILED')").run();
console.log('Leads reset to NEW status.');

db.close();
