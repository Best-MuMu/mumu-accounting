// Preload script — exposes safe APIs to the renderer process via contextBridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mumuAPI', {
  // Expense CRUD
  addExpense: (data) => ipcRenderer.invoke('db:addExpense', data),
  getExpenses: (query) => ipcRenderer.invoke('db:getExpenses', query),
  updateExpense: (id, data) => ipcRenderer.invoke('db:updateExpense', id, data),
  deleteExpense: (id) => ipcRenderer.invoke('db:deleteExpense', id),

  // Categories
  getCategories: () => ipcRenderer.invoke('db:getCategories'),
  addCustomCategory: (l1, l2) => ipcRenderer.invoke('db:addCustomCategory', l1, l2),

  // Stats
  getMonthlyStats: (year, month) => ipcRenderer.invoke('db:getMonthlyStats', year, month),
});
