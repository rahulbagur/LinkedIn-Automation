import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'linkedin_bot.db');
const db = new Database(dbPath);

const leads = db.prepare("SELECT * FROM leads WHERE status IN ('NEW', 'CONNECT_QUEUED', 'MSG_QUEUED')").all();
console.log(`Found ${leads.length} leads with status 'NEW', 'CONNECT_QUEUED', or 'MSG_QUEUED'.`);

db.close();
