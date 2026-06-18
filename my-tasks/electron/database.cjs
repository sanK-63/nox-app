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
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Без названия',
      content TEXT DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      color TEXT DEFAULT '#8b5cf6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS note_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER,
      target_title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(source_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(target_id) REFERENCES notes(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS note_tasks (
      note_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      PRIMARY KEY (note_id, task_id),
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_id);
    CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_id);
    CREATE INDEX IF NOT EXISTS idx_note_links_title ON note_links(target_title);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL,
      tag TEXT NOT NULL COLLATE NOCASE,
      PRIMARY KEY (note_id, tag),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag);

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

    -- Авто-резолв dead links при создании заметки
    CREATE TRIGGER IF NOT EXISTS resolve_dead_links AFTER INSERT ON notes
    BEGIN
      UPDATE note_links SET target_id = NEW.id
      WHERE target_title = NEW.title COLLATE NOCASE AND target_id IS NULL;
    END;

    -- Авто-резолв при обновлении заголовка заметки
    CREATE TRIGGER IF NOT EXISTS resolve_dead_links_on_update AFTER UPDATE OF title ON notes
    BEGIN
      UPDATE note_links SET target_id = NEW.id
      WHERE target_title = OLD.title COLLATE NOCASE AND target_id IS NULL;
    END;

    -- FTS5 для полнотекстового поиска
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title, content, content=notes, content_rowid=id
    );

    -- Триггеры синхронизации FTS
    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.id, NEW.title, NEW.content);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.id, OLD.title, OLD.content);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.id, OLD.title, OLD.content);
      INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.id, NEW.title, NEW.content);
    END;
  `);

  // rebuild FTS if table was just created
  try { db.exec("INSERT INTO notes_fts(notes_fts) VALUES('rebuild')"); } catch(e) {}

  try { db.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN description TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'quick';"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN archived_at DATETIME;"); } catch(e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN note_id INTEGER;"); } catch(e) {}
  try { db.exec("ALTER TABLE notes ADD COLUMN archived INTEGER DEFAULT 0;"); } catch(e) {}
  try { db.exec("ALTER TABLE notes ADD COLUMN encrypted INTEGER DEFAULT 0;"); } catch(e) {}
  try { db.exec("ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;"); } catch(e) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_note_id ON tasks(note_id);"); } catch(e) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);"); } catch(e) {}

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

function parseWikiLinks(sourceId, content) {
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  db.prepare('DELETE FROM note_links WHERE source_id = ?').run(sourceId);
  const insertLinked = db.prepare('INSERT INTO note_links (source_id, target_id) VALUES (?, ?)');
  const insertUnlinked = db.prepare('INSERT INTO note_links (source_id, target_title) VALUES (?, ?)');
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].trim();
    const title = raw.split('|')[0].trim();
    const target = db.prepare('SELECT id FROM notes WHERE title = ?').get(title);
    if (target) {
      insertLinked.run(sourceId, target.id);
    } else {
      insertUnlinked.run(sourceId, title);
    }
  }
}

function normalizeContent(str) {
  return (str || '').replace(/\r\n?/g, '\n').replace(/\0/g, '');
}

function parseNoteContent(db, noteId, content) {
  content = normalizeContent(content);
  const chunkSize = 20000;
  const deleteOld = db.prepare('DELETE FROM note_links WHERE source_id = ?');
  const insertLink = db.prepare(
    'INSERT OR REPLACE INTO note_links (source_id, target_id, target_title) VALUES (?, ?, ?)'
  );
  const findNoteByTitle = db.prepare('SELECT id FROM notes WHERE title = ? COLLATE NOCASE');
  const findTaskByNoteAndTitle = db.prepare('SELECT id FROM tasks WHERE note_id = ? AND title = ?');
  const createTask = db.prepare(
    'INSERT INTO tasks (title, note_id, description) VALUES (?, ?, ?)'
  );
  const updateTaskStatus = db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ?');
  const addNoteTask = db.prepare('INSERT OR IGNORE INTO note_tasks (note_id, task_id) VALUES (?, ?)');
  const deleteTags = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
  const insertTag = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)');

  const transaction = db.transaction(() => {
    deleteOld.run(noteId);
    deleteTags.run(noteId);

    const seenLinks = new Set();
    const seenTasks = new Set();
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const taskRegex = /^- \[([ x])\] (.+)$/gm;
    const tagRegex = /#(\w+)/g;

    for (let offset = 0; offset < content.length; offset += chunkSize) {
      const chunk = content.slice(offset, offset + chunkSize);
      let match;

      linkRegex.lastIndex = 0;
      while ((match = linkRegex.exec(chunk)) !== null) {
        const title = match[1].trim();
        if (!title || seenLinks.has(title.toLowerCase())) continue;
        seenLinks.add(title.toLowerCase());
        const found = findNoteByTitle.get(title);
        insertLink.run(noteId, found ? found.id : null, found ? null : title);
      }

      taskRegex.lastIndex = 0;
      while ((match = taskRegex.exec(chunk)) !== null) {
        const checked = match[1] === 'x' ? 1 : 0;
        const taskTitle = match[2].trim();
        if (!taskTitle || seenTasks.has(taskTitle.toLowerCase())) continue;
        seenTasks.add(taskTitle.toLowerCase());
        const existing = findTaskByNoteAndTitle.get(noteId, taskTitle);
        if (existing) {
          updateTaskStatus.run(checked, existing.id);
          addNoteTask.run(noteId, existing.id);
        } else {
          createTask.run(taskTitle, noteId, `Из заметки #${noteId}`);
          const inserted = db.prepare('SELECT id FROM tasks WHERE note_id = ? AND title = ?').get(noteId, taskTitle);
          if (inserted) {
            addNoteTask.run(noteId, inserted.id);
            if (checked) updateTaskStatus.run(1, inserted.id);
          }
        }
      }

      tagRegex.lastIndex = 0;
      while ((match = tagRegex.exec(chunk)) !== null) {
        const tag = match[1].toLowerCase();
        if (tag) insertTag.run(noteId, tag);
      }
    }
  });
  transaction();
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

  // --- Notes handlers ---
  ipcMain.handle('get-notes', () => {
    return db.prepare('SELECT id, title, is_pinned, color, folder_id, created_at, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC').all();
  });

  ipcMain.handle('get-note', (event, id) => {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!note) return null;
    const links = db.prepare(`
      SELECT nl.*, n.title AS linked_title FROM note_links nl
      LEFT JOIN notes n ON n.id = nl.target_id
      WHERE nl.source_id = ?
    `).all(id);
    const backlinks = db.prepare(`
      SELECT nl.*, n.title AS source_title, n.id AS source_note_id FROM note_links nl
      JOIN notes n ON n.id = nl.source_id
      WHERE nl.target_id = ? OR (nl.target_title = ? AND nl.target_id IS NULL)
    `).all(id, note.title);
    return { ...note, links, backlinks };
  });

  ipcMain.handle('add-note', (event, { title, content, color }) => {
    const info = db.prepare(
      'INSERT INTO notes (title, content, color, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(title || 'Без названия', content || '', color || '#8b5cf6');
    const noteId = info.lastInsertRowid;
    if (content) parseNoteContent(db, noteId, content);
    return { id: noteId };
  });

  ipcMain.handle('update-note', (event, { id, title, content, color, is_pinned }) => {
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); params.push(is_pinned ? 1 : 0); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    if (content !== undefined) parseNoteContent(db, id, content);
    return { id };
  });

  ipcMain.handle('delete-note', (event, id) => {
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  });

  ipcMain.handle('get-backlinks', (event, noteId) => {
    const note = db.prepare('SELECT title FROM notes WHERE id = ?').get(noteId);
    if (!note) return [];
    return db.prepare(`
      SELECT n.id, n.title, n.updated_at FROM notes n
      JOIN note_links nl ON nl.source_id = n.id
      WHERE nl.target_id = ? OR (nl.target_title = ? AND nl.target_id IS NULL)
      ORDER BY n.updated_at DESC
    `).all(noteId, note.title);
  });

  ipcMain.handle('add-note-task', (event, { note_id, task_id }) => {
    try {
      db.prepare('INSERT OR IGNORE INTO note_tasks (note_id, task_id) VALUES (?, ?)').run(note_id, task_id);
    } catch (e) {}
  });

  ipcMain.handle('remove-note-task', (event, { note_id, task_id }) => {
    db.prepare('DELETE FROM note_tasks WHERE note_id = ? AND task_id = ?').run(note_id, task_id);
  });

  ipcMain.handle('get-note-tasks', (event, noteId) => {
    return db.prepare(`
      SELECT t.* FROM tasks t
      JOIN note_tasks nt ON nt.task_id = t.id
      WHERE nt.note_id = ?
    `).all(noteId);
  });

  // ===== v2 API namespace (совместимость с preload) =====

  function noteLog(event, id, msg) {
    const line = `[notes:${id}] ${msg}`;
    console.log(line);
    try { event.sender.send('notes:log', line); } catch(e) {}
  }

  ipcMain.handle('notes:getAll', () => {
    const data = db.prepare('SELECT id, title, is_pinned, color, folder_id, created_at, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC').all();
    return data;
  });

  ipcMain.handle('notes:getById', (event, id) => {
    console.time(`notes:getById:${id}`);
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!note) return null;
    const links = db.prepare(`
      SELECT nl.*, n.title AS linked_title FROM note_links nl
      LEFT JOIN notes n ON n.id = nl.target_id
      WHERE nl.source_id = ?
    `).all(id);
    const backlinks = db.prepare(`
      SELECT nl.*, n.title AS source_title, n.id AS source_note_id FROM note_links nl
      JOIN notes n ON n.id = nl.source_id
      WHERE nl.target_id = ? OR (nl.target_title = ? AND nl.target_id IS NULL)
    `).all(id, note.title);
    console.timeEnd(`notes:getById:${id}`);
    return { ...note, links, backlinks };
  });

  ipcMain.handle('notes:save', (event, { id, title, content, expected_updated_at }) => {
    console.time(`notes:save:${id || 'new'}`);
    title = normalizeContent(title);
    content = normalizeContent(content);
    const now = new Date().toISOString();

    if (id) {
      noteLog(event, id, 'Updating note');
      if (expected_updated_at) {
        const current = db.prepare('SELECT updated_at FROM notes WHERE id = ?').get(id);
        if (current && current.updated_at !== expected_updated_at) {
          console.warn(`[CONFLICT] notes:${id} — local:${expected_updated_at}, db:${current.updated_at}`);
          return { conflict: true, serverNote: db.prepare('SELECT * FROM notes WHERE id = ?').get(id) };
        }
      }
      db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?')
        .run(title, content, now, id);
      noteLog(event, id, 'DB write complete');
    } else {
      const res = db.prepare('INSERT INTO notes (title, content, updated_at) VALUES (?, ?, ?)').run(title, content, now);
      id = res.lastInsertRowid;
      noteLog(event, id, 'Created new note');
    }
    noteLog(event, id, 'Parsing wiki-links, tasks, tags');
    parseNoteContent(db, id, content);
    noteLog(event, id, 'Parse complete');
    console.timeEnd(`notes:save:${id}`);
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  });

  ipcMain.handle('notes:delete', (event, id) => {
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  });

  ipcMain.handle('notes:searchByTitle', (event, title) => {
    if (!title) return [];
    return db.prepare(
      'SELECT * FROM notes WHERE title LIKE ? ORDER BY is_pinned DESC, updated_at DESC'
    ).all(`%${title}%`);
  });

  ipcMain.handle('notes:search', (event, query) => {
    if (!query || !query.trim()) return [];
    try {
      const fts = db.prepare(`
        SELECT n.* FROM notes n
        JOIN notes_fts fts ON fts.rowid = n.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `).all(query.trim());
      if (fts.length > 0) return fts;
    } catch (e) {
      // fallback на LIKE если FTS запрос некорректен
    }
    return db.prepare(
      'SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY is_pinned DESC, updated_at DESC LIMIT 50'
    ).all(`%${query}%`, `%${query}%`);
  });

  ipcMain.handle('notes:getBacklinks', (event, id) => {
    const note = db.prepare('SELECT title FROM notes WHERE id = ?').get(id);
    if (!note) return [];
    return db.prepare(`
      SELECT n.id, n.title, n.updated_at FROM notes n
      JOIN note_links nl ON nl.source_id = n.id
      WHERE nl.target_id = ? OR (nl.target_title = ? AND nl.target_id IS NULL)
      ORDER BY n.updated_at DESC
    `).all(id, note.title);
  });

  ipcMain.handle('notes:getLinkedTasks', (event, noteId) => {
    return db.prepare(`
      SELECT t.* FROM tasks t
      JOIN note_tasks nt ON nt.task_id = t.id
      WHERE nt.note_id = ?
    `).all(noteId);
  });

  // ===== Новые API =====

  ipcMain.handle('notes:getGraph', () => {
    console.time('notes:getGraph');
    const nodes = db.prepare('SELECT id, title FROM notes ORDER BY id').all();
    const edges = db.prepare(`
      SELECT DISTINCT source_id, target_id FROM note_links
      WHERE target_id IS NOT NULL AND source_id != target_id
    `).all();
    // Предупреждение при большом кол-ве связей
    if (edges.length > 500) {
      console.warn(`[notes:getGraph] Large graph: ${nodes.length} nodes, ${edges.length} edges`);
    }
    console.timeEnd('notes:getGraph');
    return { nodes, edges };
  });

  ipcMain.handle('notes:linkTask', (event, { noteId, taskId }) => {
    try {
      db.prepare('INSERT OR IGNORE INTO note_tasks (note_id, task_id) VALUES (?, ?)').run(noteId, taskId);
      return { linked: true };
    } catch (e) {
      return { linked: false, error: e.message };
    }
  });

  ipcMain.handle('notes:unlinkTask', (event, { noteId, taskId }) => {
    db.prepare('DELETE FROM note_tasks WHERE note_id = ? AND task_id = ?').run(noteId, taskId);
    return { unlinked: true };
  });

  ipcMain.handle('notes:togglePin', (event, id) => {
    const note = db.prepare('SELECT is_pinned FROM notes WHERE id = ?').get(id);
    if (!note) return null;
    const newVal = note.is_pinned ? 0 : 1;
    db.prepare('UPDATE notes SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newVal, id);
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  });

  ipcMain.handle('notes:batchDelete', (event, ids) => {
    if (!ids || !ids.length) return { deleted: 0 };
    const deleteStmt = db.prepare('DELETE FROM notes WHERE id = ?');
    const tx = db.transaction(() => {
      for (const id of ids) deleteStmt.run(id);
    });
    tx();
    return { deleted: ids.length };
  });

  ipcMain.handle('notes:getByTag', (event, tag) => {
    if (!tag) return [];
    return db.prepare(`
      SELECT n.* FROM notes n
      JOIN note_tags nt ON nt.note_id = n.id
      WHERE nt.tag = ? COLLATE NOCASE
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `).all(tag.toLowerCase());
  });

  ipcMain.handle('notes:duplicate', (event, id) => {
    const original = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!original) return null;
    const res = db.prepare(
      'INSERT INTO notes (title, content, color) VALUES (?, ?, ?)'
    ).run(`${original.title} (копия)`, original.content, original.color);
    const newId = res.lastInsertRowid;
    if (original.content) parseNoteContent(db, newId, original.content);
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(newId);
  });

  // ===== tasks API =====

  ipcMain.handle('tasks:create', (event, { title, priority, start_date, deadline, description, task_type }) => {
    const res = db.prepare(
      'INSERT INTO tasks (title, priority, start_date, deadline, description, task_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, priority || 'low', start_date || null, deadline || null, description || null, task_type || 'quick');
    return { id: res.lastInsertRowid };
  });

  ipcMain.handle('tasks:update', (event, { id, title, priority, start_date, deadline, description, task_type }) => {
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
    if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (task_type !== undefined) { updates.push('task_type = ?'); params.push(task_type); }
    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    return { id };
  });

  // ===== tags API =====

  ipcMain.handle('tags:list', () => {
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  });

  // ===== folders API =====

  ipcMain.handle('folders:list', () => {
    return db.prepare('SELECT * FROM folders ORDER BY name ASC').all();
  });

  ipcMain.handle('folders:create', (event, { name, parent_id }) => {
    const res = db.prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)').run(name, parent_id || null);
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(res.lastInsertRowid);
  });

  ipcMain.handle('folders:rename', (event, { id, name }) => {
    db.prepare('UPDATE folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, id);
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  });

  ipcMain.handle('folders:delete', (event, id) => {
    db.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ?').run(id);
    db.prepare('UPDATE folders SET parent_id = NULL WHERE parent_id = ?').run(id);
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    return { deleted: true };
  });

  ipcMain.handle('folders:moveNote', (event, { noteId, folderId }) => {
    db.prepare('UPDATE notes SET folder_id = ? WHERE id = ?').run(folderId || null, noteId);
    return { moved: true };
  });

  ipcMain.handle('folders:move', (event, { id, parent_id }) => {
    db.prepare('UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(parent_id || null, id);
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  });
}

module.exports = { setupDatabaseHandlers, getDb, replaceDb };
