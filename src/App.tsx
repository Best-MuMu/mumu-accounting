import { useState, useEffect } from 'react'
import type { Expense, Category, MonthlyStats } from './types'
import { fenToYuan } from './types'
import { api } from './api'
import './App.css'

type Tab = 'add' | 'list' | 'categories' | 'stats'

function App() {
  const [tab, setTab] = useState<Tab>('add')
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<MonthlyStats | null>(null)

  // Add expense form state
  const [amount, setAmount] = useState('')
  const [selectedL1, setSelectedL1] = useState('餐饮')
  const [selectedL2, setSelectedL2] = useState('午餐')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  // List filter state
  const [filterL1, setFilterL1] = useState('全部')
  const [listPage, setListPage] = useState(1)

  // Custom category modal (add)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatL1, setNewCatL1] = useState('')
  const [newCatL2, setNewCatL2] = useState('')

  // Category editing state
  const [editingCat, setEditingCat] = useState<{ l1: string; l2: string } | null>(null)
  const [editNewName, setEditNewName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ l1: string; l2: string } | null>(null)
  const [deleteL1Confirm, setDeleteL1Confirm] = useState<string | null>(null)  // L1 name to delete

  // Load initial data
  useEffect(() => {
    loadCategories()
    loadExpenses()
    loadStats()
  }, [])

  function loadCategories() {
    api.getCategories().then(setCategories).catch(console.error)
  }

  function loadExpenses(page = 1, l1?: string) {
    const query: any = { page, pageSize: 50 }
    if (l1 && l1 !== '全部') query.catL1 = l1
    api.getExpenses(query).then(setExpenses).catch(console.error)
  }

  function loadStats() {
    const now = new Date()
    api.getMonthlyStats(now.getFullYear(), now.getMonth() + 1)
      .then(setStats)
      .catch(console.error)
  }

  // When L1 changes, reset L2 to first in list
  useEffect(() => {
    const cat = categories.find(c => c.l1 === selectedL1)
    if (cat && cat.l2.length > 0 && !cat.l2.includes(selectedL2)) {
      setSelectedL2(cat.l2[0])
    }
  }, [selectedL1, categories])

  // Add expense
  async function handleAddExpense() {
    const amountFen = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountFen) || amountFen <= 0) return

    try {
      await api.addExpense({
        amount: amountFen,
        category_l1: selectedL1,
        category_l2: selectedL2,
        date,
        note: note.trim(),
      })
      // Reset form
      setAmount('')
      setNote('')
      setDate(new Date().toISOString().split('T')[0])
      // Refresh
      loadExpenses(listPage, filterL1)
      loadStats()
      // Switch to list to confirm
      setTab('list')
    } catch (e) {
      console.error(e)
    }
  }

  // Delete expense
  async function handleDeleteExpense(id: string) {
    try {
      await api.deleteExpense(id)
      loadExpenses(listPage, filterL1)
      loadStats()
    } catch (e) {
      console.error(e)
    }
  }

  // Add custom category
  async function handleAddCustomCat() {
    if (!newCatL1.trim()) return
    // L2 can be empty — creates an empty L1 category
    const result = await api.addCustomCategory(newCatL1.trim(), newCatL2.trim())
    if (result.error) {
      alert(result.error)
    } else {
      setShowAddCat(false)
      setNewCatL1('')
      setNewCatL2('')
      loadCategories()
    }
  }

  // Delete category
  async function handleDeleteCategory(l1: string, l2: string) {
    const result = await api.deleteCategory(l1, l2)
    if (result.error) {
      alert(result.error)
    } else {
      setDeleteConfirm(null)
      loadCategories()
    }
  }

  // Delete entire L1 category
  async function handleDeleteL1Category(l1: string) {
    const result = await api.deleteL1Category(l1)
    if (result.error) {
      alert(result.error)
    } else {
      setDeleteL1Confirm(null)
      loadCategories()
    }
  }

  // Rename category
  async function handleRenameCategory() {
    if (!editingCat || !editNewName.trim()) return
    const result = await api.renameCategory(editingCat.l1, editingCat.l2, editNewName.trim())
    if (result.error) {
      alert(result.error)
    } else {
      setEditingCat(null)
      setEditNewName('')
      loadCategories()
    }
  }

  // Filter expenses
  function handleFilterChange(l1: string) {
    setFilterL1(l1)
    setListPage(1)
    loadExpenses(1, l1)
  }

  // Today's date string
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>暮暮记账本</h1>
        <span className="header-subtitle">每一笔，都算数</span>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Tab: Add Expense */}
        {tab === 'add' && (
          <div className="tab-content add-expense">
            <div className="card">
              <div className="amount-input-group">
                <span className="currency-symbol">¥</span>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>

              <div className="form-row">
                <label className="form-label">分类</label>
                <div className="category-select-row">
                  <select
                    className="select-l1"
                    value={selectedL1}
                    onChange={e => setSelectedL1(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat.l1} value={cat.l1}>{cat.l1}</option>
                    ))}
                  </select>
                  <select
                    className="select-l2"
                    value={selectedL2}
                    onChange={e => setSelectedL2(e.target.value)}
                  >
                    {categories
                      .find(c => c.l1 === selectedL1)
                      ?.l2.map(l2 => (
                        <option key={l2} value={l2}>{l2}</option>
                      ))}
                  </select>
                  <button
                    className="btn-add-cat"
                    onClick={() => {
                      setNewCatL1(selectedL1)
                      setNewCatL2('')
                      setShowAddCat(true)
                    }}
                    title="添加自定义分类"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">日期</label>
                <input
                  type="date"
                  className="date-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  max={todayStr}
                />
              </div>

              <div className="form-row">
                <label className="form-label">备注</label>
                <input
                  type="text"
                  className="note-input"
                  placeholder="可选，记录一些备注…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={200}
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleAddExpense}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                记一笔
              </button>
            </div>
          </div>
        )}

        {/* Tab: Expense List */}
        {tab === 'list' && (
          <div className="tab-content expense-list">
            <div className="filter-bar">
              {['全部', ...new Set(categories.map(c => c.l1))].map(l1 => (
                <button
                  key={l1}
                  className={`filter-chip ${filterL1 === l1 ? 'active' : ''}`}
                  onClick={() => handleFilterChange(l1)}
                >
                  {l1}
                </button>
              ))}
            </div>

            {expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>还没有记录</p>
                <p className="empty-hint">去「记账」页添加第一笔支出吧</p>
                <button className="btn-secondary" onClick={() => setTab('add')}>
                  去记账
                </button>
              </div>
            ) : (
              <div className="expense-items">
                {expenses.map(exp => (
                  <div key={exp.id} className="expense-item">
                    <div className="expense-left">
                      <span className="expense-cat">{exp.category_l2}</span>
                      <span className="expense-l1">{exp.category_l1}</span>
                      {exp.note && <span className="expense-note">{exp.note}</span>}
                    </div>
                    <div className="expense-right">
                      <span className="expense-amount">-¥{fenToYuan(exp.amount)}</span>
                      <span className="expense-date">{exp.date}</span>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteExpense(exp.id)}
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Categories */}
        {tab === 'categories' && (
          <div className="tab-content categories-view">
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 17, color: '#451A03' }}>分类管理</h3>
              <p style={{ fontSize: 13, color: '#A8A29E', marginBottom: 16 }}>
                🔒 = 系统内置（不可修改）&nbsp;&nbsp;✏️ = 可编辑/删除
              </p>

              {categories.map(cat => {
                // Convert l2 array to items with is_default info
                // Since the API doesn't return per-item is_default for all items,
                // we treat the whole L1 group based on the group-level is_default
                const items = cat.l2.map(name => ({
                  name,
                  isDefault: cat.is_default,
                }))

                return (
                  <div key={cat.l1} className="category-group">
                    <div className="category-l1-header">
                      <span className="category-l1-name">
                        {cat.is_default ? '🔒 ' : '✏️ '}
                        {cat.l1}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn-add-l2"
                          onClick={() => {
                            setNewCatL1(cat.l1)
                            setNewCatL2('')
                            setShowAddCat(true)
                          }}
                          title={`在「${cat.l1}」下添加小类`}
                        >
                          + 小类
                        </button>
                        {!cat.is_default && (
                          <button
                            className="btn-delete-l1"
                            onClick={() => setDeleteL1Confirm(cat.l1)}
                            title={`删除整个「${cat.l1}」分类`}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="category-l2-list">
                      {items.map(item => (
                        <div key={item.name} className="category-l2-item">
                          {item.isDefault ? (
                            <span className="cat-lock-icon" title="系统内置，不可修改">🔒</span>
                          ) : (
                            <span className="cat-lock-icon" title="用户添加，可编辑">✏️</span>
                          )}
                          <span className="category-l2-name">{item.name}</span>
                          {!item.isDefault && (
                            <div className="cat-actions">
                              <button
                                className="btn-cat-edit"
                                onClick={() => {
                                  setEditingCat({ l1: cat.l1, l2: item.name })
                                  setEditNewName(item.name)
                                }}
                                title="修改名称"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-cat-delete"
                                onClick={() => setDeleteConfirm({ l1: cat.l1, l2: item.name })}
                                title="删除"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Add new L1 category at bottom */}
              <button
                className="btn-add-l1"
                onClick={() => {
                  setNewCatL1('')
                  setNewCatL2('')
                  setShowAddCat(true)
                }}
              >
                + 新建一级分类
              </button>
            </div>
          </div>
        )}

        {/* Tab: Stats */}
        {tab === 'stats' && (
          <div className="tab-content stats-view">
            {stats ? (
              <>
                <div className="stats-cards">
                  <div className="stat-card">
                    <span className="stat-value">¥{stats.total.toFixed(2)}</span>
                    <span className="stat-label">本月总支出</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">¥{stats.daily_average.toFixed(2)}</span>
                    <span className="stat-label">日均支出</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{stats.top_category}</span>
                    <span className="stat-label">支出最多 · ¥{stats.top_category_amount.toFixed(2)}</span>
                  </div>
                </div>

                {stats.daily_spending.length > 0 && (
                  <div className="chart-container card">
                    <h3>近30天每日支出</h3>
                    <div className="bar-chart">
                      {stats.daily_spending.map((day, i) => {
                        const maxAmount = Math.max(...stats.daily_spending.map(d => d.amount), 1)
                        const height = (day.amount / maxAmount) * 120
                        return (
                          <div key={i} className="bar-col">
                            <div className="bar-wrapper">
                              <div
                                className="bar"
                                style={{ height: `${Math.max(height, 1)}px` }}
                              />
                            </div>
                            <span className="bar-label">
                              {day.date.slice(5)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p>加载中…</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="tab-bar">
        <button
          className={`tab-btn ${tab === 'add' ? 'active' : ''}`}
          onClick={() => { setTab('add'); loadCategories() }}
        >
          <span className="tab-icon">✏️</span>
          <span className="tab-label">记账</span>
        </button>
        <button
          className={`tab-btn ${tab === 'list' ? 'active' : ''}`}
          onClick={() => { setTab('list'); loadExpenses(listPage, filterL1) }}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">明细</span>
        </button>
        <button
          className={`tab-btn ${tab === 'categories' ? 'active' : ''}`}
          onClick={() => { setTab('categories'); loadCategories() }}
        >
          <span className="tab-icon">📂</span>
          <span className="tab-label">分类</span>
        </button>
        <button
          className={`tab-btn ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => { setTab('stats'); loadStats() }}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-label">统计</span>
        </button>
      </nav>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p style={{ marginBottom: 16, color: '#92400E' }}>
              确定要删除分类「<strong>{deleteConfirm.l2}</strong>」吗？
            </p>
            <p style={{ fontSize: 12, color: '#A8A29E', marginBottom: 16 }}>
              已有记账记录的分类名不会被清除，只是不再作为选项出现。
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button
                className="btn-primary"
                style={{ background: '#EF4444' }}
                onClick={() => handleDeleteCategory(deleteConfirm.l1, deleteConfirm.l2)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete L1 Category Modal */}
      {deleteL1Confirm && (
        <div className="modal-overlay" onClick={() => setDeleteL1Confirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p style={{ marginBottom: 16, color: '#92400E' }}>
              确定要删除整个「<strong>{deleteL1Confirm}</strong>」分类及其所有小类吗？
            </p>
            <p style={{ fontSize: 12, color: '#A8A29E', marginBottom: 16 }}>
              此操作不可撤销。已有记账记录中的分类名不会被清除。
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteL1Confirm(null)}>取消</button>
              <button
                className="btn-primary"
                style={{ background: '#EF4444' }}
                onClick={() => handleDeleteL1Category(deleteL1Confirm)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Category Modal */}
      {editingCat && (
        <div className="modal-overlay" onClick={() => setEditingCat(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>修改分类名称</h3>
            <div className="form-row">
              <label>当前名称</label>
              <p style={{ color: '#451A03', fontSize: 15, marginBottom: 12 }}>
                {editingCat.l1} / {editingCat.l2}
              </p>
            </div>
            <div className="form-row">
              <label>新名称</label>
              <input
                type="text"
                value={editNewName}
                onChange={e => setEditNewName(e.target.value)}
                placeholder="输入新名称"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingCat(null)}>取消</button>
              <button className="btn-primary" onClick={handleRenameCategory}>确认修改</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Category Modal */}
      {showAddCat && (
        <div className="modal-overlay" onClick={() => setShowAddCat(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>添加自定义分类</h3>
            <div className="form-row">
              <label>一级分类</label>
              <input
                type="text"
                value={newCatL1}
                onChange={e => setNewCatL1(e.target.value)}
                placeholder="如：餐饮"
              />
            </div>
            <div className="form-row">
              <label>二级分类（可选）</label>
              <input
                type="text"
                value={newCatL2}
                onChange={e => setNewCatL2(e.target.value)}
                placeholder="留空则只创建一级分类"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddCat(false)}>取消</button>
              <button className="btn-primary" onClick={handleAddCustomCat}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
