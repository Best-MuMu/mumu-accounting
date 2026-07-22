// Electron main process
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 360,
    minHeight: 600,
    title: '暮暮记账本',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Hide menu bar on Windows/Linux
    autoHideMenuBar: true,
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---- IPC Handlers (bridge renderer ↔ database) ----

function setupIPC() {
  // Expenses
  ipcMain.handle('db:addExpense', (_event, data) => {
    return db.addExpense(data);
  });

  ipcMain.handle('db:getExpenses', (_event, query) => {
    return db.getExpenses(query);
  });

  ipcMain.handle('db:updateExpense', (_event, id, data) => {
    db.updateExpense(id, data);
  });

  ipcMain.handle('db:deleteExpense', (_event, id) => {
    db.deleteExpense(id);
  });

  // Categories
  ipcMain.handle('db:getCategories', () => {
    return db.getCategories();
  });

  ipcMain.handle('db:addCustomCategory', (_event, l1, l2) => {
    return db.addCustomCategory(l1, l2);
  });

  // Stats
  ipcMain.handle('db:getMonthlyStats', (_event, year, month) => {
    return db.getMonthlyStats(year, month);
  });
}

// ---- App Lifecycle ----

app.whenReady().then(async () => {
  await db.initDatabase(app);
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  db.closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  db.closeDatabase();
});
