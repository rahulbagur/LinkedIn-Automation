import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'linkedin_bot.db');
const db = new Database(dbPath);

console.log('--- Table Info: action_logs ---');
console.log(db.pragma('table_info(action_logs)'));

console.log('\n--- Foreign Key List: action_logs ---');
console.log(db.pragma('foreign_key_list(action_logs)'));

console.log('\n--- Table SQL: action_logs ---');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='action_logs'").get());

db.close();
