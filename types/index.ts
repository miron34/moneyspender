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
