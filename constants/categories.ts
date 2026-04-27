import type { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', label: 'Еда', color: '#ff7043', icon: '🛒' },
  { id: 'cafe', label: 'Кафе', color: '#ffb300', icon: '☕' },
  { id: 'trans', label: 'Транспорт', color: '#29b6f6', icon: '🚇' },
  { id: 'shop', label: 'Покупки', color: '#26c6da', icon: '🛍️' },
  { id: 'housing', label: 'ЖКХ', color: '#ab47bc', icon: '💡' },
  { id: 'health', label: 'Здоровье', color: '#66bb6a', icon: '💊' },
  { id: 'sport', label: 'Спорт', color: '#9ccc65', icon: '🏋️' },
  { id: 'entert', label: 'Развлечения', color: '#ec407a', icon: '🎮' },
  { id: 'travel', label: 'Путешествия', color: '#42a5f5', icon: '✈️' },
  { id: 'other', label: 'Другое', color: '#78909c', icon: '📌' },
];

export const ICON_OPTIONS = [
  '🛒', '☕', '🚇', '🛍️', '💡', '💊', '🏋️', '🎮', '✈️', '📌',
  '🍔', '🎵', '📱', '🏠', '🐕', '🌿', '🎨', '📚', '💼', '🏥',
];

export const COLOR_OPTIONS = [
  '#ff7043', '#ffb300', '#29b6f6', '#26c6da',
  '#ab47bc', '#66bb6a', '#9ccc65', '#ec407a',
  '#42a5f5', '#78909c', '#ef5350', '#26a69a',
];

export const FALLBACK_CATEGORY: Category = {
  id: 'other',
  label: 'Другое',
  color: '#78909c',
  icon: '📌',
};
