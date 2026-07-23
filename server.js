// 暮暮记账本 — Local Web Server
const express = require('express');
const path = require('path');
const db = require('./electron/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request body
app.use(express.json());

// Serve static frontend files (from Vite build or dev server)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ====== REST API ======

// Add expense
app.post('/api/addExpense', (req, res) => {
  try {
    const expense = db.addExpense(req.body);
    res.json(expense);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get expenses
app.get('/api/getExpenses', (req, res) => {
  try {
    const { page, pageSize, dateFrom, dateTo, catL1 } = req.query;
    const expenses = db.getExpenses({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
      dateFrom,
      dateTo,
      catL1,
    });
    res.json(expenses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update expense
app.put('/api/updateExpense/:id', (req, res) => {
  try {
    db.updateExpense(req.params.id, req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete expense
app.delete('/api/deleteExpense/:id', (req, res) => {
  try {
    db.deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get categories
app.get('/api/getCategories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add custom category
app.post('/api/addCustomCategory', (req, res) => {
  try {
    const result = db.addCustomCategory(req.body.l1, req.body.l2);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete category (user-added only)
app.delete('/api/deleteCategory', (req, res) => {
  try {
    const result = db.deleteCategory(req.body.l1, req.body.l2);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete entire L1 category (user-added only, or clear user L2s under built-in L1)
app.delete('/api/deleteL1Category', (req, res) => {
  try {
    const result = db.deleteL1Category(req.body.l1);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rename category (user-added only)
app.put('/api/renameCategory', (req, res) => {
  try {
    const result = db.renameCategory(req.body.l1, req.body.l2, req.body.newName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get expenses by exact date
app.get('/api/getExpensesByDate', (req, res) => {
  try {
    const { date } = req.query;
    const expenses = db.getExpensesByDate(date);
    res.json(expenses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get monthly stats
app.get('/api/getMonthlyStats', (req, res) => {
  try {
    const { year, month } = req.query;
    const stats = db.getMonthlyStats(parseInt(year), parseInt(month));
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize database then start server
const userDataPath = path.join(__dirname, 'data');
const { app: electronApp } = { app: { getPath: () => userDataPath } };

// Monkey-patch the database module to use our data directory
// Since database.js expects an Electron app object, we adapt it
async function start() {
  try {
    // Create data directory if needed
    const fs = require('fs');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // The database uses sql.js which is async init
    // database.js expects initDatabase(app) where app.getPath('userData') gives the data dir
    // We provide a compatible app-like object
    await db.initDatabase({ getPath: () => userDataPath });

    app.listen(PORT, () => {
      console.log('');
      console.log('  📒 暮暮记账本 已启动！');
      console.log(`  🌐 打开浏览器访问: http://localhost:${PORT}`);
      console.log('');
      console.log('  按 Ctrl+C 停止服务器');
      console.log('');
    });
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
}

start();
