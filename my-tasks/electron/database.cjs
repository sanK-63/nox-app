const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { Notification } = require('electron');

let db;

function checkDeadlines() {
  if (!db) return;
  
  setInterval(() => {
    const now = new Date();
    const in15Min = new Date(now.getTime() + 15 * 60000).toISOString();
    
    try {
      const urgentTask = db.prepare(
        "SELECT * FROM tasks WHERE deadline <= ? AND deadline > ? AND is_completed = 0"
      ).get(in15Min, now.toISOString());

      if (urgentTask) {
        new Notification({
          title: 'Ближайший дедлайн',
          body: `Задача: ${urgentTask.title} начинается через 15 минут!`,
          silent: false,
        }).show();
      }
    } catch (e) {
      console.error('Deadline check error:', e);
    }
  }, 60000);
}

function initDb(app) {
  const dbPath = path.join(app.getPath('userData'), 'tasks.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      is_completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'low',
      start_date TEXT,
      deadline TEXT,
      description TEXT,
      task_type TEXT DEFAULT 'quick',
      archived_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      title TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
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
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#8b5cf6'
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  try { db.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN description TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'quick';"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN archived_at DATETIME;"); } catch(e) {}

  console.log('Database initialized:', dbPath);
  checkDeadlines();
  
  return dbPath;
}

function getDb() {
  return db;
}

function replaceDb(app, tempPath) {
  const dbPath = path.join(app.getPath('userData'), 'tasks.db');
  if (db) db.close();
  fs.copyFileSync(tempPath, dbPath);
  fs.unlinkSync(tempPath);
  db = new Database(dbPath);
}

function setupDatabaseHandlers(ipcMain, app) {
  initDb(app);

  ipcMain.handle('get-tasks', () => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY deadline ASC, created_at DESC').all();
    return tasks.map(task => {
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id);
      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN task_tags tt ON tt.tag_id = t.id
        WHERE tt.task_id = ?
      `).all(task.id);
      return { ...task, subtasks, tags };
    });
  });
  
  ipcMain.handle('add-task', (event, { title, priority, start_date, deadline, description, task_type, subtasks }) => {
    const info = db.prepare('INSERT INTO tasks (title, priority, start_date, deadline, description, task_type) VALUES (?, ?, ?, ?, ?, ?)')
      .run(title, priority, start_date || null, deadline || null, description || null, task_type || 'quick');
    
    const taskId = info.lastInsertRowid;
    if (subtasks && Array.isArray(subtasks)) {
      const insertSub = db.prepare('INSERT INTO subtasks (task_id, title, is_completed) VALUES (?, ?, ?)');
      subtasks.forEach(st => insertSub.run(taskId, st.title, st.is_completed || 0));
    }
    return { id: taskId };
  });
  
  ipcMain.handle('toggle-task', (event, { id, is_completed }) => {
    const status = is_completed ? 1 : 0;
    db.prepare('UPDATE tasks SET is_completed = ?, archived_at = ? WHERE id = ?')
      .run(status, status === 1 ? new Date().toISOString() : null, id);
    if (status === 1) {
      db.prepare('UPDATE subtasks SET is_completed = 1 WHERE task_id = ?').run(id);
    }
  });
  
  ipcMain.handle('delete-task', (event, id) => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  });

  ipcMain.handle('toggle-subtask', (event, { id, is_completed }) => {
    db.prepare('UPDATE subtasks SET is_completed = ? WHERE id = ?').run(is_completed ? 1 : 0, id);
    
    const st = db.prepare('SELECT task_id FROM subtasks WHERE id = ?').get(id);
    if (st) {
      const total = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ?').get(st.task_id).count;
      const completed = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ? AND is_completed = 1').get(st.task_id).count;
      
      if (total > 0) {
        if (total === completed) {
          db.prepare('UPDATE tasks SET is_completed = 1, archived_at = ? WHERE id = ?')
            .run(new Date().toISOString(), st.task_id);
        } else {
          db.prepare('UPDATE tasks SET is_completed = 0, archived_at = NULL WHERE id = ?').run(st.task_id);
        }
      }
    }
  });

  ipcMain.handle('add-subtask', (event, { task_id, title }) => {
    const res = db.prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)').run(task_id, title);
    db.prepare('UPDATE tasks SET is_completed = 0 WHERE id = ?').run(task_id);
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('delete-subtask', (event, id) => {
    const st = db.prepare('SELECT task_id FROM subtasks WHERE id = ?').get(id);
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    
    if (st) {
      const total = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ?').get(st.task_id).count;
      const completed = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ? AND is_completed = 1').get(st.task_id).count;
      
      if (total > 0) {
        if (total === completed) {
          db.prepare('UPDATE tasks SET is_completed = 1 WHERE id = ?').run(st.task_id);
        } else {
          db.prepare('UPDATE tasks SET is_completed = 0 WHERE id = ?').run(st.task_id);
        }
      }
    }
  });

  ipcMain.handle('get-theme', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'theme'").get();
    return row ? row.value : 'dark';
  });
  
  ipcMain.handle('set-theme', (event, theme) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)").run(theme);
  });

  ipcMain.handle('save-attachment', (event, { taskId, filePath }) => {
    const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    const filename = path.basename(filePath);
    const destPath = path.join(attachmentsDir, `${Date.now()}_${filename}`);
    fs.copyFileSync(filePath, destPath);
    const res = db.prepare('INSERT INTO attachments (task_id, filename, path) VALUES (?, ?, ?)').run(taskId, filename, destPath);
    return { id: res.lastInsertRowid, task_id: taskId, filename, path: destPath };
  });

  ipcMain.handle('get-attachments', (event, taskId) => {
    return db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(taskId);
  });

  // --- Tag handlers ---
  ipcMain.handle('get-tags', () => {
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  });

  ipcMain.handle('add-tag', (event, { name, color }) => {
    try {
      const res = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#8b5cf6');
      return { id: res.lastInsertRowid, name, color: color || '#8b5cf6' };
    } catch (e) {
      return { error: 'Tag already exists' };
    }
  });

  ipcMain.handle('delete-tag', (event, id) => {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  });

  ipcMain.handle('add-task-tag', (event, { task_id, tag_id }) => {
    try {
      db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(task_id, tag_id);
    } catch (e) {}
  });

  ipcMain.handle('remove-task-tag', (event, { task_id, tag_id }) => {
    db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(task_id, tag_id);
  });
}

module.exports = { setupDatabaseHandlers, getDb, replaceDb };
