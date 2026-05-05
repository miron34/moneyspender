import type { Category } from '@/types';

// Default 10 categories that seed an empty database. The `description`
// field doubles as a hint for the voice/NLP parser — it's surfaced to
// YandexGPT inside the parse-expense Edge Function alongside the label.
// Users can edit these descriptions on the Profile screen, or leave the
// defaults intact.
//
// What goes in `description`: comma-separated synonyms, brand names,
// concrete examples — whatever helps the model match colloquial phrases
// to the right category. Examples below mirror what used to be hardcoded
// in the prompt (the prompt is now empty of taxonomy and reads from
// the request body instead — see docs/decisions.md 2026-05-04).
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    label: 'Еда',
    color: '#ff7043',
    icon: '🛒',
    description:
      'продукты, супермаркеты — Пятёрочка, Магнит, Перекрёсток, ВкусВилл, Лента, Ашан',
  },
  {
    id: 'cafe',
    label: 'Кафе',
    color: '#ffb300',
    icon: '☕',
    description:
      'кафе, рестораны, кофейни, шаурма, фастфуд, доставка готовой еды, бар как еда',
  },
  {
    id: 'trans',
    label: 'Транспорт',
    color: '#29b6f6',
    icon: '🚇',
    description:
      'такси, метро, автобус, бензин, парковка, каршеринг, самокат',
  },
  {
    id: 'shop',
    label: 'Покупки',
    color: '#26c6da',
    icon: '🛍️',
    description:
      'одежда, обувь, техника, бытовые покупки, маркетплейсы — Wildberries, Ozon, Яндекс.Маркет, AliExpress',
  },
  {
    id: 'housing',
    label: 'ЖКХ',
    color: '#ab47bc',
    icon: '💡',
    description:
      'ЖКХ, квартплата, интернет, мобильная связь, электричество, аренда квартиры',
  },
  {
    id: 'health',
    label: 'Здоровье',
    color: '#66bb6a',
    icon: '💊',
    description:
      'аптека, врачи, анализы, ДМС, стоматолог, очки, медицинские услуги',
  },
  {
    id: 'sport',
    label: 'Спорт',
    color: '#9ccc65',
    icon: '🏋️',
    description:
      'спортзал, абонемент, спортивный инвентарь, тренер, бассейн',
  },
  {
    id: 'entert',
    label: 'Развлечения',
    color: '#ec407a',
    icon: '🎮',
    description:
      'кино, концерты, игры, подписки на стриминг (Netflix, Кинопоиск), бары как развлечение',
  },
  {
    id: 'travel',
    label: 'Путешествия',
    color: '#42a5f5',
    icon: '✈️',
    description:
      'отели, авиабилеты, ж/д, туры, Booking, Airbnb, поездки',
  },
  {
    id: 'other',
    label: 'Другое',
    color: '#78909c',
    icon: '📌',
    description:
      'всё, что не подходит в другие категории — подарок, штраф, налог',
  },
];

// First 8 entries are the "compact" set shown by default in the icon
// picker — exactly one row at the typical sheet width. The rest are
// revealed when the user taps "Ещё иконки". Reordering affects what's
// visible by default; keep the most generally useful emojis in the
// first batch.
export const ICON_OPTIONS_COMPACT_COUNT = 8;

export const ICON_OPTIONS = [
  // --- compact (16) ---
  '🛒', '☕', '🚇', '🛍️', '💡', '💊', '🏋️', '🎮',
  '✈️', '📌', '🍔', '🎵', '📱', '🏠', '🐕', '🌿',
  // --- expanded (the rest) ---
  // Food
  '🍕', '🍣', '🥗', '🥘', '🍩', '🍰', '🍞', '🥖', '🍎', '🥕',
  // Drinks / cafe
  '🍺', '🍷', '🥤', '🍾', '🧃',
  // Transport
  '🚗', '🚕', '🚌', '🚲', '🛵', '🚆', '🛴', '⛽',
  // Shopping
  '👕', '👖', '👟', '👜', '💍', '⌚', '📦',
  // Home / household
  '🔌', '🛋️', '🛏️', '🧺',
  // Health
  '🏥', '🩺', '🦷', '💉', '🩹',
  // Sport / activity
  '⚽', '🏀', '🎾', '🏊', '🚴', '🧘', '🏆',
  // Entertainment
  '🎬', '🎤', '🎫', '🎲', '🎨', '🎭', '🎸',
  // Travel
  '🏖️', '🗺️', '🎒', '🏨', '🚢',
  // Work / education
  '💼', '💻', '📚', '✏️', '📊', '📋',
  // Pets / nature
  '🐈', '🪴', '❤️',
  // Money / misc
  '💰', '💳', '🪙', '🎁', '🧾',
];

// First 8 entries are one row's worth, shown by default. Tap "Ещё цвета"
// reveals the rest. Order is curated so the compact row covers
// distinguishable hues (warm/cool/neutral mix) instead of e.g. all
// reds.
export const COLOR_OPTIONS_COMPACT_COUNT = 8;

export const COLOR_OPTIONS = [
  // --- compact (8) ---
  '#ff7043', // coral / orange
  '#ffb300', // amber
  '#29b6f6', // light blue
  '#26c6da', // cyan
  '#ab47bc', // purple
  '#66bb6a', // green
  '#ec407a', // pink
  '#78909c', // blue-grey
  // --- expanded (more variety) ---
  '#9ccc65', // lime
  '#42a5f5', // blue
  '#ef5350', // red
  '#26a69a', // teal
  '#ffd54f', // yellow
  '#7e57c2', // deep purple
  '#ff8a65', // soft coral
  '#4dd0e1', // soft cyan
  '#a1887f', // brown
  '#5c6bc0', // indigo
  '#aed581', // light lime
  '#f06292', // light pink
  '#ffb74d', // light orange
  '#90a4ae', // grey
  '#bcaaa4', // taupe
  '#80deea', // sky
];

export const FALLBACK_CATEGORY: Category = {
  id: 'other',
  label: 'Другое',
  color: '#78909c',
  icon: '📌',
};

// Hard limits on user-created categories. The UI enforces MAX_CATEGORIES
// for "Add" button availability; the parse-expense Edge Function
// independently rejects requests with > MAX_CATEGORIES_SERVER entries
// to bound prompt size and prevent runaway billing.
export const MAX_CATEGORIES = 20;
export const MAX_CATEGORY_DESCRIPTION_LEN = 200;
