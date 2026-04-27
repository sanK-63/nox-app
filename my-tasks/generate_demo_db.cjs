const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'demo_tasks.db');

// Delete if exists to start fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    is_completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'low',
    start_date TEXT,
    deadline TEXT,
    description TEXT,
    task_type TEXT DEFAULT 'quick',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    title TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const insertTask = db.prepare(`
  INSERT INTO tasks (title, is_completed, priority, deadline, description, task_type, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertSubtask = db.prepare(`
  INSERT INTO subtasks (task_id, title, is_completed)
  VALUES (?, ?, ?)
`);

const now = new Date();
const tomorrow = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString(); // 18 hours from now

// 1. Quick Task (Done)
insertTask.run('Купить кофе', 1, 'low', null, 'Зерновой, сильная обжарка', 'quick', now.toISOString());

// 2. Quick Task (Urgent)
insertTask.run('Сдать отчет по Nox', 0, 'high', tomorrow, 'Подготовить финальную презентацию UI рефакторинга', 'quick', now.toISOString());

// 3. Project 0%
const project0 = insertTask.run('Дизайн мобильной версии', 0, 'medium', null, 'Создать макеты в Figma', 'project', now.toISOString());
insertSubtask.run(project0.lastInsertRowid, 'Сетка 8dp', 0);
insertSubtask.run(project0.lastInsertRowid, 'Цветовая палитра', 0);
insertSubtask.run(project0.lastInsertRowid, 'Иконки', 0);

// 4. Project 50%
const project50 = insertTask.run('Рефакторинг API', 0, 'high', null, 'Оптимизация запросов к базе', 'project', now.toISOString());
insertSubtask.run(project50.lastInsertRowid, 'Миграция таблиц', 1);
insertSubtask.run(project50.lastInsertRowid, 'Тестирование хендлеров', 0);

// 5. Project 100%
const project100 = insertTask.run('Подготовка к релизу', 0, 'medium', null, 'Чек-лист перед запуском', 'project', now.toISOString());
insertSubtask.run(project100.lastInsertRowid, 'Сборка билда', 1);
insertSubtask.run(project100.lastInsertRowid, 'Проверка локализации', 1);

console.log('Demo database generated at:', dbPath);
db.close();
