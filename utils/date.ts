import type { Expense, Period, DayGroup } from '@/types';
import { dayHeader } from './format';

const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

export const periodDays = (p: Period): number => PERIOD_DAYS[p];

export const byPeriod = (expenses: Expense[], p: Period, ref: Date = new Date()): Expense[] => {
  const max = PERIOD_DAYS[p];
  const refMs = ref.getTime();
  return expenses.filter((e) => {
    const diffDays = (refMs - e.date.getTime()) / 86400000;
    return diffDays >= 0 && diffDays < max;
  });
};

export const byPrevPeriod = (expenses: Expense[], p: Period, ref: Date = new Date()): Expense[] => {
  const cur = PERIOD_DAYS[p];
  const prev = cur * 2;
  const refMs = ref.getTime();
  return expenses.filter((e) => {
    const diffDays = (refMs - e.date.getTime()) / 86400000;
    return diffDays >= cur && diffDays < prev;
  });
};

export const groupByDay = (expenses: Expense[], ref: Date = new Date()): DayGroup[] => {
  const sorted = [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime());
  const map = new Map<string, DayGroup>();
  for (const e of sorted) {
    const key = e.date.toDateString();
    let g = map.get(key);
    if (!g) {
      g = { label: dayHeader(e.date, ref), items: [], total: 0 };
      map.set(key, g);
    }
    g.items.push(e);
    g.total += e.amount;
  }
  return Array.from(map.values());
};
