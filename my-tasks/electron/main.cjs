const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const url = require('url');
const { setupDatabaseHandlers, getDb, replaceDb } = require('./database.cjs');
const { setupSyncHandlers } = require('./sync.cjs');

const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env') 
  : path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

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
    title: "Nox",
    icon: path.join(__dirname, '../public/icon.png'),
    autoHideMenuBar: true
  });

  Menu.setApplicationMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.pop();
    handleUrl(url);
  });

  app.whenReady().then(() => {
    setupDatabaseHandlers(ipcMain, app);
    setupSyncHandlers(ipcMain, app, getDb, replaceDb);
    
    ipcMain.handle('select-file', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'All Files', extensions: ['*'] }]
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    });

    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
