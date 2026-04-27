const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
require('dotenv').config();

// --- Deep Linking Setup ---
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('nox', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('nox');
}

const gotTheLock = app.requestSingleInstanceLock();
let mainWindow;

function handleUrl(urlStr) {
  if (!urlStr) return;
  try {
    const parsedUrl = new url.URL(urlStr);
    if (parsedUrl.protocol === 'nox:' && parsedUrl.hostname === 'auth') {
      const code = parsedUrl.searchParams.get('code');
      if (code && global.authResolve) {
        global.authResolve(code);
      }
    }
  } catch (e) {
    console.error('Failed to parse deep link:', e);
  }
}

let db;
let oauth2Client;

function initOAuth() {
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  // Load tokens from DB if they exist
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'google_tokens'").get();
    if (row) {
      oauth2Client.setCredentials(JSON.parse(row.value));
    }
  } catch (e) {}
}

async function getDriveService() {
  return google.drive({ version: 'v3', auth: oauth2Client });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0a0a0a',
    title: "Task Manager"
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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
    } catch (e) {}
  }, 60000);
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Handle the protocol URL from the second instance command line
    const url = commandLine.pop();
    handleUrl(url);
  });

  app.whenReady().then(() => {
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
    `);
  
    // Migration for older versions
    try { db.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT;"); } catch(e) {}
    try { db.exec("ALTER TABLE tasks ADD COLUMN description TEXT;"); } catch(e) {}
    try { db.exec("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'quick';"); } catch(e) {}
  
  console.log('Database initialized:', dbPath);

  checkDeadlines();

    ipcMain.handle('get-tasks', () => {
      const tasks = db.prepare('SELECT * FROM tasks ORDER BY deadline ASC, created_at DESC').all();
      return tasks.map(task => {
        const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id);
        return { ...task, subtasks };
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
      db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ?').run(is_completed ? 1 : 0, id);
    });
    
    ipcMain.handle('delete-task', (event, id) => {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    });

    ipcMain.handle('toggle-subtask', (event, { id, is_completed }) => {
      db.prepare('UPDATE subtasks SET is_completed = ? WHERE id = ?').run(is_completed ? 1 : 0, id);
    });

    ipcMain.handle('add-subtask', (event, { task_id, title }) => {
      const res = db.prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)').run(task_id, title);
      return { id: res.lastInsertRowid };
    });

    ipcMain.handle('delete-subtask', (event, id) => {
      db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    });

  ipcMain.handle('get-theme', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'theme'").get();
    return row ? row.value : 'dark';
  });
  
  ipcMain.handle('set-theme', (event, theme) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)").run(theme);
  });

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
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

  // --- Google Drive Sync ---
  initOAuth();

  ipcMain.handle('nox:auth', async () => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });

    shell.openExternal(authUrl);

    return new Promise((resolve, reject) => {
      global.authResolve = async (code) => {
        try {
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('google_tokens', ?)").run(JSON.stringify(tokens));
          resolve({ success: true });
          delete global.authResolve;
        } catch (e) {
          reject(e);
        }
      };

      const server = http.createServer(async (req, res) => {
        try {
          const parsedUrl = new url.URL(req.url, 'http://127.0.0.1:3000');
          const code = parsedUrl.searchParams.get('code');

          if (code) {
            console.log('OAuth code received from browser');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Авторизация успешна!</h1><p>Теперь вы можете закрыть эту вкладку и вернуться в приложение Nox.</p>');
            server.close();

            if (global.authResolve) {
              global.authResolve(code);
            }
          } else {
            res.writeHead(404);
            res.end('Code not found');
          }
        } catch (e) {
          console.error('Local server error:', e);
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      }).listen(3000, '127.0.0.1', () => {
        console.log('Local auth server listening on http://127.0.0.1:3000...');
      });
    });
  });
  ipcMain.handle('nox:sync', async () => {
    try {
      const drive = await getDriveService();
      const dbPath = path.join(app.getPath('userData'), 'tasks.db');
      const backupPath = path.join(app.getPath('userData'), 'tasks_backup.db');
      
      // 1. Create backup
      await db.backup(backupPath);

      // 2. Get target folder ID from settings
      const folderRow = db.prepare("SELECT value FROM settings WHERE key = 'google_backup_folder'").get();
      const parentFolderId = folderRow ? folderRow.value : null;

      // 3. Search for existing file on Drive
      const query = parentFolderId 
        ? `name = 'nox_backup.db' and '${parentFolderId}' in parents and trashed = false`
        : "name = 'nox_backup.db' and trashed = false";

      const response = await drive.files.list({
        q: query,
        fields: 'files(id, modifiedTime)',
        spaces: 'drive',
      });

      const existingFile = response.data.files[0];

      if (existingFile) {
        // Update
        await drive.files.update({
          fileId: existingFile.id,
          media: {
            mimeType: 'application/x-sqlite3',
            body: fs.createReadStream(backupPath),
          },
        });
      } else {
        // Create
        const fileMetadata = {
          name: 'nox_backup.db',
          mimeType: 'application/x-sqlite3',
        };
        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
        }

        await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: 'application/x-sqlite3',
            body: fs.createReadStream(backupPath),
          },
        });
      }

      return { success: true, lastSync: new Date().toISOString() };
    } catch (e) {
      console.error('Sync error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('nox:listFolders', async () => {
    try {
      const drive = await getDriveService();
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      return { success: true, folders: response.data.files };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('nox:setBackupFolder', async (event, folderId) => {
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('google_backup_folder', ?)").run(folderId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('nox:getSyncStatus', async () => {
    const tokens = db.prepare("SELECT value FROM settings WHERE key = 'google_tokens'").get();
    const folder = db.prepare("SELECT value FROM settings WHERE key = 'google_backup_folder'").get();
    return { 
      isAuthenticated: !!tokens, 
      backupFolderId: folder ? folder.value : null 
    };
  });

  ipcMain.handle('nox:restore', async () => {
    try {
      const drive = await getDriveService();
      const folderRow = db.prepare("SELECT value FROM settings WHERE key = 'google_backup_folder'").get();
      const parentFolderId = folderRow ? folderRow.value : null;

      const query = parentFolderId 
        ? `name = 'nox_backup.db' and '${parentFolderId}' in parents and trashed = false`
        : "name = 'nox_backup.db' and trashed = false";

      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive',
      });

      const cloudFile = response.data.files[0];
      if (!cloudFile) return { success: false, error: 'Backup not found in cloud' };

      const dbPath = path.join(app.getPath('userData'), 'tasks.db');
      const tempPath = path.join(app.getPath('userData'), 'tasks_download.db');

      const dest = fs.createWriteStream(tempPath);
      const res = await drive.files.get({ fileId: cloudFile.id, alt: 'media' }, { responseType: 'stream' });
      
      await new Promise((resolve, reject) => {
        res.data
          .on('end', resolve)
          .on('error', reject)
          .pipe(dest);
      });

      // Close DB before replacement
      db.close();
      
      // Replace
      fs.copyFileSync(tempPath, dbPath);
      fs.unlinkSync(tempPath);

      // Re-init DB
      db = new Database(dbPath);
      
      return { success: true };
    } catch (e) {
      console.error('Restore error:', e);
      return { success: false, error: e.message };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
}
