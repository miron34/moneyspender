const NBSP = ' ';

export const fmt = (n: number): string => {
  return Math.round(n).toLocaleString('ru-RU') + NBSP + '₽';
};

export const fmtK = (n: number): string => {
  if (n >= 1000) {
    const k = (n / 1000).toFixed(1).replace('.0', '');
    return k + 'к';
  }
  return String(Math.round(n));
};

export const hhmm = (d: Date): string => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const daysAgo = (d: Date, ref: Date = new Date()): number => {
  const a = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((a - b) / 86400000);
};

export const fmtLabel = (d: Date, ref: Date = new Date()): string => {
  const diff = daysAgo(d, ref);
  if (diff === 0) return `Сегодня, ${hhmm(d)}`;
  if (diff === 1) return `Вчера, ${hhmm(d)}`;
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${date}, ${hhmm(d)}`;
};

export const dayHeader = (d: Date, ref: Date = new Date()): string => {
  const diff = daysAgo(d, ref);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

export const fmtDatePill = (d: Date): string => {
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${date} ${hhmm(d)}`;
};
