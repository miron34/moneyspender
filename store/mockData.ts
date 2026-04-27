import type { Expense } from '@/types';

const ago = (daysBack: number, h: number, m: number, ref: Date = new Date()): Date => {
  const d = new Date(ref);
  d.setDate(d.getDate() - daysBack);
  d.setHours(h, m, 0, 0);
  return d;
};

export const buildMockExpenses = (ref: Date = new Date()): Expense[] => [
  { id: 1, cat: 'food', name: 'Пятёрочка', amount: 1840, date: ago(0, 10, 30, ref) },
  { id: 2, cat: 'cafe', name: 'Surf Coffee', amount: 420, date: ago(0, 9, 15, ref) },
  { id: 3, cat: 'trans', name: 'Метро', amount: 66, date: ago(0, 8, 45, ref) },
  { id: 4, cat: 'health', name: 'Аптека', amount: 980, date: ago(1, 18, 0, ref) },
  { id: 5, cat: 'entert', name: 'Кинотеатр', amount: 750, date: ago(1, 20, 30, ref) },
  { id: 6, cat: 'food', name: 'ВкусВилл', amount: 2100, date: ago(2, 12, 0, ref) },
  { id: 7, cat: 'shop', name: 'Wildberries', amount: 3600, date: ago(3, 15, 20, ref) },
  { id: 8, cat: 'housing', name: 'Электроэнергия', amount: 1200, date: ago(5, 9, 0, ref) },
  { id: 9, cat: 'cafe', name: 'Burger King', amount: 560, date: ago(5, 13, 30, ref) },
  { id: 10, cat: 'trans', name: 'Яндекс Такси', amount: 380, date: ago(6, 22, 15, ref) },
  { id: 11, cat: 'sport', name: 'Спортзал', amount: 2500, date: ago(7, 8, 0, ref) },
  { id: 12, cat: 'food', name: 'Лента', amount: 1620, date: ago(8, 17, 45, ref) },
  { id: 13, cat: 'entert', name: 'Spotify', amount: 299, date: ago(10, 0, 0, ref) },
  { id: 14, cat: 'shop', name: 'DNS', amount: 5400, date: ago(12, 14, 0, ref) },
  { id: 15, cat: 'housing', name: 'Интернет', amount: 650, date: ago(14, 9, 0, ref) },
  { id: 16, cat: 'cafe', name: 'Starbucks', amount: 390, date: ago(15, 16, 0, ref) },
  { id: 17, cat: 'trans', name: 'АЗС', amount: 2800, date: ago(18, 11, 0, ref) },
  { id: 18, cat: 'health', name: 'Врач', amount: 1500, date: ago(20, 10, 0, ref) },
  { id: 19, cat: 'food', name: 'Самокат', amount: 870, date: ago(22, 19, 30, ref) },
  { id: 20, cat: 'travel', name: 'Aviasales', amount: 8400, date: ago(24, 11, 0, ref) },
  { id: 21, cat: 'food', name: 'Магнит', amount: 1560, date: ago(31, 11, 0, ref) },
  { id: 22, cat: 'cafe', name: 'Costa Coffee', amount: 480, date: ago(32, 9, 0, ref) },
  { id: 23, cat: 'trans', name: 'Метро', amount: 132, date: ago(33, 8, 0, ref) },
  { id: 24, cat: 'shop', name: 'Ozon', amount: 4200, date: ago(35, 14, 0, ref) },
  { id: 25, cat: 'housing', name: 'Газ', amount: 890, date: ago(36, 9, 0, ref) },
  { id: 26, cat: 'health', name: 'Аптека', amount: 740, date: ago(38, 12, 0, ref) },
  { id: 27, cat: 'entert', name: 'Театр', amount: 1200, date: ago(40, 19, 0, ref) },
  { id: 28, cat: 'food', name: 'ВкусВилл', amount: 1980, date: ago(42, 17, 0, ref) },
  { id: 29, cat: 'sport', name: 'Спортзал', amount: 2500, date: ago(45, 8, 0, ref) },
  { id: 30, cat: 'trans', name: 'Такси', amount: 620, date: ago(48, 22, 0, ref) },
  { id: 31, cat: 'shop', name: 'Adidas', amount: 6800, date: ago(55, 13, 0, ref) },
];
