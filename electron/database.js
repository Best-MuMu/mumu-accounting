// Database layer using sql.js (pure JS SQLite, no native compilation)
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let db = null;
let dbPath = '';

// Default categories
const DEFAULT_CATEGORIES = [
  { l1: '餐饮', l2: ['早餐', '午餐', '晚餐', '零食', '水果', '饮品', '聚餐'] },
  { l1: '交通', l2: ['公交', '地铁', '打车', '火车', '飞机', '加油', '停车'] },
  { l1: '购物', l2: ['服饰', '电子', '日用品', '化妆品', '书籍'] },
  { l1: '居住', l2: ['房租', '水电', '物业', '维修', '家居'] },
  { l1: '娱乐', l2: ['电影', '游戏', '运动', '旅游', '聚会'] },
  { l1: '医疗', l2: ['门诊', '药品', '体检', '牙科'] },
  { l1: '教育', l2: ['学费', '书籍', '培训', '考试'] },
  { l1: '通讯', l2: ['话费', '网费', '快递'] },
  { l1: '人情', l2: ['红包', '礼物', '捐款', '结婚'] },
  { l1: '其他', l2: ['理财', '宠物', '育儿', '自定义'] },
];

function getDbPath(app) {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'mumu_accounting.db');
}

async function initDatabase(app) {
  dbPath = getDbPath(app);
  const SQL = await initSqlJs();

  // Try to load existing database, or create a new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      l1 TEXT NOT NULL,
      l2 TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_expenses_category_l1 ON expenses(category_l1)');

  // Insert default categories if empty
  const count = db.exec('SELECT COUNT(*) as cnt FROM categories');
  const catCount = count.length > 0 ? count[0].values[0][0] : 0;

  if (catCount === 0) {
    const stmt = db.prepare('INSERT INTO categories (l1, l2, is_default) VALUES (?, ?, 1)');
    for (const cat of DEFAULT_CATEGORIES) {
      for (const l2 of cat.l2) {
        stmt.run([cat.l1, l2]);
      }
    }
    stmt.free();
    saveToDisk();
  }
}

function saveToDisk() {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

function closeDatabase() {
  if (db) {
    saveToDisk();
    db.close();
    db = null;
  }
}

// ---- CRUD Operations ----

function addExpense({ amount, category_l1, category_l2, date, note }) {
  const id = require('uuid').v4();
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO expenses (id, amount, category_l1, category_l2, date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, amount, category_l1, category_l2, date, note || '', now, now]
  );
  saveToDisk();

  return { id, amount, category_l1, category_l2, date, note: note || '', created_at: now, updated_at: now };
}

function getExpenses({ page = 1, pageSize = 20, dateFrom, dateTo, catL1 } = {}) {
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (dateFrom) {
    sql += ' AND date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND date <= ?';
    params.push(dateTo);
  }
  if (catL1) {
    sql += ' AND category_l1 = ?';
    params.push(catL1);
  }

  sql += ' ORDER BY date DESC, created_at DESC';
  sql += ' LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const result = db.exec(sql, params);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function updateExpense(id, { amount, category_l1, category_l2, date, note }) {
  const now = new Date().toISOString();
  db.run(
    'UPDATE expenses SET amount=?, category_l1=?, category_l2=?, date=?, note=?, updated_at=? WHERE id=?',
    [amount, category_l1, category_l2, date, note || '', now, id]
  );
  saveToDisk();
}

function deleteExpense(id) {
  db.run('DELETE FROM expenses WHERE id=?', [id]);
  saveToDisk();
}

function getCategories() {
  const result = db.exec('SELECT l1, l2 FROM categories ORDER BY id');
  if (result.length === 0) return [];

  const rows = result[0].values;
  const categories = [];
  let currentL1 = null;

  for (const row of rows) {
    const l1 = row[0];
    const l2 = row[1];
    if (l1 !== currentL1) {
      categories.push({ l1, l2: [l2] });
      currentL1 = l1;
    } else {
      categories[categories.length - 1].l2.push(l2);
    }
  }
  return categories;
}

function addCustomCategory(l1, l2) {
  // Check if exists
  const exists = db.exec('SELECT COUNT(*) as cnt FROM categories WHERE l1=? AND l2=?', [l1, l2]);
  if (exists.length > 0 && exists[0].values[0][0] > 0) {
    return { error: '该分类已存在' };
  }

  db.run('INSERT INTO categories (l1, l2, is_default) VALUES (?, ?, 0)', [l1, l2]);
  saveToDisk();
  return { success: true };
}

function getMonthlyStats(year, month) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  let monthEnd;
  if (month === 12) {
    monthEnd = `${year + 1}-01-01`;
  } else {
    monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  }

  // Total spending
  const totalResult = db.exec(
    'SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date < ?',
    [monthStart, monthEnd]
  );
  const totalFen = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;
  const total = totalFen / 100;

  // Daily average
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = (now.getFullYear() === year && now.getMonth() + 1 === month)
    ? now.getDate()
    : daysInMonth;
  const dailyAverage = daysElapsed > 0 ? total / daysElapsed : 0;

  // Top category
  const topResult = db.exec(
    'SELECT category_l1 FROM expenses WHERE date >= ? AND date < ? GROUP BY category_l1 ORDER BY SUM(amount) DESC LIMIT 1',
    [monthStart, monthEnd]
  );
  const topCategory = topResult.length > 0 && topResult[0].values.length > 0
    ? topResult[0].values[0][0]
    : '暂无';

  // Daily spending for last 30 days
  const today = now.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const dailyResult = db.exec(
    'SELECT date, SUM(amount) FROM expenses WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date',
    [thirtyDaysAgo, today]
  );

  const dailySpending = dailyResult.length > 0
    ? dailyResult[0].values.map(row => ({ date: row[0], amount: row[1] / 100 }))
    : [];

  return { total, daily_average: dailyAverage, top_category: topCategory, daily_spending: dailySpending };
}

module.exports = {
  initDatabase,
  closeDatabase,
  saveToDisk,
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getCategories,
  addCustomCategory,
  getMonthlyStats,
};
