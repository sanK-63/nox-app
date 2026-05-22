"""Generate demo SQLite database from timelineTestData.json"""
import sqlite3, os, json

json_path = os.path.join(os.path.dirname(__file__), 'timelineTestData.json')
db_path   = os.path.join(os.path.dirname(__file__), 'demo_tasks.db')

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

if os.path.exists(db_path):
    os.remove(db_path)

db = sqlite3.connect(db_path)
c = db.cursor()

c.executescript('''
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, is_completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'low',
    start_date TEXT, deadline TEXT, description TEXT,
    task_type TEXT DEFAULT 'quick', archived_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER, title TEXT, is_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER, filename TEXT, path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#8b5cf6'
  );
  CREATE TABLE task_tags (
    task_id INTEGER NOT NULL, tag_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
''')

# ─── Tags ───
tag_ids = {}
for t in data['tags']:
    c.execute('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
              (t['id'], t['name'], t['color']))
    tag_ids[t['name']] = t['id']

# ─── Tasks ───
sub_id = 1
next_task_id = max(t['id'] for t in data['tasks']) + 1

for task in data['tasks']:
    c.execute('''
      INSERT INTO tasks (id, title, is_completed, priority, start_date, deadline,
                         description, task_type, archived_at, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    ''', (
        task['id'], task['title'], 1 if task['is_completed'] else 0,
        task['priority'], task['start_date'], task['deadline'],
        task['description'], task['task_type'],
        task.get('archived_at'), task['created_at']
    ))

    for st in task.get('subtasks', []):
        c.execute('INSERT INTO subtasks (id, task_id, title, is_completed) VALUES (?,?,?,?)',
                  (sub_id, task['id'], st['title'], 1 if st['is_completed'] else 0))
        sub_id += 1

    for tag_name in task.get('tags', []):
        c.execute('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?,?)',
                  (task['id'], tag_ids[tag_name]))

# ─── Fix autoincrement seq ───
c.execute(f"UPDATE sqlite_sequence SET seq = {next_task_id} WHERE name = 'tasks'")
c.execute(f"UPDATE sqlite_sequence SET seq = {sub_id - 1} WHERE name = 'subtasks'")

db.commit()

counts = {}
for table in ['tasks', 'subtasks', 'tags', 'task_tags']:
    c.execute(f'SELECT COUNT(*) FROM {table}')
    counts[table] = c.fetchone()[0]

db.close()

print(f'Готово! Сгенерирована демо-БД: {db_path}')
print(f'  - {counts["tasks"]} задач, {counts["subtasks"]} подзадач')
print(f'  - {counts["tags"]} тегов, {counts["task_tags"]} связей')
print()
print('Чтобы использовать в приложении:')
print(f'  copy "{db_path}" "%APPDATA%\\my-tasks\\tasks.db"')
