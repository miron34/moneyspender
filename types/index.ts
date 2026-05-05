export interface Expense {
  id: number;
  cat: string;
  name: string;
  amount: number;
  date: Date;
}

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
  /**
   * Optional free-form hint for the voice/NLP parser — e.g. for a custom
   * "Образование" category, description "учебники, курсы, книги" lets the
   * model match phrases like "купил учебник 500" to this category. Empty
   * means the model relies only on `label`. Max 200 chars (enforced in
   * CategoryEditSheet UI).
   *
   * Surfaced to YandexGPT inside the parse-expense Edge Function alongside
   * the label. See docs/voice-input.md.
   */
  description?: string;
}

export type Period = 'day' | 'week' | 'month' | 'quarter';

export interface CategoryStat {
  id: string;
  total: number;
}

export interface DayGroup {
  label: string;
  items: Expense[];
  total: number;
}

// Voice/NLP types — re-exported so callers can `import type { ParsedExpense }
// from '@/types'` consistently with the other domain types.
export type { ExpenseCat, ParsedExpense } from './voice';
