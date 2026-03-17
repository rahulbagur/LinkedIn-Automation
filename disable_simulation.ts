import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'linkedin_bot.db');
const db = new Database(dbPath);

db.prepare("UPDATE settings SET value = 'false' WHERE key = 'simulation_mode'").run();
console.log('Simulation mode disabled in DB.');

db.close();
