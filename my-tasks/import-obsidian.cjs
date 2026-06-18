const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.env.APPDATA, 'my-tasks', 'tasks.db');
const VAULT_PATH = path.join(__dirname, '..', 'Obsidian Vault');

const db = new Database(DB_PATH);

function getTitleFromFile(filePath, relativePath) {
  const basename = path.basename(filePath, '.md');
  if (basename.toLowerCase() === 'index') {
    const dir = path.dirname(relativePath);
    return dir === '.' ? 'Главная' : path.basename(dir);
  }
  return basename;
}

function getFolderTags(relativePath) {
  const dir = path.dirname(relativePath);
  if (dir === '.') return [];
  const parts = dir.split(path.sep);
  return parts;
}

function clearExistingData() {
  console.log('Clearing existing notes data...');
  db.exec('DELETE FROM note_tasks');
  db.exec('DELETE FROM note_tags');
  db.exec('DELETE FROM note_links');
  db.exec('DELETE FROM notes');
  db.exec('DELETE FROM notes_fts');
  console.log('Done.');
}

function parseAndInsertLinksAndTags(noteId, content) {
  const deleteOld = db.prepare('DELETE FROM note_links WHERE source_id = ?');
  const insertLink = db.prepare('INSERT OR REPLACE INTO note_links (source_id, target_id, target_title) VALUES (?, ?, ?)');
  const findNoteByTitle = db.prepare('SELECT id FROM notes WHERE title = ? COLLATE NOCASE');
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

    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const raw = match[1].trim();
      const title = raw.split('|')[0].trim();
      if (!title || seenLinks.has(title.toLowerCase())) continue;
      seenLinks.add(title.toLowerCase());
      const found = findNoteByTitle.get(title);
      insertLink.run(noteId, found ? found.id : null, found ? null : title);
    }

    while ((match = taskRegex.exec(content)) !== null) {
      const taskTitle = match[2].trim();
      if (!taskTitle || seenTasks.has(taskTitle.toLowerCase())) continue;
      seenTasks.add(taskTitle.toLowerCase());
    }

    while ((match = tagRegex.exec(content)) !== null) {
      const tag = match[1].toLowerCase();
      if (tag) insertTag.run(noteId, tag);
    }
  });
  transaction();
}

function importNotes() {
  console.log(`Scanning vault at: ${VAULT_PATH}`);
  
  const mdFiles = [];
  
  function walkDir(dir, relativePath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walkDir(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        mdFiles.push({ fullPath, relPath });
      }
    }
  }
  
  walkDir(VAULT_PATH, '');
  
  console.log(`Found ${mdFiles.length} .md files.`);
  
  const insertNote = db.prepare(
    'INSERT INTO notes (title, content) VALUES (?, ?)'
  );
  
  let imported = 0;
  let errors = 0;
  
  const transaction = db.transaction(() => {
    for (const { fullPath, relPath } of mdFiles) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const title = getTitleFromFile(fullPath, relPath);
        const folderTags = getFolderTags(relPath);
        
        const result = insertNote.run(title, content);
        const noteId = result.lastInsertRowid;
        
        for (const tag of folderTags) {
          db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)')
            .run(noteId, tag.toLowerCase());
        }
        
        parseAndInsertLinksAndTags(noteId, content);
        
        imported++;
        if (imported % 20 === 0) {
          console.log(`  Progress: ${imported}/${mdFiles.length}`);
        }
      } catch (err) {
        console.error(`  Error importing ${relPath}: ${err.message}`);
        errors++;
      }
    }
  });
  
  transaction();
  
  console.log(`\nImport complete: ${imported} notes imported, ${errors} errors.`);
  
  try {
    db.exec("INSERT INTO notes_fts(notes_fts) VALUES('rebuild')");
    console.log('FTS index rebuilt.');
  } catch(e) {
    console.log('FTS index rebuild skipped:', e.message);
  }
}

try {
  clearExistingData();
  importNotes();
} catch (err) {
  console.error('Fatal error:', err);
} finally {
  db.close();
}
