// API wrapper — talks to the local Express server via HTTP
import type { Expense, Category, MonthlyStats } from './types';

const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Expenses
  addExpense: (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) =>
    request<Expense>('/api/addExpense', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getExpenses: (query?: {
    page?: number; pageSize?: number;
    dateFrom?: string; dateTo?: string; catL1?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));
    if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query?.dateTo) params.set('dateTo', query.dateTo);
    if (query?.catL1) params.set('catL1', query.catL1);
    const qs = params.toString();
    return request<Expense[]>(`/api/getExpenses${qs ? '?' + qs : ''}`);
  },

  updateExpense: (id: string, data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) =>
    request<void>(`/api/updateExpense/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteExpense: (id: string) =>
    request<void>(`/api/deleteExpense/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Categories
  getCategories: () =>
    request<Category[]>('/api/getCategories'),

  addCustomCategory: (l1: string, l2: string) =>
    request<{ error?: string; success?: boolean }>('/api/addCustomCategory', {
      method: 'POST',
      body: JSON.stringify({ l1, l2 }),
    }),

  deleteCategory: (l1: string, l2: string) =>
    request<{ error?: string; success?: boolean }>('/api/deleteCategory', {
      method: 'DELETE',
      body: JSON.stringify({ l1, l2 }),
    }),

  deleteL1Category: (l1: string) =>
    request<{ error?: string; success?: boolean; message?: string }>('/api/deleteL1Category', {
      method: 'DELETE',
      body: JSON.stringify({ l1 }),
    }),

  renameCategory: (l1: string, l2: string, newName: string) =>
    request<{ error?: string; success?: boolean }>('/api/renameCategory', {
      method: 'PUT',
      body: JSON.stringify({ l1, l2, newName }),
    }),

  // Stats
  getMonthlyStats: (year: number, month: number) =>
    request<MonthlyStats>(`/api/getMonthlyStats?year=${year}&month=${month}`),

  getExpensesByDate: (date: string) =>
    request<Expense[]>(`/api/getExpensesByDate?date=${encodeURIComponent(date)}`),
};
