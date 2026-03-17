import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

try {
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
  }

  const db = new Database(path.join(dbDir, 'test.db'));
  db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
  db.prepare('INSERT INTO test (name) VALUES (?)').run('test');
  const result = db.prepare('SELECT * FROM test').all();
  console.log('DB Test Successful:', result);
  db.close();
  fs.unlinkSync(path.join(dbDir, 'test.db'));
} catch (error) {
  console.error('DB Test Failed:', error);
  process.exit(1);
}
