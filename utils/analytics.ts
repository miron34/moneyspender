import type { Expense, CategoryStat } from '@/types';

export const catStats = (expenses: Expense[]): CategoryStat[] => {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.cat, (map.get(e.cat) || 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([id, total]) => ({ id, total }))
    .sort((a, b) => b.total - a.total);
};

export const sumAmount = (expenses: Expense[]): number => {
  return expenses.reduce((s, e) => s + e.amount, 0);
};

export const topN = (expenses: Expense[], n: number): Expense[] => {
  return [...expenses].sort((a, b) => b.amount - a.amount).slice(0, n);
};

export interface ComparisonStats {
  current: number;
  previous: number;
  deltaPct: number;
  deltaAmount: number;
}

export const comparePeriods = (current: Expense[], previous: Expense[]): ComparisonStats => {
  const c = sumAmount(current);
  const p = sumAmount(previous);
  const deltaPct = p > 0 ? Math.round(((c - p) / p) * 100) : 0;
  return { current: c, previous: p, deltaPct, deltaAmount: c - p };
};
