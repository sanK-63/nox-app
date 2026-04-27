const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'test_backup.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    is_completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'low',
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    filename TEXT,
    path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

const insertTask = db.prepare('INSERT INTO tasks (title, priority, deadline) VALUES (?, ?, ?)');
insertTask.run('🚀 Задача из облака #1', 'high', '2026-05-01T12:00');
insertTask.run('✅ Восстановление работает!', 'medium', '2026-05-02T15:30');
insertTask.run('☁️ Этот файл был скачан с Google Drive', 'low', null);

db.close();
console.log('Test database created at:', dbPath);
