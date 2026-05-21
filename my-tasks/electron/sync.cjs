const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { shell } = require('electron');

let oauth2Client;

function setupSyncHandlers(ipcMain, app, getDb, replaceDb) {
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  const db = getDb();
  if (db) {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'google_tokens'").get();
      if (row) {
        oauth2Client.setCredentials(JSON.parse(row.value));
      }
    } catch (e) {
      console.error('Failed to load Google tokens:', e);
    }
  }

  async function getDriveService() {
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

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
          const currentDb = getDb();
          if (currentDb) {
            currentDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('google_tokens', ?)").run(JSON.stringify(tokens));
          }
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
      const currentDb = getDb();
      if (!currentDb) throw new Error('Database not initialized');
      
      const backupPath = path.join(app.getPath('userData'), 'tasks_backup.db');
      await currentDb.backup(backupPath);

      const folderRow = currentDb.prepare("SELECT value FROM settings WHERE key = 'google_backup_folder'").get();
      const parentFolderId = folderRow ? folderRow.value : null;

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
        await drive.files.update({
          fileId: existingFile.id,
          media: {
            mimeType: 'application/x-sqlite3',
            body: fs.createReadStream(backupPath),
          },
        });
      } else {
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
      const currentDb = getDb();
      if (currentDb) {
        currentDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('google_backup_folder', ?)").run(folderId);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('nox:getSyncStatus', async () => {
    const currentDb = getDb();
    if (!currentDb) return { isAuthenticated: false, backupFolderId: null };

    const tokens = currentDb.prepare("SELECT value FROM settings WHERE key = 'google_tokens'").get();
    const folder = currentDb.prepare("SELECT value FROM settings WHERE key = 'google_backup_folder'").get();
    return { 
      isAuthenticated: !!tokens, 
      backupFolderId: folder ? folder.value : null 
    };
  });

  ipcMain.handle('nox:restore', async () => {
    try {
      const drive = await getDriveService();
      const currentDb = getDb();
      if (!currentDb) throw new Error('Database not initialized');

      const folderRow = currentDb.prepare("SELECT value FROM settings WHERE key = 'google_backup_folder'").get();
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

      const tempPath = path.join(app.getPath('userData'), 'tasks_download.db');

      const dest = fs.createWriteStream(tempPath);
      const res = await drive.files.get({ fileId: cloudFile.id, alt: 'media' }, { responseType: 'stream' });
      
      await new Promise((resolve, reject) => {
        res.data
          .on('end', resolve)
          .on('error', reject)
          .pipe(dest);
      });

      replaceDb(app, tempPath);
      
      return { success: true };
    } catch (e) {
      console.error('Restore error:', e);
      return { success: false, error: e.message };
    }
  });
}

module.exports = { setupSyncHandlers };
