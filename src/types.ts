// Type definitions matching the Rust data models

export interface Expense {
  id: string
  amount: number          // in fen (分), ¥12.50 = 1250
  category_l1: string
  category_l2: string
  date: string            // YYYY-MM-DD
  note: string
  created_at: string
  updated_at: string
}

export interface Category {
  l1: string
  l2: string[]
  is_default: boolean  // true = 系统内置分类（🔒不可动）, false = 用户添加（✏️可改可删）
}

export interface CategoryItem {
  l1: string
  l2: string
  is_default: boolean
}

export interface MonthlyStats {
  total: number              // in yuan (元)
  daily_average: number      // in yuan (元)
  top_category: string
  top_category_amount: number // top category spending in yuan (元)
  daily_spending: DailyAmount[]
}

export interface DailyAmount {
  date: string
  amount: number          // in yuan (元)
}

// Helper: convert fen to yuan string
export function fenToYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

// Helper: convert yuan string to fen
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}
